"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type SignalKind = "offer" | "answer" | "ice" | "end" | "decline";
type CallSignal = {
  kind: SignalKind;
  callId: string;
  fromUserId: string;
  toUserId: string;
  peerName?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type DirectCall = {
  callId: string;
  peerId: string;
  peerName: string;
  status: "incoming" | "calling" | "ringing" | "connecting" | "active";
  offer?: RTCSessionDescriptionInit;
};

export function useDirectCall(supabase: SupabaseClient, userId: string) {
  const [call, setCall] = useState<DirectCall | null>(null);
  const [callError, setCallError] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const callRef = useRef<DirectCall | null>(null);
  const inboxChannelRef = useRef<RealtimeChannel | null>(null);
  const outboundChannelRef = useRef<RealtimeChannel | null>(null);
  const outboundPeerIdRef = useRef("");
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const receivedRemoteCandidatesRef = useRef<Set<string>>(new Set());
  const pendingLocalCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localDescriptionSentRef = useRef(false);
  const ringTimeoutRef = useRef<number | null>(null);
  const ringAudioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!ringAudioContextRef.current || ringAudioContextRef.current.state === "closed") {
          ringAudioContextRef.current = new AudioContext();
        }
        if (ringAudioContextRef.current.state === "suspended") void ringAudioContextRef.current.resume();
      } catch {
        // The incoming-call banner and operating-system notification remain available.
      }
    };
    document.addEventListener("pointerdown", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
    return () => {
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!callError) return;
    const timeout = window.setTimeout(() => setCallError(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [callError]);

  const updateCall = useCallback((nextCall: DirectCall | null) => {
    callRef.current = nextCall;
    setCall(nextCall);
  }, []);

  const ensureOutboundChannel = useCallback(async (peerId: string) => {
    if (outboundChannelRef.current && outboundPeerIdRef.current === peerId) return;
    if (outboundChannelRef.current) {
      await supabase.removeChannel(outboundChannelRef.current);
      outboundChannelRef.current = null;
      outboundPeerIdRef.current = "";
    }

    const channel = supabase.channel(`direct-calls:${peerId}`, {
      config: { private: true, broadcast: { ack: true, self: false } },
    });

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED" && !settled) {
          settled = true;
          resolve();
        } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") && !settled) {
          settled = true;
          reject(new Error(error?.message || "Could not connect to call signaling."));
        }
      });
    });

    outboundChannelRef.current = channel;
    outboundPeerIdRef.current = peerId;
  }, [supabase]);

  const sendSignal = useCallback(async (kind: SignalKind, data: Partial<CallSignal> = {}) => {
    const activeCall = callRef.current;
    const channel = outboundChannelRef.current;
    if (!activeCall || !channel || !userId) throw new Error("Call signaling is not ready.");
    const result = await channel.send({
      type: "broadcast",
      event: "call_signal",
      payload: {
        kind,
        callId: activeCall.callId,
        fromUserId: userId,
        toUserId: activeCall.peerId,
        ...data,
      } satisfies CallSignal,
    });
    if (result !== "ok") throw new Error("Could not send the call signal.");
  }, [userId]);

  const sendIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const activeCall = callRef.current;
    if (!activeCall || !userId) return;
    const { error } = await supabase.from("direct_call_ice_candidates").insert({
      call_id: activeCall.callId,
      from_user_id: userId,
      to_user_id: activeCall.peerId,
      candidate,
    });
    if (error) {
      console.warn("Persistent call audio signaling is unavailable; using the active call channel.", error.message);
      await sendSignal("ice", { candidate });
    }
  }, [sendSignal, supabase, userId]);

  const stopCall = useCallback(async () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setMuted(false);
    setRemoteStream(null);
    pendingRemoteCandidatesRef.current = [];
    receivedRemoteCandidatesRef.current.clear();
    pendingLocalCandidatesRef.current = [];
    localDescriptionSentRef.current = false;
    if (ringTimeoutRef.current !== null) window.clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
    updateCall(null);
    if (outboundChannelRef.current) {
      await supabase.removeChannel(outboundChannelRef.current);
      outboundChannelRef.current = null;
      outboundPeerIdRef.current = "";
    }
  }, [supabase, updateCall]);

  const flushRemoteCandidates = useCallback(async () => {
    const connection = peerConnectionRef.current;
    if (!connection?.remoteDescription) return;
    const candidates = pendingRemoteCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await connection.addIceCandidate(candidate);
    }
  }, []);

  const flushLocalCandidates = useCallback(async () => {
    localDescriptionSentRef.current = true;
    const candidates = pendingLocalCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await sendIceCandidate(candidate);
    }
  }, [sendIceCandidate]);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    connection.ontrack = (event) => {
      const nextStream = event.streams[0];
      if (nextStream) setRemoteStream(nextStream);
    };
    connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      if (!localDescriptionSentRef.current) {
        pendingLocalCandidatesRef.current.push(candidate);
      } else {
        void sendIceCandidate(candidate).catch((error: unknown) => {
          setCallError(error instanceof Error ? error.message : "Could not send call audio.");
        });
      }
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "connected") {
        const current = callRef.current;
        if (current) updateCall({ ...current, status: "active" });
      } else if (connection.connectionState === "failed") {
        setCallError("The call could not connect. Try again on a different network.");
      }
    };
    peerConnectionRef.current = connection;
    return connection;
  }, [sendIceCandidate, updateCall]);

  const handleSignal = useCallback(async (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const signal = payload as Partial<CallSignal>;
    if (!signal.kind || !signal.callId || !signal.fromUserId || signal.toUserId !== userId || signal.fromUserId === userId) return;

    const current = callRef.current;
    if (signal.kind === "offer") {
      if (current || !signal.offer) return;
      updateCall({
        callId: signal.callId,
        peerId: signal.fromUserId,
        peerName: signal.peerName || "VYBE member",
        status: "incoming",
        offer: signal.offer,
      });
      setCallError("");
      return;
    }
    if (!current || current.callId !== signal.callId || current.peerId !== signal.fromUserId) return;

    if (signal.kind === "answer" && signal.answer) {
      const connection = peerConnectionRef.current;
      if (!connection) return;
      await connection.setRemoteDescription(signal.answer);
      await flushRemoteCandidates();
      updateCall({ ...current, status: "connecting" });
    } else if (signal.kind === "ice" && signal.candidate) {
      const candidateKey = JSON.stringify(signal.candidate);
      if (receivedRemoteCandidatesRef.current.has(candidateKey)) return;
      receivedRemoteCandidatesRef.current.add(candidateKey);
      const connection = peerConnectionRef.current;
      if (connection?.remoteDescription) await connection.addIceCandidate(signal.candidate);
      else pendingRemoteCandidatesRef.current.push(signal.candidate);
    } else if (signal.kind === "end" || signal.kind === "decline") {
      await stopCall();
    }
  }, [flushRemoteCandidates, stopCall, updateCall, userId]);

  const receiveCallSession = useCallback(async (session: {
    call_id: string;
    caller_id: string;
    recipient_id: string;
    caller_name: string;
    offer: RTCSessionDescriptionInit;
    status: string;
  }) => {
    if (session.recipient_id !== userId || session.status !== "ringing" || callRef.current) return;
    const call: DirectCall = {
      callId: session.call_id,
      peerId: session.caller_id,
      peerName: session.caller_name || "VYBE member",
      status: "incoming",
      offer: session.offer,
    };
    updateCall(call);
    setCallError("");

    const { data: candidates, error } = await supabase.from("direct_call_ice_candidates")
      .select("from_user_id,to_user_id,candidate")
      .eq("call_id", session.call_id)
      .eq("to_user_id", userId)
      .order("id", { ascending: true });
    if (error) {
      console.error("Could not load call connection details:", error.message);
      return;
    }
    for (const row of candidates ?? []) {
      await handleSignal({
        kind: "ice",
        callId: session.call_id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        candidate: row.candidate,
      });
    }
  }, [handleSignal, supabase, updateCall, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`direct-calls:${userId}`, {
        config: { private: true, broadcast: { ack: true, self: false } },
      })
      .on("broadcast", { event: "call_signal" }, ({ payload }) => {
        void handleSignal(payload).catch((error: unknown) => {
          setCallError(error instanceof Error ? error.message : "Could not receive call signal.");
        });
      });
    inboxChannelRef.current = channel;
    const persistentChannel = supabase
      .channel(`direct-call-persistence:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_call_sessions", filter: `recipient_id=eq.${userId}` }, ({ new: row }) => {
        void receiveCallSession(row as Parameters<typeof receiveCallSession>[0]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_call_ice_candidates", filter: `to_user_id=eq.${userId}` }, ({ new: row }) => {
        void handleSignal({
          kind: "ice",
          callId: row.call_id,
          fromUserId: row.from_user_id,
          toUserId: row.to_user_id,
          candidate: row.candidate,
        }).catch((error: unknown) => setCallError(error instanceof Error ? error.message : "Could not receive call audio."));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_call_sessions", filter: `recipient_id=eq.${userId}` }, ({ new: row }) => {
        const current = callRef.current;
        if (current?.callId === row.call_id && ["declined", "ended"].includes(String(row.status))) void stopCall();
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          void supabase.from("direct_call_sessions")
            .select("call_id,caller_id,recipient_id,caller_name,offer,status")
            .eq("recipient_id", userId)
            .eq("status", "ringing")
            .gt("created_at", new Date(Date.now() - 60_000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => { if (data) void receiveCallSession(data as Parameters<typeof receiveCallSession>[0]); });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Direct call session subscription failed:", error?.message || status);
        }
      });
    channel.subscribe((status, error) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(
          "Direct call inbox subscription failed. Apply the latest messaging database migration.",
          error?.message || status
        );
      }
    });
    return () => {
      inboxChannelRef.current = null;
      void supabase.removeChannel(channel);
      void supabase.removeChannel(persistentChannel);
    };
  }, [handleSignal, receiveCallSession, stopCall, supabase, userId]);

  const startCall = useCallback(async (peerId: string, peerName: string) => {
    if (!userId || callRef.current) return;
    setCallError("");
    const callId = crypto.randomUUID();
    updateCall({ callId, peerId, peerName, status: "calling" });
    try {
      await ensureOutboundChannel(peerId);
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("Voice calls are not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const connection = createPeerConnection(stream);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      updateCall({ callId, peerId, peerName, status: "ringing" });
      const { error: sessionError } = await supabase.from("direct_call_sessions").insert({
        call_id: callId,
        caller_id: userId,
        recipient_id: peerId,
        caller_name: peerName,
        offer: connection.localDescription ?? offer,
      });
      if (sessionError) console.warn("Persistent call invitations are unavailable until the call migration is applied:", sessionError.message);
      await sendSignal("offer", { offer: connection.localDescription ?? offer, peerName });
      await flushLocalCandidates();
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: peerId,
        actor_id: userId,
        type: "call",
        message: "is calling you",
      });
      if (notificationError) console.error("The call started, but its notification could not be saved:", notificationError);
      if (!sessionError) {
        const { error: pushError } = await supabase.functions.invoke("notify-incoming-call", { body: { callId } });
        if (pushError) console.warn("Background call notification could not be sent:", pushError.message);
      }
      ringTimeoutRef.current = window.setTimeout(() => {
        const ringingCall = callRef.current;
        if (ringingCall?.callId !== callId || ringingCall.status !== "ringing") return;
        void (async () => {
          try { await sendSignal("end"); } catch { /* The remote call may already be unreachable. */ }
          const { data: missedCall, error: missedCallError } = await supabase.from("direct_call_sessions")
            .update({ status: "missed", updated_at: new Date().toISOString() })
            .eq("call_id", callId)
            .eq("status", "ringing")
            .select("call_id")
            .maybeSingle();
          if (missedCallError) console.error("Could not save missed call:", missedCallError);
          if (missedCall) {
            const { error: missedNotificationError } = await supabase.from("notifications").insert({
              user_id: peerId,
              actor_id: userId,
              type: "missed_call",
              message: "missed your call",
            });
            if (missedNotificationError) console.error("Could not notify about missed call:", missedNotificationError);
          }
          await stopCall();
        })();
      }, 60_000);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Could not start the call.");
      await stopCall();
    }
  }, [createPeerConnection, ensureOutboundChannel, flushLocalCandidates, sendSignal, stopCall, supabase, updateCall, userId]);

  const answerCall = useCallback(async () => {
    const current = callRef.current;
    if (!current || current.status !== "incoming" || !current.offer) return;
    setCallError("");
    try {
      await ensureOutboundChannel(current.peerId);
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("Voice calls are not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const connection = createPeerConnection(stream);
      await connection.setRemoteDescription(current.offer);
      await flushRemoteCandidates();
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      const { error: sessionError } = await supabase.from("direct_call_sessions")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("call_id", current.callId)
        .eq("recipient_id", userId);
      if (sessionError) console.warn("Could not persist the accepted call status:", sessionError.message);
      await sendSignal("answer", { answer: connection.localDescription ?? answer });
      await flushLocalCandidates();
      updateCall({ ...current, status: "connecting" });
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Could not answer the call.");
      await stopCall();
    }
  }, [createPeerConnection, ensureOutboundChannel, flushLocalCandidates, flushRemoteCandidates, sendSignal, stopCall, supabase, updateCall, userId]);

  const endCall = useCallback(async (kind: "end" | "decline" = "end") => {
    const current = callRef.current;
    if (callRef.current && outboundChannelRef.current) {
      try { await sendSignal(kind); } catch (error) {
        console.error("Could not send call end signal:", error);
      }
    }
    if (current) {
      const status = kind === "decline" ? "declined" : "ended";
      const { error } = await supabase.from("direct_call_sessions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("call_id", current.callId);
      if (error) console.error("Could not update call status:", error);
    }
    await stopCall();
  }, [sendSignal, stopCall, supabase]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
  }, [muted]);

  useEffect(() => {
    const shouldRing = call?.status === "incoming" || call?.status === "ringing";
    if (!shouldRing) return;

    let context = ringAudioContextRef.current;
    let interval: number | null = null;
    const playTone = () => {
      if (!context || context.state === "closed") return;
      const now = context.currentTime;
      for (const frequency of [440, 480]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.03);
        gain.gain.setValueAtTime(0.055, now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.72);
      }
    };

    try {
      if (!context || context.state === "closed") {
        context = new AudioContext();
        ringAudioContextRef.current = context;
      }
      void context.resume().then(playTone).catch(() => undefined);
      interval = window.setInterval(playTone, 2200);
    } catch {
      // The visible incoming-call UI still works if audio is unavailable.
    }
    if (call?.status === "incoming") {
      window.navigator.vibrate?.([450, 250, 450]);
    }

    return () => {
      if (interval !== null) window.clearInterval(interval);
      window.navigator.vibrate?.(0);
    };
  }, [call?.callId, call?.status]);

  useEffect(() => () => {
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (outboundChannelRef.current) void supabase.removeChannel(outboundChannelRef.current);
  }, [supabase]);

  return { call, callError, remoteStream, muted, toggleMute, startCall, answerCall, endCall };
}
