import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"]
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true
  },

  // ⬇️ CHANGED: password is only required for local (email/password) users
  password: {
    type: String,
    minlength: 6,
    select: false,
    required: function () {
      // require password only if this user is not a Google-only account
      return !this.googleId;
    }
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // ⬇️ ADDED: Google Sign-In fields
  googleId: { type: String, unique: true, sparse: true }, // sparse lets nulls coexist
  picture: String, // optional profile photo from Google

  // OTP verification (your existing flow)
  otp: String,
  otpExpiry: Date,
  isVerified: {
    type: Boolean,
    default: false
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

// Hash password before save (skips if no password / unchanged)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Match user password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

export default mongoose.model("User", userSchema);
