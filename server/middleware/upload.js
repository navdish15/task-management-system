const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================= DIRECTORY SETUP ================= */

const uploadPath = path.join(__dirname, "../uploads/chat");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* ================= STORAGE ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");

    const uniqueName = `${Date.now()}-${safeName}`;
    cb(null, uniqueName);
  },
});

/* ================= FILE VALIDATION ================= */

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Allowed: JPG, PNG, PDF, DOC, DOCX"),
      false,
    );
  }
};

/* ================= MULTER CONFIG ================= */

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = upload;
