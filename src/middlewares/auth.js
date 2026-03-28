const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");

/**
 * AUTH MIDDLEWARE
 * Runs on every protected route.
 *
 * What it does step by step:
 *  1. Reads the JWT token from the request cookie
 *  2. If no token is found → reject with 401 (not logged in)
 *  3. Verifies the token is valid and not expired
 *  4. Looks up the user in the database using the ID inside the token
 *     → This ensures that if a user account is deleted, their old token stops working
 *  5. Attaches the full user object to req.user so routes can use it directly
 */
const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    // No token means the user is not logged in
    if (!token) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // Verify the token signature and expiry using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Double-check the user still exists in the database
    // (handles cases where the account was deleted after login)
    const user = await User.findById(decoded.id).select("-PassWord");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // Make the logged-in user available to all route handlers
    req.user = user;
    next();
  } catch (err) {
    // Catches expired tokens, tampered tokens, or any other JWT errors
    res.status(401).json({ error: "Unauthorized access" });
  }
};

/**
 * VALIDATE TO-USER MIDDLEWARE
 * Used on the "send request" route to verify the target user actually exists.
 *
 * What it does step by step:
 *  1. Reads :toUserId from the URL params
 *  2. Checks if it's a valid MongoDB ObjectId format (prevents crash on garbage input)
 *  3. Looks up that user in the database
 *  4. If found → attaches the user to req.toUser and moves on
 *  5. If not found → stops the request with a 404
 */
const validateToUser = async (req, res, next) => {
  try {
    const { toUserId } = req.params;

    // Reject garbage IDs before hitting the database (e.g. "abc123" or empty strings)
    if (!mongoose.isValidObjectId(toUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const toUser = await User.findById(toUserId).select("-PassWord");
    if (!toUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Attach the target user to the request for use in the route handler
    req.toUser = toUser;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { auth, validateToUser };
