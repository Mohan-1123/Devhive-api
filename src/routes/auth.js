const express = require("express");
const authRouter = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// POST /api/auth/signup — register a new user
authRouter.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, emailId, PassWord, gender, age } = req.body;

    const user = await User.findOne({ emailId });

    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(PassWord, salt);

    const newUser = new User({
      firstName,
      lastName,
      emailId,
      gender,
      age,
      PassWord: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — login with email and password, returns JWT cookie
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, PassWord } = req.body;

    const user = await User.findOne({ emailId });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isPaasswordMatch = await bcrypt.compare(PassWord, user.PassWord);

    if (!isPaasswordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userObj = user.toObject();
    delete userObj.PassWord;
    res.status(200).json({ message: "Login successful", user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout — clear the JWT cookie and log out
authRouter.post("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", null, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logout successful" });
});

module.exports = authRouter;
