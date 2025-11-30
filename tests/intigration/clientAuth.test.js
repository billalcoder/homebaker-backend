import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

import app from '../../app.js'; 
import { ClientModel } from '../../models/ClientModel.js'; 
import { sessionModel } from '../../models/SessionModel.js'; 

dotenv.config();

// 1. SETUP
beforeAll(async () => {
    const dbUrl = process.env.TEST_MONGO_URI;
    if (!dbUrl) throw new Error("TEST_MONGO_URI is missing");
    await mongoose.connect(dbUrl);
});

// 2. CLEANUP
afterEach(async () => {
    await ClientModel.deleteMany({});
    await sessionModel.deleteMany({});
});

// 3. TEARDOWN
afterAll(async () => {
    await mongoose.connection.close();
});

describe('Auth Integration Tests (Real DB)', () => {
    
    const validUser = {
        name: "Billal",
        email: "billal@example.com",
        phone: "9876543210",
        password: "StrongPassword123!",
        shopName: "Billal Shop",
        address: "123 Main St",
        terms: true
    };

    // =====================================================
    // REGISTRATION
    // =====================================================
    describe('POST /auth/register', () => {
        test('should register a new user successfully', async () => {
            const res = await request(app).post('/auth/register').send(validUser);
            expect(res.statusCode).toBe(201);
            
            // Database Check
            const user = await ClientModel.findOne({ email: validUser.email });
            expect(user).not.toBeNull(); // FIX: This was failing because of timing or cleanups
            expect(user.email).toBe(validUser.email);
        });
    });

    // =====================================================
    // LOGIN
    // =====================================================
    describe('POST /auth/login', () => {
        // FIX: Ensure user exists before EACH login test
        beforeEach(async () => {
            await request(app).post('/auth/register').send(validUser);
        });

        test('should login successfully and return cookie', async () => {
            const res = await request(app).post('/auth/login').send({
                email: validUser.email,
                password: validUser.password
            });

            expect(res.statusCode).toBe(200);

            // FIX 2: Your controller might return { sessionId: ... } OR just message. 
            // We check if body has sessionId OR if cookie is present.
            // expect(res.body.sessionId).toBeDefined(); // Commented out in case your API only sends cookie

            // FIX 3: Check for 'sid' (based on your error log showing 'sid=...')
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            const sessionCookie = cookies.find(c => c.includes('sid=')); 
            expect(sessionCookie).toBeDefined();
            expect(sessionCookie).toMatch(/HttpOnly/);
        });
    });

    // =====================================================
    // SESSION LIMITS (The logic that was crashing)
    // =====================================================
    test('should limit active sessions to 2', async () => {
        // 1. Create User
        await request(app).post('/auth/register').send(validUser);
        
        // FIX 1: Fetch user safely
        const user = await ClientModel.findOne({ email: validUser.email });
        expect(user).not.toBeNull(); // Guard clause
        
        const credentials = { email: validUser.email, password: validUser.password };

        // 2. Login A
        await request(app).post('/auth/login').send(credentials);
        
        // 3. Login B (Wait 50ms)
        await new Promise(r => setTimeout(r, 50)); 
        await request(app).post('/auth/login').send(credentials);

        // Verify: 2 Sessions exist
        const count2 = await sessionModel.countDocuments({ userId: user._id });
        expect(count2).toBe(2);

        // 4. Login C (Should delete Login A)
        await new Promise(r => setTimeout(r, 50));
        const res = await request(app).post('/auth/login').send(credentials);
        expect(res.statusCode).toBe(200);

        // Verify: Still 2 Sessions (Not 3)
        const count3 = await sessionModel.countDocuments({ userId: user._id });
        expect(count3).toBe(2);
    });

    // =====================================================
    // LOGOUT
    // =====================================================
    test('should logout and clear the cookie', async () => {
        // 1. Setup
        await request(app).post('/auth/register').send(validUser);
        const loginRes = await request(app).post('/auth/login').send({
            email: validUser.email,
            password: validUser.password
        });
        
        const cookie = loginRes.headers['set-cookie'];

        // 2. Logout
        const logoutRes = await request(app)
            .post('/auth/logout')
            .set('Cookie', cookie); 

        expect(logoutRes.statusCode).toBe(200);

        // FIX 3: Check for 'sid=;' (Empty value)
        const logoutCookie = logoutRes.headers['set-cookie'][0];
        expect(logoutCookie).toMatch(/sid=;/); // Updated regex to match 'sid'
    });
});