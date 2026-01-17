import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path"; // <--- Import this standard Node module


const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export async function uploadToS3(file) {
    // 1. Get the extension (e.g., '.jpg' or '.png') from the original name
    const extension = path.extname(file.originalname);

    // 2. Create name WITH extension (e.g., "a1b2c3d4.jpg")
    const fileName = randomImageName() + extension;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    try {
        // --- ATTEMPT UPLOAD ---
        console.log(`📤 Sending file to S3: ${fileName}...`);
        const a = await s3.send(command);
        console.log("✅ S3 Upload Success!");
    } catch (error) {
        // --- CATCH AWS ERROR ---
        console.error("❌ AWS S3 UPLOAD FAILED:", error);
        throw new Error(`S3 Upload Failed: ${error.message}`);
    }

    return `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${fileName}`;
}

export async function deleteFromS3(fileUrl) {
    try {
        // 1. Extract the "Key" (filename) from the full CloudFront URL
        // URL: https://d123.cloudfront.net/a1b2c3d4.png
        // Key: a1b2c3d4.png

        const fileKey = fileUrl.split('/').pop();

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
        };

        const command = new DeleteObjectCommand(params);
        await s3.send(command);
        console.log(`🗑️ Deleted from S3: ${fileKey}`);
        return true;
    } catch (error) {
        console.error("❌ S3 Delete Error:", error);
        // We return false but don't throw error, so DB deletion can still proceed
        return false;
    }
}