import request from "supertest";
import app from "../../app.js";
import mongoose from "mongoose";
import { userModel } from "../../models/UserModel.js";
import { sessionModel } from "../../models/SessionModel.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------------------------------------------
// SETUP & TEARDOWN (Required in every test file)
// ------------------------------------------------------------------
beforeAll(async () => {
    const dbUrl = process.env.TEST_MONGO_URI;
    if (!dbUrl) throw new Error("TEST_MONGO_URI is missing in .env");
    await mongoose.connect(dbUrl);
});

beforeEach(async () => {
    // Clean slate before every single test
    await userModel.deleteMany({});
    await sessionModel.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});

// ------------------------------------------------------------------
// THE LOGOUT TEST
// ------------------------------------------------------------------
describe("POST /auth/logout Integration", () => {

    test("should logout successfully and clear session", async () => {
        // 1. Setup: Create User
        const hashedPassword = await bcrypt.hash("Password@123", 10);
        const user = await userModel.create({
            name: "LogoutUser",
            email: "out@gmail.com",
            password: hashedPassword,
            phone: "9876543210",
            terms: true
        });

        // 2. Login (To get the cookie)
        const loginRes = await request(app)
            .post("/auth/login")
            .send({ 
                email: "out@gmail.com", 
                password: "Password@123" 
            });
        
        // Extract the cookie from the login response
        const cookie = loginRes.headers['set-cookie'];
        
        // Verify we actually logged in first (Sanity check)
        expect(loginRes.statusCode).toBe(200);

        // 3. Perform Logout
        const logoutRes = await request(app)
            .post("/auth/logout")
            .set('Cookie', cookie); // <--- IMPORTANT: Send the cookie we just got

        // 4. Assertions
        expect(logoutRes.statusCode).toBe(200);
       expect(logoutRes.body.message).toBe("Logged out successfully");

        // Verify Cookie is cleared
        const logoutCookies = logoutRes.headers['set-cookie'][0];
        
        // FIX: Check for the Expiration Date (1970) instead of "sid=;"
        // This confirms the browser is instructed to delete it immediately.
        expect(logoutCookies).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT"); 

        // 5. Verify DB is empty (Session deleted)
        const sessions = await sessionModel.find({ userId: user._id });
        expect(sessions.length).toBe(0);
    });

});