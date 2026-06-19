import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "./src/index";
import { groups } from "./src/db/schema";
import JWTService from "./src/util/jwt";
import userRouter from "./src/routes/user";
import { Chat } from "./src/types/chat.type";

const app = express();
app.use(express.json());
app.use("/api/users", userRouter);

const httpServer = createServer(app);
const io = new Server(httpServer);

const jwtService = new JWTService(process.env.JWT_SECRET || "default_jwt_secret_key");

app.get("/", (req, res) => {
  res.json({ message: "server is running" });
});

// Middleware to authenticate Socket.io connections
io.use((socket, next) => {
  const token = socket.handshake.auth["token"] || socket.handshake.query["token"];

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

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  console.log(`Socket.io client connected: ${socket.id} (User: ${userId})`);

  // Each user joins their own user room to support private messages
  socket.join(userId);

  socket.emit("welcome", `Welcome ${socket.data.userName}!`);

  socket.on("join_group", (groupId: string) => {
    if (groupId) {
      socket.join(`group:${groupId}`);
      socket.emit("group_joined", groupId);
      console.log(`User ${userId} joined group room: group:${groupId}`);
    }
  });

  socket.on("leave_group", (groupId: string) => {
    if (groupId) {
      socket.leave(`group:${groupId}`);
      socket.emit("group_left", groupId);
      console.log(`User ${userId} left group room: group:${groupId}`);
    }
  });

  socket.on("message", async (msg) => {
    try {
      const chatData = Chat.parse(msg);

      if (chatData.from !== userId) {
        socket.emit("error", "Forbidden: sender ID mismatch");
        return;
      }

      // Check if 'to' is a group ID or a user ID
      const [isGroup] = await db.select().from(groups).where(eq(groups.id, chatData.to)).limit(1);

      if (isGroup) {
        // Broadcast to everyone in the group room
        io.to(`group:${chatData.to}`).emit("message", chatData);
      } else {
        // Route as private message to target user's room and echo to sender's room
        io.to(chatData.to).emit("message", chatData);
        if (chatData.to !== userId) {
          io.to(userId).emit("message", chatData);
        }
      }
    } catch (e: any) {
      socket.emit("error", e.message || "Invalid payload");
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket.io client disconnected: ${socket.id} (User: ${userId})`);
  });
});

httpServer.listen(3000, () => console.log("server is running on port 3000"));