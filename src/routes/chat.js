const express = require("express");
const chatRouter = express.Router();
const mongoose = require("mongoose");

const { auth } = require("../middlewares/auth");
const Message = require("../models/message");
const ConnectionRequest = require("../models/connectionRequest");

// check if two users are connected (accepted request in either direction)
const areConnected = async (userAId, userBId) => {
  const connection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userAId, toUserId: userBId, status: "accepted" },
      { fromUserId: userBId, toUserId: userAId, status: "accepted" },
    ],
  });
  return !!connection;
};

// GET /api/chat/:userId — get message history with a connected user (paginated)
chatRouter.get("/:userId", auth, async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const connected = await areConnected(myId, userId);
    if (!connected) {
      return res.status(403).json({ error: "You are not connected with this user" });
    }

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (page < 1) page = 1;
    if (limit > 50) limit = 50;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ data: messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/:userId — send a message to a connected user
chatRouter.post("/:userId", auth, async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const connected = await areConnected(myId, userId);
    if (!connected) {
      return res.status(403).json({ error: "You are not connected with this user" });
    }

    const message = new Message({
      senderId: myId,
      receiverId: userId,
      text: text.trim(),
    });

    await message.save();

    res.status(201).json({ message: "Message sent", data: message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chat/:userId/seen — mark all messages from a user as seen
chatRouter.patch("/:userId/seen", auth, async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    await Message.updateMany(
      { senderId: userId, receiverId: myId, seen: false },
      { seen: true }
    );

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = chatRouter;
