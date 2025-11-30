import { userSession } from "../../middlewares/authmiddlewere.js";
import { sanitizeRequest } from "../../middlewares/sanitizationMiddlewere";
import { sessionModel } from "../../models/SessionModel.js"; // We need to mock this
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe("Sanitize Middleware", () => {
    test('should remove xss scripts from req.body', () => {
        // 1. SETUP: Create a fake Request with malicious code
        const req = {
            body: {
                name: "Billal<script>alert('hacked')</script>",
                bio: "<b>Bold is fine</b><script>alert('hacked')</script>" // Depending on your xss config
            },
            query: {},
            params: {}
        };

        const res = {}; // We don't need res for this test
        const next = jest.fn(); // A spy to see if next() is called

        // 2. ACT: Run the middleware
        sanitizeRequest(req, res, next);

        // 3. ASSERT: Check if the script is gone
        expect(req.body.bio).toBe("Bold is fine"); // Script removed
        expect(next).toHaveBeenCalled(); // Important: Ensure the app doesn't hang!
    });
});

describe("User Session Middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = { signedCookies: {}, session: null, user: null };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    // 2. CLEANUP: Restore the original function after every test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should return 404 if no session cookie', async () => {
        req.signedCookies = {};
        await userSession(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should populate req.user if session is valid', async () => {
        req.signedCookies = { sid: "123" };
        const mockUser = { _id: "user_123" };

        // 3. SPY ON THE METHOD instead of mocking the file
        // We tell Jest: "Watch sessionModel.findOne. When it runs, fake the return value."
        jest.spyOn(sessionModel, 'findOne').mockReturnValue({
            populate: jest.fn().mockResolvedValue({ 
                _id: "123", 
                userId: mockUser 
            })
        });

        await userSession(req, res, next);

        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
    });
});