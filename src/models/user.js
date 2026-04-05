const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  emailId: {
    type: String,
    required: true,
    unique: true,
  },
  PassWord: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
  },
  skills: {
    type: [String],
    default: [],
  },
  about: {
    type: String,
    default: "",
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
});


const userModel = mongoose.model("User", userSchema);

module.exports = userModel;