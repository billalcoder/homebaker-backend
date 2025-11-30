import { ClientModel } from "../models/ClientModel.js"; // Adjust path as needed
import { ShopModel } from "../models/ShopModel.js";
import { loginService } from "../services/loginService.js";
import { logoutService } from "../services/logoutService.js";
import { registrationService } from "../services/registrationService.js";
import { clientLoginValidation, clientUpdateValidation, clientValidation } from "../validations/clientValidation.js";
import { deleteFromS3, uploadToS3 } from "../utils/s3.js"; // Your existing utility
import { productValidation } from "../validations/productValidation.js";
import { upload } from "../middlewares/upload.js";
import { ProductModel } from "../models/ProductModel.js";
import { shopValidation } from "../validations/shopValidation.js";
// import { registrationService, loginService, logoutService } from "../services/"; // Adjust path

// Helper to handle Zod errors clearly
const formatZodError = (error) => {
    return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
};

export async function getClientdata(req, res, next) {
    try {
        const clientData = req.user
        if (!clientData) {
            return res.status(404).json({ error: "client not found!" })
        }
        const { name, phone, email } = clientData

        res.status(200).json({ name, phone, email })
    } catch (error) {
        console.log(error);
        next(error)
    }
}

export async function updateprofile(req, res, next) {
    try {
        const ClientData = req.user
        console.log(req.body);
        const newData = clientUpdateValidation.safeParse(req.body.profile)
        console.log(newData);
        if (newData.error) {
            console.log(newData.error);
            return res.status(400).json({ error: newData.error })
        }

        const cleanData = newData.data
        console.log(cleanData);

        if (!ClientData) {
            return res.status(401).json({ error: "Unauthorize Access" })
        }

        const updateed = await ClientModel.updateOne({ name: ClientData.name }, { $set: cleanData })

        console.log(updateed);
        res.status(200).json({ message: "Update user data successfully" })
    } catch (error) {
        console.log(error);
        return res.status(500).json(error)
    }

}

export async function getshopdata(req, res, next) {
    try {
        const clientData = req.user
        if (!clientData) {
            return res.status(404).json({ error: "client not found!" })
        }
        const shopData = await ShopModel.findOne({ clientId: clientData._id })
        if (!shopData) {
            return res.status(404).json({ error: "shop not found!" })
        }
        if (clientData._id.toString() !== shopData.clientId.toString()) {
            return res.status(401).json({ error: "unauthorized access!" })
        }

        res.status(200).json(shopData)
    } catch (error) {
        console.log(error);
        next(error)
    }

}

export async function updateShopdata(req, res, next) {
    try {
        const clientData = req.user;
        const files = req.files || {};

        const shop = await ShopModel.findOne({ clientId: clientData._id });
        if (!shop) return res.status(404).json({ error: "Shop not found!" });

        let cleanUpdates = { ...req.body };
        if (cleanUpdates.socialLinks === "") {
            delete cleanUpdates.socialLinks;
        }
        delete cleanUpdates.clientId;
        delete cleanUpdates.portfolio; // Ensure we never touch portfolio here

        // 1. Handle Profile Image
        if (files.profileImage) {
            if (shop.profileImage && !shop.profileImage.includes("placehold.co")) {
                await deleteFromS3(shop.profileImage);
            }
            cleanUpdates.profileImage = await uploadToS3(files.profileImage[0]);
        }

        // 2. Handle Cover Image
        if (files.coverImage) {
            if (shop.coverImage) {
                await deleteFromS3(shop.coverImage);
            }
            cleanUpdates.coverImage = await uploadToS3(files.coverImage[0]);
        }

        // 3. Update DB
        const updatedShop = await ShopModel.findOneAndUpdate(
            { clientId: clientData._id },
            { $set: cleanUpdates },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ message: "Shop Profile updated", shop: updatedShop });

    } catch (error) {
        next(error);
    }
}

export async function deletePortfolioItem(req, res, next) {
    try {
        const clientId = req.user._id;
        const itemId = req.params.itemId; // passed in URL

        const shop = await ShopModel.findOne({ clientId });
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        // 1. Find the item in the array
        const item = shop.portfolio.id(itemId); // Mongoose subdocument helper
        if (!item) return res.status(404).json({ error: "Image not found" });

        // 2. Delete from AWS S3
        await deleteFromS3(item.imageUrl);

        // 3. Remove from Database Array
        // $pull removes an item from an array that matches the condition
        await ShopModel.findOneAndUpdate(
            { clientId },
            { $pull: { portfolio: { _id: itemId } } }
        );

        return res.status(200).json({ message: "Portfolio item deleted" });

    } catch (error) {
        next(error);
    }
}

export async function addShopData(req, res, next) {
    const clientId = req.user._id
    if (!clientId) {
        res.status(401).json({ error: "Unauthorize access" })
    }
    const shopData = shopValidation.safeParse(req.body)

    if (!shopData.success) {
        res.status(400).json({ error: shopData.error.errors.message })
    }

    shopData.clientId = clientId
    ShopModel.create(shopData.data)

}

export async function clientRegisterController(req, res, next) {
    try {
        // 1. Input Validation (Zod) - Security: Prevents Malformed Data
        const validationResult = clientValidation.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: "Validation Error",
                details: formatZodError(validationResult.error)
            });
        }

        console.log(validationResult.data);

        // 2. Call Service
        const result = await registrationService(validationResult.data, ClientModel);

        if (result.error) {
            return res.status(409).json(result); // 409 Conflict for duplicates
        }

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function clientLoginController(req, res, next) {
    try {

        console.log(!req.body.email, !req.body.password);
        // 1. Basic Validation
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ error: "Email and Password are required" });
        }
        const data = clientLoginValidation.safeParse(req.body)
        console.log(data);
        if (!data.success) {
            return res.status(400).json({
                error: "Validation Error",
                details: formatZodError(data.error)
            })
        }

        // 2. Call Service
        const result = await loginService(data.data);

        if (result.error) {
            // Use the status code provided by the service, default to 400
            return res.status(result.statusCode || 400).json({ error: result.error });
        }

        // 3. Security: Set HttpOnly Cookie (Mitigates XSS)
        // We assume 'sessionId' is returned on success
        res.cookie("sid", result.sessionId, {
            httpOnly: true,  // Client JS cannot access this
            secure: process.env.NODE_ENV === "production", // HTTPS only in prod
            sameSite: "none", // Mitigates CSRF,
            signed: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
        });

        return res.status(200).json({ message: "Login successful", sessionId: result.sessionId });
    } catch (error) {
        next(error);
    }
}

export async function clientLogoutController(req, res, next) {
    try {
        // Get session ID from cookies
        const sessionId = req.signedCookies.sid;
        console.log(sessionId);
        if (!sessionId) {
            return res.status(404).json({ message: "No session Found" })
        }
        await logoutService(sessionId);

        // Always clear the cookie, even if session didn't exist in DB
        res.clearCookie("sid");

        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
}

export async function addPortfolioImagesController(req, res, next) {
    try {
        const clientId = req.user.id; // From Auth Middleware

        console.log("this is a clinntId " + clientId);
        const files = req.files; // <--- Note: req.files (plural) for array

        // 1. Basic Validation
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No images uploaded" });
        }

        const client = await ShopModel.findOne({ clientId });
        if (!client) return res.status(404).json({ error: "Client not found" });

        // 2. Critical Limit Check
        // Existing DB images + New images attempting to upload
        const totalImages = client.portfolio.length + files.length;

        if (totalImages > 7) {
            return res.status(400).json({
                error: `Limit exceeded. You have ${client.portfolio.length} images. You can only add ${7 - client.portfolio.length} more.`
            });
        }

        // 3. Upload ALL files to S3 in Parallel (Fast)
        // We use Promise.all to map the array of files to S3 upload promises
        const uploadPromises = files.map(file => uploadToS3(file));

        const imageUrls = await Promise.all(uploadPromises);

        // 4. Create Database Objects
        // For bulk upload, we set default titles. User can edit specific details later.
        const newItems = imageUrls.map(url => ({
            imageUrl: url,
            title: "", // Default empty, user updates later via 'Edit' API
            price: req.body.price
        }));

        // 5. Push to Mongo & Save
        client.portfolio.push(...newItems); // Spread operator to push multiple
        await client.save();

        return res.status(200).json({
            message: `${newItems.length} images added successfully`,
            portfolio: client.portfolio
        });

    } catch (error) {
        next(error);
    }
}

export async function addProductData(req, res, next) {
    try {
        const clientId = req.user._id;

        // 1. FIND THE SHOP
        const shop = await ShopModel.findOne({ clientId });

        if (!shop) {
            return res.status(404).json({
                error: "Shop profile not found. Please create your Shop Profile first."
            });
        }

        // 2. Prepare incoming data
        const rawData = {
            ...req.body,
            price: Number(req.body.price),
            stock: req.body.stock ? Number(req.body.stock) : 10,
            unitValue: req.body.unitValue ? Number(req.body.unitValue) : 1,
            unitType: req.body.unitType,
            shopId: shop._id.toString(),
            clientId: clientId.toString(),
        };

        // 3. Validate using Zod
        const parsed = productValidation.safeParse(rawData);

        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation Error",
                details: parsed.error.errors[0].message,
            });
        }

        const safeData = parsed.data;

        // 4. Files validation
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No product images uploaded" });
        }

        // 5. Upload images to S3
        const uploadPromises = files.map(file => uploadToS3(file));
        const imageUrls = await Promise.all(uploadPromises);

        // 6. Create product in DB
        const newProduct = await ProductModel.create({
            ...safeData,
            images: imageUrls,
            shopId: shop._id,
            clientId,
        });

        return res.status(201).json({
            message: "Product added successfully",
            product: newProduct,
        });

    } catch (error) {
        next(error);
    }
}

export async function getProduct(req, res, next) {
    try {
        const user = req.user._id
        if (!user) {
            return res.status(401).json({ error: "Unauthorize Access" })
        }

        const productData = await ProductModel.find({ clientId: user })
        if (!productData) {
            res.status(404).json({ error: "product not found" })
        }
        return res.status(200).json({ data: productData })
    } catch (error) {
        console.log(error);
        next(error)
    }
}

export async function deleteProductController(req, res, next) {
    try {
        const clientId = req.user._id;
        const productId = req.params.id;

        // 1. Find Shop (Ownership Check)
        const shop = await ShopModel.findOne({ clientId });
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        // 2. Find Product
        // CRITICAL: We ensure the product belongs to THIS shop
        const product = await ProductModel.findOne({ _id: productId, shopId: shop._id });

        if (!product) {
            return res.status(404).json({ error: "Product not found or you don't own it" });
        }

        // 3. Delete Images from AWS S3
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(url => deleteFromS3(url));
            await Promise.all(deletePromises);
        }

        // 4. Delete from Database
        await product.deleteOne();

        return res.status(200).json({ message: "Product and images deleted successfully" });

    } catch (error) {
        next(error);
    }
}

export async function updateProductController(req, res, next) {
    try {
        const clientId = req.user._id;
        const productId = req.params.id;

        // 1. Ownership Check
        const shop = await ShopModel.findOne({ clientId });
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        const product = await ProductModel.findOne({ _id: productId, shopId: shop._id });
        if (!product) return res.status(404).json({ error: "Product not found" });

        // 2. Handle Text Data (Convert Numbers like in Create)
        const updates = { ...req.body };
        if (updates.price) updates.price = Number(updates.price);
        if (updates.stock) updates.stock = Number(updates.stock);

        // (Optional) You can run Zod validation on 'updates' here if you want strict checking

        // 3. Handle New Images (If uploaded)
        // STRATEGY: If new images are sent, we REPLACE the old ones (MVP style)
        if (req.files && req.files.length > 0) {

            // A. Delete OLD images from S3
            if (product.images.length > 0) {
                await Promise.all(product.images.map(url => deleteFromS3(url)));
            }

            // B. Upload NEW images
            const uploadPromises = req.files.map(file => uploadToS3(file));
            const newImageUrls = await Promise.all(uploadPromises);

            // C. Add to updates object
            updates.images = newImageUrls;
        }

        // 4. Update Database
        // { new: true } returns the updated document
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            productId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        next(error);
    }
}