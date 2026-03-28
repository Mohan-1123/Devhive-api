const express = require("express");
const profileRouter = express.Router();
const { auth } = require("../middlewares/auth");
const User = require("../models/user");
const mongoose = require("mongoose");

// GET /api/profile/view — get my own profile
profileRouter.get("/view", auth, async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/view/:userId — get any user's profile by ID
profileRouter.get("/view/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findById(userId).select("-PassWord");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile/edit — update allowed profile fields (no email or password)
profileRouter.patch("/edit", auth, async (req, res) => {
  const ALLOWED_FIELDS = [
    "firstName",
    "lastName",
    "age",
    "gender",
    "photo",
    "skills",
    "about",
  ];

  const updates = Object.keys(req.body);
  const isValid = updates.every((key) => ALLOWED_FIELDS.includes(key));

  if (!isValid) {
    return res.status(400).json({
      error: `Only the following fields can be updated: ${ALLOWED_FIELDS.join(", ")}`,
    });
  }

  try {
    updates.forEach((key) => (req.user[key] = req.body[key]));
    await req.user.save();

    const { PassWord, ...safeUser } = req.user.toObject();
    res
      .status(200)
      .json({ message: "Profile updated successfully", user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = profileRouter;
