// src/scripts/createAdmin.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://bchamod:bc3545kx@cluster0.clt00ft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    const email = "bumuthuchamod@gmail.com";     // << change to owner's email
    const plainPassword = "kx3545chamod"; // << change to strong password
    const name = "ABY Owner";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(plainPassword, 10);

    const user = new User({
      name,
      email,
      password: hashed,
      role: "admin"
    });

    await user.save();
    console.log("✅ Admin created:", user.email);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
