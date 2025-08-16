// src/controllers/vehicleController.js
import Vehicle from "../models/Vehicle.js";
import cloudinary from "../config/cloudinary.js";

/** helper: upload one buffer to Cloudinary, return secure_url */
const uploadBufferToCloudinary = (buffer, mimetype, folder = "aby-renters/vehicles") =>
  new Promise((resolve, reject) => {
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimetype};base64,${base64}`;

    cloudinary.uploader.upload(
      dataUri,
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
  });

export const registerVehicle = async (req, res) => {
  try {
    // basic required fields
    const {
      name,
      category,
      pricePerDay,
      dailyMileageLimit,
      pricePerExtraMile,
      minRentalDays,
      maxRentalDays,
      fuelType,
      serviceType,
      seats,
      doors,
      transmission
    } = req.body;

    if (!name || !category || !pricePerDay || !dailyMileageLimit || !pricePerExtraMile ||
        !minRentalDays || !maxRentalDays || !fuelType || !serviceType ||
        !seats || !doors || !transmission) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one photo is required" });
    }

    // upload all photos to Cloudinary
    const photoUrls = await Promise.all(
      req.files.map(file => uploadBufferToCloudinary(file.buffer, file.mimetype))
    );

    const vehicle = await Vehicle.create({
      name,
      category,
      photos: photoUrls,
      pricePerDay: Number(pricePerDay),
      dailyMileageLimit: Number(dailyMileageLimit),
      pricePerExtraMile: Number(pricePerExtraMile),
      minRentalDays: Number(minRentalDays),
      maxRentalDays: Number(maxRentalDays),
      fuelType,
      serviceType,
      seats: Number(seats),
      doors: Number(doors),
      transmission,
      createdBy: req.user._id
    });

    res.status(201).json({
      message: "Vehicle registered successfully",
      vehicle
    });
  } catch (err) {
    console.error("registerVehicle error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
