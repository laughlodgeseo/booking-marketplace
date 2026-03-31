"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { apiOrigin } from "@/lib/api/base";

type MessagePayload = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    email: string;
    fullName: string | null;
    role: "ADMIN" | "VENDOR" | "CUSTOMER";
  };
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type UseMessagingSocketOptions = {
  threadId: string | null;
  onNewMessage?: (msg: MessagePayload) => void;
  onTyping?: (data: { threadId: string; userId: string }) => void;
};

export function useMessagingSocket({
  threadId,
  onNewMessage,
  onTyping,
}: UseMessagingSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingRef = useRef(onTyping);

  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  // Connect socket
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    setStatus("connecting");

    let origin: string;
    try {
      origin = apiOrigin();
    } catch {
      setStatus("error");
      return;
    }

    const socket = io(`${origin}/messaging`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 15,
    });

    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("disconnect", (reason) => {
      // If server disconnected us, don't show "connecting" — show disconnected
      if (reason === "io server disconnect") {
        setStatus("disconnected");
      } else {
        // Will auto-reconnect
        setStatus("connecting");
      }
    });

    socket.on("connect_error", () => {
      setStatus("error");
    });

    socket.io.on("reconnect_attempt", () => {
      setStatus("connecting");
    });

    socket.io.on("reconnect", () => {
      setStatus("connected");
    });

    socket.io.on("reconnect_failed", () => {
      setStatus("error");
    });

    socket.on("newMessage", (msg: MessagePayload) => {
      onNewMessageRef.current?.(msg);
    });

    socket.on("userTyping", (data: { threadId: string; userId: string }) => {
      onTypingRef.current?.(data);
    });

    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
    };
  }, []);

  // Join/leave thread room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || status !== "connected" || !threadId) return;

    socket.emit("joinThread", { threadId });

    return () => {
      socket.emit("leaveThread", { threadId });
    };
  }, [threadId, status]);

  const sendMessage = useCallback(
    (body: string) => {
      const socket = socketRef.current;
      if (!socket || !threadId || status !== "connected") return;
      socket.emit("sendMessage", { threadId, body });
    },
    [threadId, status],
  );

  const sendTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !threadId || status !== "connected") return;
    socket.emit("typing", { threadId });
  }, [threadId, status]);

  return { connected: status === "connected", status, sendMessage, sendTyping };
}
