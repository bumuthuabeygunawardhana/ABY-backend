import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library"; // 

// Generate JWT token
const generateToken = (id, role, email) => {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// ====== GOOGLE LOGIN (MOBILE) ======
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const googleClient = new OAuth2Client();

// @desc    Google Sign-In (mobile) -> verify ID token
// @route   POST /api/auth/google/login
// @access  Public
export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body; // ID token from mobile app
    if (!idToken) return res.status(400).json({ message: "idToken is required" });

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_IDS.length ? GOOGLE_CLIENT_IDS : undefined, // allow any if unset
    });

    const payload = ticket.getPayload();
    // payload: { sub, email, email_verified, name, picture, ... }

    if (!payload?.email) {
      return res.status(400).json({ message: "Google token has no email" });
    }
    if (!payload.email_verified) {
      return res.status(401).json({ message: "Google email not verified" });
    }

    const googleId = payload.sub;
    const email = payload.email;

    // 1) Try find by googleId
    let user = await User.findOne({ googleId });

    // 2) If not, try by email (user might have registered via email/OTP earlier)
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Link this Google account to existing user
        if (!user.googleId) user.googleId = googleId;
        user.isVerified = true; // Google verified the email
        if (!user.picture && payload.picture) user.picture = payload.picture;
        if (!user.name && payload.name) user.name = payload.name;
        await user.save();
      }
    }

    // 3) If still not found, create a brand new user (Google-only account)
    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId,
        picture: payload.picture,
        role: "user",
        isVerified: true // trust Google
        // no password
      });
    }

    const token = generateToken(user._id, user.role, user.email);
    return res.json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(400).json({ message: "Google login failed", error: error.message });
  }
};

// ====================== EMAIL/OTP FLOW (yours) ======================

// @desc    Register user (send OTP)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: "User already exists and verified" });
    }

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let user;
    if (userExists) {
      userExists.otp = otp;
      userExists.otpExpiry = Date.now() + 5 * 60 * 1000;
      userExists.name = name;
      userExists.password = password; // will be hashed in pre-save
      user = await userExists.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: "user",
        otp,
        otpExpiry: Date.now() + 5 * 60 * 1000,
        isVerified: false
      });
    }

    await sendEmail({
      email,
      subject: "Verify your email",
      message: `Your OTP is ${otp}. It will expire in 5 minutes.`
    });

    res.status(201).json({ message: "OTP sent to email. Please verify to complete signup." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
      token: generateToken(user._id, user.role, user.email)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user (email/password)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ⬇️ NEW: If this is a Google-only account (no password), block password login
    if (user.googleId && !user.password) {
      return res.status(400).json({ message: "This account uses Google Sign-In. Please continue with Google." });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before login" });
    }

    const isMatch = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      token: generateToken(user._id, user.role, user.email)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user with that email" });

    // If Google-only account, block reset via password email
    if (user.googleId && !user.password) {
      return res.status(400).json({ message: "This is a Google account. Use Google Sign-In instead." });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    //const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
You requested a password reset for your Bayhill account.

Your Reset Token: ${resetToken}

Instructions:
1. Open your Bayhill mobile app
2. Go to "Forgot Password" 
3. Enter this token when prompted
4. Set your new password

This token will expire in 10 minutes.

If you did not request this, please ignore this email.
    `;

    try {
      await sendEmail({ email: user.email, subject: "Password Reset token", message });
      res.status(200).json({ success: true, message: "Reset email sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Block for Google-only account
    if (user.googleId && !user.password) {
      return res.status(400).json({ message: "This is a Google account. Use Google Sign-In instead." });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
