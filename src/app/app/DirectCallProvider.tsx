"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { useDirectCall, type DirectCall } from "./messages/useDirectCall";

type DirectCallContextValue = {
  call: DirectCall | null;
  callError: string;
  remoteStream: MediaStream | null;
  muted: boolean;
  toggleMute: () => void;
  startCall: (peerId: string, peerName: string) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: (kind?: "end" | "decline") => Promise<void>;
};

const DirectCallContext = createContext<DirectCallContextValue | null>(null);

export function DirectCallProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [speakerOn, setSpeakerOn] = useState(true);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callNotificationRef = useRef<Notification | null>(null);
  const callState = useDirectCall(supabase, userId);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error("Could not load call identity:", error);
      if (active) setUserId(data.user?.id ?? "");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? "");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = callState.remoteStream;
    audio.muted = !speakerOn;
    if (callState.remoteStream) void audio.play().catch(() => undefined);
  }, [callState.remoteStream, speakerOn]);

  useEffect(() => {
    if (callState.call?.status !== "incoming" || typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
    const notification = new Notification(`${callState.call.peerName} is calling`, {
      body: "Open VYBE to answer the call.",
      tag: `vybe-call-${callState.call.callId}`,
      icon: "/favicon.ico",
      requireInteraction: true,
    });
    callNotificationRef.current = notification;
    notification.onclick = () => {
      window.focus();
      router.push(`/app/messages?user=${encodeURIComponent(callState.call!.peerId)}`);
      notification.close();
    };
    return () => {
      notification.close();
      if (callNotificationRef.current === notification) callNotificationRef.current = null;
    };
  }, [callState.call, router]);

  const value: DirectCallContextValue = {
    call: callState.call,
    callError: callState.callError,
    remoteStream: callState.remoteStream,
    muted: callState.muted,
    toggleMute: callState.toggleMute,
    startCall: callState.startCall,
    answerCall: callState.answerCall,
    endCall: callState.endCall,
  };

  return (
    <DirectCallContext.Provider value={value}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" aria-label="Voice call audio" />
      {callState.call && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={callState.call.status === "incoming" ? "Incoming voice call" : callState.call.status === "active" ? "Voice call in progress" : "Voice call"}>
          <section className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${callState.call.status === "incoming" ? "animate-pulse bg-emerald-100 text-emerald-700" : "bg-emerald-50 text-emerald-700"}`}>
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 4.5h3l1.5 4-2 1.5a14 14 0 0 0 6 6l1.5-2 4 1.5v3A2 2 0 0 1 17.4 20C10 19.6 4.4 14 4 6.6a2 2 0 0 1 1.5-2.1Z" /></svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-950">{callState.call.peerName}</h2>
            <p className="mt-1 text-sm text-gray-500">{callState.call.status === "incoming" ? "Incoming voice call" : callState.call.status === "active" ? "Voice call in progress" : callState.call.status === "connecting" ? "Connecting call…" : callState.call.status === "ringing" ? "Ringing…" : "Calling…"}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {callState.call.status === "incoming" && <button type="button" onClick={() => void callState.answerCall()} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">Answer</button>}
              {(callState.call.status === "active" || callState.call.status === "connecting") && <>
                <button type="button" onClick={callState.toggleMute} aria-pressed={callState.muted} className={`flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-semibold ${callState.muted ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}><span className="text-lg" aria-hidden="true">{callState.muted ? "🔇" : "🎙️"}</span>{callState.muted ? "Unmute" : "Mute"}</button>
                <button type="button" onClick={() => setSpeakerOn((enabled) => !enabled)} aria-pressed={speakerOn} className={`flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-semibold ${speakerOn ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}><span className="text-lg" aria-hidden="true">{speakerOn ? "🔊" : "🔈"}</span>{speakerOn ? "Speaker on" : "Speaker off"}</button>
              </>}
              <button type="button" onClick={() => void callState.endCall(callState.call?.status === "incoming" ? "decline" : "end")} className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700">{callState.call.status === "incoming" ? "Decline" : "End call"}</button>
            </div>
          </section>
        </div>
      )}
    </DirectCallContext.Provider>
  );
}

export function useDirectCallContext() {
  const context = useContext(DirectCallContext);
  if (!context) throw new Error("useDirectCallContext must be used inside DirectCallProvider");
  return context;
}
