const multer = require('multer');
const path = require('path');
const fs = require('fs');

const fileFilter = (req, file, cb) => {
    const allowedExts = /\.(jpeg|jpg|png|webp)$/i;
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedExts.test(path.extname(file.originalname)) && allowedMimes.includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error(`Invalid file type "${file.mimetype}". Only JPEG, PNG and WebP allowed.`));
};

function makeUploadMiddleware(fieldName, useSingle, maxCount, folder) {
    return async (req, res, next) => {
        // Evaluate Cloudinary lazily so dotenv has already loaded
        const useCloudinary = !!(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );

        let storage;
        if (useCloudinary) {
            storage = multer.memoryStorage();
        } else {
            const uploadDir = path.join(__dirname, '..', 'uploads', folder);
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            storage = multer.diskStorage({
                destination: (req, file, cb) => cb(null, uploadDir),
                filename: (req, file, cb) => {
                    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                    cb(null, `${folder}-${unique}${path.extname(file.originalname).toLowerCase()}`);
                },
            });
        }

        const instance = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });
        const handler = useSingle ? instance.single(fieldName) : instance.array(fieldName, maxCount);

        handler(req, res, async (err) => {
            if (err) return res.status(400).json({ error: err.message || 'File upload error' });

            // Normalise to req.files array regardless of single/array
            if (req.file) req.files = [req.file];
            if (!req.files) req.files = [];

            // If Cloudinary, stream each buffer up now
            if (useCloudinary && req.files.length > 0) {
                try {
                    const cloudinary = require('cloudinary').v2;
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key:    process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET,
                    });

                    await Promise.all(req.files.map((file, i) =>
                        new Promise((resolve, reject) => {
                            const stream = cloudinary.uploader.upload_stream(
                                {
                                    folder: `hardware-b2b/${folder}`,
                                    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                                    transformation: folder === 'avatars'
                                        ? [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }]
                                        : [{ width: 800, height: 800, crop: 'limit' }],
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
                } catch (uploadErr) {
                    return res.status(500).json({ error: 'Cloud upload failed: ' + uploadErr.message });
                }
            }

            next();
        });
    };
}

const upload = {
    single: (fieldName, folder = 'products') => makeUploadMiddleware(fieldName, true,  1,        folder),
    array:  (fieldName, maxCount = 10, folder = 'products') => makeUploadMiddleware(fieldName, false, maxCount, folder),
};

module.exports = upload;
