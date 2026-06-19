import express, { type NextFunction } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import url from "url";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { groups, groupMembers } from "./db/schema";
import JWTService, { type Payload } from "./util/jwt";
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

// wss.on("connection", (ws, req) => {
//   const parsedUrl = url.parse(req.url || "", true);
//   const token = parsedUrl.query["token"];

//   if (!token || typeof token !== "string") {
//     console.log("Connection rejected: Missing token");
//     ws.close(4001, "Authentication token required");
//     return;
//   }

//   let payload;
//   try {
//     payload = jwtService.verifyToken(token);
//   } catch (e) {
//     console.log("Connection rejected: Invalid token");
//     ws.close(4002, "Invalid or expired token");
//     return;
//   }

//   const userId = payload.userId;
//   console.log(`Client connected: ${userId} (${payload.userName})`);

//   if (!connectedUsers.has(userId)) {
//     connectedUsers.set(userId, new Set());
//   }
//   connectedUsers.get(userId)!.add(ws);

//   ws.send(JSON.stringify({ event: "welcome", message: `Welcome ${payload.userName}!` }));

//   ws.on("message", async (msg) => {
//     try {
//       const parsed = JSON.parse(msg.toString());
//       const chatData = Chat.parse(parsed);

//       if (chatData.from !== userId) {
//         ws.send(JSON.stringify({ event: "error", message: "Forbidden: sender ID mismatch" }));
//         return;
//       }

//       // Check if 'to' is a group ID or a user ID
//       const [isGroup] = await db.select().from(groups).where(eq(groups.id, chatData.to)).limit(1);

//       if (isGroup) {
//         // Find all members in the group
//         const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, chatData.to));
        
//         // Broadcast message to all connected group members
//         for (const member of members) {
//           const targetSockets = connectedUsers.get(member.userId);
//           if (targetSockets) {
//             for (const s of targetSockets) {
//               if (s.readyState === WebSocket.OPEN) {
//                 s.send(JSON.stringify({ event: "message", data: chatData }));
//               }
//             }
//           }
//         }
//       } else {
//         // Route as a private message to recipient
//         const targetSockets = connectedUsers.get(chatData.to);
//         if (targetSockets) {
//           for (const s of targetSockets) {
//             if (s.readyState === WebSocket.OPEN) {
//               s.send(JSON.stringify({ event: "message", data: chatData }));
//             }
//           }
//         }

//         // Also send message back to other connected devices/tabs of the sender
//         const senderSockets = connectedUsers.get(userId);
//         if (senderSockets) {
//           for (const s of senderSockets) {
//             if (s !== ws && s.readyState === WebSocket.OPEN) {
//               s.send(JSON.stringify({ event: "message", data: chatData }));
//             }
//           }
//         }
//       }
//     } catch (e: any) {
//       ws.send(JSON.stringify({ event: "error", message: e.message || "Invalid payload" }));
//     }
//   });

//   ws.on("close", () => {
//     console.log(`Client disconnected: ${userId}`);
//     const userSockets = connectedUsers.get(userId);
//     if (userSockets) {
//       userSockets.delete(ws);
//       if (userSockets.size === 0) {
//         connectedUsers.delete(userId);
//       }
//     }
//   });
// });


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

  socket.on("message", async (message) => {
    try {
      let chatData;
      if (typeof message === "string") {
        chatData = Chat.parse(JSON.parse(message));
      } else {
        chatData = Chat.parse(message);
      }

      if (chatData.from !== userId) {
        socket.emit("error", "Forbidden: sender ID mismatch");
        return;
      }

      const socketId = await cache.get(`online:${chatData.to}`);
      if (socketId) {
        io.to(socketId).emit("message", chatData);
      }

      if (chatData.to !== userId) {
        socket.emit("message", chatData);
      }
    } catch (e: any) {
      socket.emit("error", e.message || "Invalid payload");
    }
  });

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