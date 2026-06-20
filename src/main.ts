import express from "express";
import { createServer } from "http";
import JWTService from "./util/jwt";
import userRouter from "./routes/user";
import {Server} from "socket.io";
import { Chat } from "./types/chat.type";
import {cache} from "./cache/redis"

const app = express();
app.use(express.json());
app.use("/api/users", userRouter);

const httpServer = createServer(app);
const io = new Server(httpServer);

const jwtService = new JWTService(process.env.JWT_SECRET || process.env.SECRET || "default_jwt_secret_key");



app.get("/", (req, res) => {
  res.json({ message: "server is running" });
});

io.use((socket, next) => {
  const authHeader = socket.handshake.headers["authorization"];
  const token = 
    socket.handshake.auth["token"] || 
    socket.handshake.query["token"] || 
    (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : undefined) ||
    authHeader;

  if (!token || typeof token !== "string") {
    return next(new Error("Authentication error: Missing token"));
  }

  try {
    const payload = jwtService.verifyToken(token);
    socket.data = {
      userId: payload.userId,
      userName: payload.userName,
      profilePicture: payload.profilePicture,
    };
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.data.userId;
  console.log(`Socket.io client connected: ${socket.id} (User: ${userId})`);

  // Map user ID to socket ID in Redis
  await cache.set(`online:${userId}`, socket.id);

  // Emit welcome message
  socket.emit("welcome", `Welcome ${socket.data.userName}!`);

  const handleMessage = async (message: any) => {
    try {
      const parsedMessage = typeof message === "string" ? JSON.parse(message) : message;
      const chatData = Chat.parse(parsedMessage);
      console.log(`[Socket.io] Received message from user ${userId}:`, chatData);

      if (chatData.from !== userId) {
        console.warn(`[Socket.io] Sender ID mismatch: chatData.from (${chatData.from}) !== userId (${userId})`);
        socket.emit("error", "Forbidden: sender ID mismatch");
        return;
      }

      const socketId = await cache.get(`online:${chatData.to}`);
      if (socketId) {
        console.log(`[Socket.io] Routing message to online user ${chatData.to} at socket ID ${socketId}`);
        io.to(socketId).emit("receive_message", chatData);
      } else {
        console.log(`[Socket.io] Recipient user ${chatData.to} is currently offline`);
      }
    } catch (e: any) {
      console.error(`[Socket.io] Error parsing/processing message:`, e);
      socket.emit("error", e.message || "Invalid payload");
    }
  };

  socket.on("send_message", handleMessage);
  socket.on("message", handleMessage);

  socket.on("disconnect", async () => {
    console.log(`Socket.io client disconnected: ${socket.id} (User: ${userId})`);
    const currentSocketId = await cache.get(`online:${userId}`);
    if (currentSocketId === socket.id) {
      await cache.delete(`online:${userId}`);
    }
  });
});


httpServer.listen(3000, () => {
  console.log("server is running on port 3000");
});