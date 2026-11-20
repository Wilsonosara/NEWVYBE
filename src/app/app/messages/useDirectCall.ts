"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type SignalKind = "offer" | "answer" | "ice" | "end" | "decline";
type CallSignal = {
  kind: SignalKind;
  callId: string;
  fromUserId: string;
  toUserId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type DirectCall = {
  callId: string;
  peerId: string;
  peerName: string;
  status: "incoming" | "calling" | "connecting" | "active";
  offer?: RTCSessionDescriptionInit;
};

export function useDirectCall(supabase: SupabaseClient, userId: string) {
  const [call, setCall] = useState<DirectCall | null>(null);
  const [callError, setCallError] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const callRef = useRef<DirectCall | null>(null);
  const inboxChannelRef = useRef<RealtimeChannel | null>(null);
  const outboundChannelRef = useRef<RealtimeChannel | null>(null);
  const outboundPeerIdRef = useRef("");
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingLocalCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localDescriptionSentRef = useRef(false);

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

  const stopCall = useCallback(async () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setRemoteStream(null);
    pendingRemoteCandidatesRef.current = [];
    pendingLocalCandidatesRef.current = [];
    localDescriptionSentRef.current = false;
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
      await sendSignal("ice", { candidate });
    }
  }, [sendSignal]);

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
        void sendSignal("ice", { candidate }).catch((error: unknown) => {
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
  }, [sendSignal, updateCall]);

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
        peerName: "VYBE member",
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
      const connection = peerConnectionRef.current;
      if (connection?.remoteDescription) await connection.addIceCandidate(signal.candidate);
      else pendingRemoteCandidatesRef.current.push(signal.candidate);
    } else if (signal.kind === "end" || signal.kind === "decline") {
      await stopCall();
    }
  }, [flushRemoteCandidates, stopCall, updateCall, userId]);

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
    };
  }, [handleSignal, supabase, userId]);

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
      await sendSignal("offer", { offer: connection.localDescription ?? offer });
      await flushLocalCandidates();
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Could not start the call.");
      await stopCall();
    }
  }, [createPeerConnection, ensureOutboundChannel, flushLocalCandidates, sendSignal, stopCall, updateCall, userId]);

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
      await sendSignal("answer", { answer: connection.localDescription ?? answer });
      await flushLocalCandidates();
      updateCall({ ...current, status: "connecting" });
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Could not answer the call.");
      await stopCall();
    }
  }, [createPeerConnection, ensureOutboundChannel, flushLocalCandidates, flushRemoteCandidates, sendSignal, stopCall, updateCall]);

  const endCall = useCallback(async (kind: "end" | "decline" = "end") => {
    if (callRef.current && outboundChannelRef.current) {
      try { await sendSignal(kind); } catch (error) {
        console.error("Could not send call end signal:", error);
      }
    }
    await stopCall();
  }, [sendSignal, stopCall]);

  useEffect(() => () => {
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (outboundChannelRef.current) void supabase.removeChannel(outboundChannelRef.current);
  }, [supabase]);

  return { call, callError, remoteStream, startCall, answerCall, endCall };
}
