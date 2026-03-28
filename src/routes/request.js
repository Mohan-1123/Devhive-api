const express = require("express");
const mongoose = require("mongoose");
const requestRouter = express.Router();

const ConnectionRequest = require("../models/connectionRequest");
const { auth, validateToUser } = require("../middlewares/auth");

// POST /api/request/send/:status/:toUserId — send a connection request (interested or ignored)
requestRouter.post(
  "/send/:status/:toUserId",
  auth,
  validateToUser,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const { status, toUserId } = req.params;

      const allowedStatuses = ["ignored", "interested"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status: "${status}". Allowed: interested, ignored`,
        });
      }

      if (fromUserId.equals(toUserId)) {
        return res
          .status(400)
          .json({ error: "Cannot send a connection request to yourself" });
      }

      const existingRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });
      if (existingRequest) {
        return res
          .status(400)
          .json({ error: "Connection request already exists" });
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });
      await connectionRequest.save();

      res.status(201).json({
        message: "Connection request sent successfully",
        data: connectionRequest,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /api/request/review/:status/:requestId — accept or reject a received connection request
requestRouter.post("/review/:status/:requestId", auth, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { status, requestId } = req.params;

    const allowedStatuses = ["accepted", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: "${status}". Allowed: accepted, rejected`,
      });
    }

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUserId,
      status: "interested",
    });

    if (!connectionRequest) {
      return res.status(404).json({ error: "Connection request not found" });
    }

    connectionRequest.status = status;
    await connectionRequest.save();

    res.status(200).json({
      message: `Connection request ${status}`,
      data: connectionRequest,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = requestRouter;
