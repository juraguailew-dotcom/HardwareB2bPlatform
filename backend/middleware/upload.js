const multer = require('multer');
const path = require('path');
const fs = require('fs');

const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

// Base multer instance
let multerUpload;

if (useCloudinary) {
    // Store in memory, then stream to Cloudinary manually
    multerUpload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = /jpeg|jpg|png|webp/;
            cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
        }
    });
} else {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    multerUpload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, uploadDir),
            filename: (req, file, cb) => {
                const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `product-${unique}${path.extname(file.originalname)}`);
            }
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = /jpeg|jpg|png|webp/;
            cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
        }
    });
}

// Wraps multer.array and, when using Cloudinary, streams each buffer up after parsing
function makeUploadMiddleware(fieldName, maxCount) {
    const multerMiddleware = multerUpload.array(fieldName, maxCount);

    return async (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) return next(err);
            if (!useCloudinary || !req.files || req.files.length === 0) return next();

            try {
                const cloudinary = require('cloudinary').v2;
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                    api_key: process.env.CLOUDINARY_API_KEY,
                    api_secret: process.env.CLOUDINARY_API_SECRET
                });

                await Promise.all(req.files.map((file, i) =>
                    new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            {
                                folder: 'hardware-b2b/products',
                                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                                transformation: [{ width: 800, height: 800, crop: 'limit' }]
                            },
                            (error, result) => {
                                if (error) return reject(error);
                                req.files[i].secure_url = result.secure_url;
                                resolve();
                            }
                        );
                        stream.end(file.buffer);
                    })
                ));

                next();
            } catch (uploadErr) {
                next(uploadErr);
            }
        });
    };
}

// Expose the same interface the routes expect: upload.array(field, max)
const upload = {
    array: (fieldName, maxCount) => makeUploadMiddleware(fieldName, maxCount)
};

module.exports = upload;
