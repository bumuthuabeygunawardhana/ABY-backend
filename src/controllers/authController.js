import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// Generate JWT token
const generateToken = (id, role, email) => {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};


// @desc    Register user
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
      // update existing unverified user
      userExists.otp = otp;
      userExists.otpExpiry = Date.now() + 5 * 60 * 1000;
      userExists.name = name;
      userExists.password = password; // will be hashed in pre-save
      user = await userExists.save();
    } else {
      // create new unverified user
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

    // send OTP email
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

    // success → verify account
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
      token: generateToken(user._id, user.role, user.email) // auto-login after verify
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Always include password explicitly for comparison
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

     // 🔒 block unverified users
    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before login" });
    }

    // Compare entered password with hashed one
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Return token
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
    if (!user) {
      return res.status(404).json({ message: "No user with that email" });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL (frontend link or Postman link)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `You requested a password reset.\n\nPlease click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        message
      });

      res.status(200).json({
        success: true,
        message: "Reset email sent"
      });

    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: "Email could not be sent" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  // Hash token from URL
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
