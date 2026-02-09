import express from "express";
import {
    addPortfolioImagesController,
    addProductData,
    clientLoginController,
    clientLogoutController,
    clientRegisterController,
    deletePortfolioItem,
    deleteProductController,
    getClientdata,
    getProduct,
    getshopdata,
    sendOtp,
    updateClientPassword,
    updateProductController,
    updateprofile,
    updateShopdata,
    varifyOtp
} from "../controllers/clientLoginController.js";

import { upload } from "../middlewares/upload.js";
import { userSession } from "../middlewares/authmiddlewere.js";
import { authLimiter } from "../middlewares/rateLimiters.js";

const route = express.Router(); // <--- FIXED THIS LINE

// GET request
route.get("/getshop", userSession, getshopdata)
route.get("/getClient", userSession, getClientdata)
route.get("/getproduct" , userSession , getProduct)

// PUT request
route.put("/updateshop", userSession,
    // ⭐ CRITICAL CHANGE: You need this to handle 3 different image inputs
    upload.fields([
        { name: "profileImage", maxCount: 1 },    // Single file
        { name: "coverImage", maxCount: 1 },      // Single file
        { name: "portfolioImages", maxCount: 5 }  // Multiple files
    ]),
    updateShopdata
);
route.put("/product/:id", userSession, upload.array("productImages", 5), updateProductController);
route.put("/updateprofile" , userSession , updateprofile)
route.put("/updatepassword" , userSession , updateClientPassword)

// POST Routes
route.post("/register", authLimiter, clientRegisterController);
route.post("/login", authLimiter,clientLoginController);
route.post("/logout", userSession, clientLogoutController);
route.post("/portfolio", userSession, upload.single("portfolioImages", 7), addPortfolioImagesController);
route.post("/product", userSession, upload.array("productImages", 5), addProductData)
route.post("/sendOtp", authLimiter,sendOtp)
route.post("/varifyOtp", authLimiter,varifyOtp)
// Delete request
route.delete("/product/:id", userSession, deleteProductController);
route.delete("/portfolio/:itemId", userSession, deletePortfolioItem);

export default route;