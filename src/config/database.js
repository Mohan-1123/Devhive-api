const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
};

module.exports = connectDB;
