// src/middleware/upload.js
import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // allow only images
  if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG/PNG/WebP images are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB per file
});

export default upload;
