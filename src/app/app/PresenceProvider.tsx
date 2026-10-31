"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "../../../utils/supabase/client";

type PresenceContextValue = {
  isOnline: (userId: string) => boolean;
  isReady: boolean;
};

const PresenceContext = createContext<PresenceContextValue>({
  isOnline: () => false,
  isReady: false,
});

export function OnlinePresenceProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    let currentUserId = "";
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let heartbeat: number | null = null;

    function stopHeartbeat() {
      if (heartbeat !== null) {
        window.clearInterval(heartbeat);
        heartbeat = null;
      }
    }

    async function saveLastSeen(userId: string) {
      const { error } = await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        console.error("Could not update last seen:", error);
      }
    }

    async function setCurrentUser(userId: string) {
      if (!active || userId === currentUserId) return;
      if (currentUserId) {
        stopHeartbeat();
        void saveLastSeen(currentUserId);
      }
      currentUserId = userId;
      setOnlineUserIds(new Set());
      setIsReady(false);

      if (presenceChannel) {
        const oldChannel = presenceChannel;
        presenceChannel = null;
        await supabase.removeChannel(oldChannel);
      }

      if (!userId || !active) return;

      const channel = supabase
        .channel("vybe-online-presence", {
          config: { presence: { key: userId } },
        })
        .on("presence", { event: "sync" }, () => {
          if (!active) return;
          setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
          setIsReady(true);
        })
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            void channel.track({ user_id: userId });
            void saveLastSeen(userId);
            stopHeartbeat();
            heartbeat = window.setInterval(() => {
              void saveLastSeen(userId);
            }, 60_000);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            stopHeartbeat();
            setOnlineUserIds(new Set());
            setIsReady(false);
          }
        });

      presenceChannel = channel;
    }

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("Could not start online status:", error);
        return;
      }
      void setCurrentUser(data.user?.id ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void setCurrentUser(session?.user.id ?? "");
    });

    return () => {
      active = false;
      stopHeartbeat();
      subscription.unsubscribe();
      if (presenceChannel) {
        void supabase.removeChannel(presenceChannel);
      }
    };
  }, [supabase]);

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  );
  const value = useMemo(() => ({ isOnline, isReady }), [isOnline, isReady]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function useOnlinePresence() {
  return useContext(PresenceContext);
}
