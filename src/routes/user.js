const express = require("express");
const userRouter = express.Router();

const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
const { auth } = require("../middlewares/auth");

// GET /api/user/requests/received — get all pending connection requests sent to me
userRouter.get("/requests/received", auth, async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const requests = await ConnectionRequest.find({
      toUserId: loggedInUserId,
      status: "interested",
    }).populate("fromUserId", [
      "firstName",
      "lastName",
      "emailId",
      "age",
      "gender",
    ]);
    res.status(200).json({ data: requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/connections — get all users I am mutually connected with
userRouter.get("/connections", auth, async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUserId, status: "accepted" },
        { toUserId: loggedInUserId, status: "accepted" },
      ],
    })
      .populate("fromUserId", [
        "firstName",
        "lastName",
        "emailId",
        "age",
        "gender",
      ])
      .populate("toUserId", [
        "firstName",
        "lastName",
        "emailId",
        "age",
        "gender",
      ]);

    const data = connections.map((conn) =>
      conn.fromUserId._id.toString() === loggedInUserId.toString()
        ? conn.toUserId
        : conn.fromUserId,
    );

    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/feed — get paginated list of users I haven't interacted with yet
userRouter.get("/feed", auth, async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUserId }, { toUserId: loggedInUserId }],
    }).select("fromUserId toUserId");

    const excludedUserIds = new Set();
    connectionRequests.forEach((conn) => {
      if (conn.fromUserId.toString() === loggedInUserId.toString()) {
        excludedUserIds.add(conn.toUserId.toString());
      } else {
        excludedUserIds.add(conn.fromUserId.toString());
      }
    });
    excludedUserIds.add(loggedInUserId.toString());

    const excludedArray = Array.from(excludedUserIds);

    const [users, total] = await Promise.all([
      User.find({ _id: { $nin: excludedArray } })
        .select("firstName lastName age gender")
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments({ _id: { $nin: excludedArray } }),
    ]);

    res.status(200).json({
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = userRouter;
