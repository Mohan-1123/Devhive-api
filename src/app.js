const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDb = require("./config/database");
const cookies = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/user");
const Message = require("./models/message");
const ConnectionRequest = require("./models/connectionRequest");

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookies());

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const requestRoutes = require("./routes/request");
const userRoutes = require("./routes/user");
const chatRoutes = require("./routes/chat");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);

// track online users: userId -> socketId
const onlineUsers = {};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split("token=")[1];
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-PassWord");
    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();
  onlineUsers[userId] = socket.id;

  // joinRoom — join a private room for a conversation with another user
  socket.on("joinRoom", ({ targetUserId }) => {
    const roomId = [userId, targetUserId].sort().join("_");
    socket.join(roomId);
  });

  // sendMessage — save to DB and emit to room
  socket.on("sendMessage", async ({ receiverId, text }) => {
    try {
      if (!text || !text.trim()) return;

      const connection = await ConnectionRequest.findOne({
        $or: [
          { fromUserId: userId, toUserId: receiverId, status: "accepted" },
          { fromUserId: receiverId, toUserId: userId, status: "accepted" },
        ],
      });
      if (!connection) return;

      const message = await Message.create({
        senderId: userId,
        receiverId,
        text: text.trim(),
      });

      const roomId = [userId, receiverId].sort().join("_");
      io.to(roomId).emit("receiveMessage", message);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // typing — notify the other user that someone is typing
  socket.on("typing", ({ targetUserId }) => {
    const roomId = [userId, targetUserId].sort().join("_");
    socket.to(roomId).emit("userTyping", { senderId: userId });
  });

  // markSeen — mark all messages from a user as seen
  socket.on("markSeen", async ({ senderId }) => {
    try {
      await Message.updateMany(
        { senderId, receiverId: userId, seen: false },
        { seen: true }
      );

      const senderSocketId = onlineUsers[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesSeen", { by: userId });
      }
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("disconnect", () => {
    delete onlineUsers[userId];
  });
});

// db connection and server start
connectDb()
  .then(() => {
    console.log("Database connected successfully");
    server.listen(3009, () => {
      console.log("Server is running on port 3009");
    });
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
    process.exit(1);
  });
