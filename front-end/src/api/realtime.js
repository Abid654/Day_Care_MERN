import { io } from "socket.io-client";
import { API_BASE_URL } from "./client";

let activeSocket = null;

export const connectRealtime = (token) => {
    if (!token) return null;
    if (activeSocket?.connected && activeSocket.auth?.token === token) return activeSocket;
    activeSocket?.disconnect();
    activeSocket = io(API_BASE_URL, { auth: { token }, autoConnect: false, reconnection: true, reconnectionAttempts: 8, reconnectionDelayMax: 5000 });
    activeSocket.connect();
    return activeSocket;
};

export const disconnectRealtime = (socket) => {
    if (!socket) return;
    socket.disconnect();
    if (activeSocket === socket) activeSocket = null;
};
