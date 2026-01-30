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
    // 1. Force lowercase extension to avoid case-sensitivity errors in S3
    const extension = path.extname(file.originalname).toLowerCase(); 

    // 2. Create name WITH extension
    const fileName = randomImageName() + extension;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // REMOVE any ACL: 'public-read' lines if you had them
    };

    const command = new PutObjectCommand(params);
    try {
        console.log(`📤 Sending file to S3: ${fileName}...`);
        await s3.send(command);
        console.log("✅ S3 Upload Success!");
    } catch (error) {
        console.error("❌ AWS S3 UPLOAD FAILED:", error);
        throw new Error(`S3 Upload Failed: ${error.message}`);
    }

    // Return the CloudFront URL
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