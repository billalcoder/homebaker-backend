import request from "supertest";
import app from "../../app.js";
import mongoose from "mongoose";
import { userModel } from "../../models/UserModel.js";
import { sessionModel } from "../../models/SessionModel.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------------------------------------------
// SETUP & TEARDOWN
// ------------------------------------------------------------------
beforeAll(async () => {
    const dbUrl = process.env.TEST_MONGO_URI;
    // Safety check
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
// THE TESTS
// ------------------------------------------------------------------
describe("POST /auth/login Integration", () => {

    // --- 1. HAPPY PATH ---
    test("should login successfully, return 200, and set a generic cookie", async () => {
        // A. Setup User
        const hashedPassword = await bcrypt.hash("Password@123", 10);
        await userModel.create({
            name: "Billal",
            email: "billal@gmail.com",
            password: hashedPassword,
            phone: "0987654321", // <--- FIXED: Added Phone
            terms: true
        });

        // B. Execute Login
        const response = await request(app)
            .post("/auth/login")
            .send({
                email: "billal@gmail.com",
                password: "Password@123"
            });

        // DEBUG: If this fails with 500, print the error
        if (response.statusCode === 500) {
            console.log("SERVER ERROR LOG:", response.text || response.body);
        }

        // C. Assertions
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("User login successfully");

        // Check Cookie
        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies[0]).toContain("sid="); 
        expect(cookies[0]).toContain("HttpOnly");
        // Note: 'Secure' might not show if you are running tests on HTTP (localhost), 
        // but your controller sets it. Supertest often ignores Secure on http.
    });

    // --- 2. LOGIC FAILURES ---
   test("should fail with 401 if password is wrong", async () => {
        const hashedPassword = await bcrypt.hash("CorrectPass", 10);
        await userModel.create({
            name: "Billal",
            email: "billal@gmail.com",
            password: hashedPassword,
            phone: "0987654321", 
            terms: true
        });

        const response = await request(app)
            .post("/auth/login")
            .send({
                email: "billal@gmail.com",
                // FIX: Use a password that LOOKS valid to Zod (strong enough), but is wrong
                password: "WrongPassword@123" 
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe("Invalid email or password");
    });

    test("should fail with 401 if user does not exist", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({
                email: "ghost@gmail.com",
                password: "Password@123"
            });

        if (response.statusCode === 500) console.log("GHOST USER ERROR:", response.text);

        expect(response.statusCode).toBe(401);
    });

    // --- 3. SESSION LIMIT LOGIC ---
    test("should enforce max 2 sessions (Deleting the oldest one)", async () => {
        // A. Create User
        const hashedPassword = await bcrypt.hash("Password@123", 10);
        const user = await userModel.create({
            name: "MultiDeviceUser",
            email: "multi@gmail.com",
            password: hashedPassword,
            phone: "7420860144",
            terms: true
        });

        const credentials = { email: "multi@gmail.com", password: "Password@123" };

        // B. Login 1st Time (Phone)
        await request(app).post("/auth/login").send(credentials);
        
        // Verify: 1 session
        const count1 = await sessionModel.countDocuments({ userId: user._id });
        expect(count1).toBe(1);

        // C. Login 2nd Time (Laptop)
        // Pause 10ms for sorting
        await new Promise(r => setTimeout(r, 10)); 
        await request(app).post("/auth/login").send(credentials);
        
        // Verify: 2 sessions
        const count2 = await sessionModel.countDocuments({ userId: user._id });
        expect(count2).toBe(2);

        // D. Login 3rd Time (Tablet) -> SHOULD DELETE THE 1st ONE
        await new Promise(r => setTimeout(r, 10));
        await request(app).post("/auth/login").send(credentials);

        // Verify: Still 2 sessions
        const count3 = await sessionModel.countDocuments({ userId: user._id });
        expect(count3).toBe(2);
    });

    // --- 4. ATTACK SCENARIOS ---
    
    test("should block NoSQL Injection in email field", async () => {
        const attackData = {
            email: { "$ne": null }, 
            password: "Password@123"
        };

        const response = await request(app)
            .post("/auth/login")
            .send(attackData);

        // If your Zod/Sanitize works, this should be 400. 
        // If it returns 500, check the console log.
        if (response.statusCode === 500) console.log("NOSQL EMAIL ERROR:", response.text);

        expect(response.statusCode).toBe(400); 
    });

    test("should block NoSQL Injection in password field", async () => {
        await userModel.create({
            name: "Target",
            email: "target@gmail.com",
            password: "hashed_password",
            phone: "7420864014", // <--- FIXED: Added Phone
            terms: true
        });
 
        const attackData = {
            email: "target@gmail.com",
            password: { "$ne": "wrong" } 
        };

        const response = await request(app)
            .post("/auth/login")
            .send(attackData);

        expect(response.statusCode).toBe(400);
    }); 

    test("should block empty or malformed inputs (Zod Check)", async () => {
        const badData = {
            email: "not-an-email",
            password: "" 
        };

        const response = await request(app)
            .post("/auth/login")
            .send(badData);

        expect(response.statusCode).toBe(400);
    });
});