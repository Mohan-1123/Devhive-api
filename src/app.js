const express = require("express");
const connectDb = require("./config/database");
const cookies = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());
app.use(cookies());

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const requestRoutes = require("./routes/request");
const userRoutes = require("./routes/user");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/user", userRoutes);

// db connection and server start
connectDb()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(3009, () => {
      console.log("Server is running on port 3009");
    });
  })
  .catch((err) => {
    console.error("Error connecting to database:", err);
    process.exit(1);
  });
