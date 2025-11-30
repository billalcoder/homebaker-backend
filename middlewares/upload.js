import multer from "multer";

// 1. Configure Storage
// We use memoryStorage() because we don't want to save files to the server's disk,
// we just want to hold them in RAM briefly before sending to AWS S3.
const storage = multer.memoryStorage();

// 2. Configure File Filter
// Only allow image files (jpeg, png, webp, etc.)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPG, PNG, and WEBP are allowed."), false);
    }
};

// 3. Export the upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Limit: 5MB per file
        files: 7                   // Safety Limit: Max 7 files per request
    }
});