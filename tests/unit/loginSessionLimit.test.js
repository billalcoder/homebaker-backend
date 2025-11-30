import { jest, describe, test, expect, afterEach } from '@jest/globals';

// 1. MOCKS
jest.unstable_mockModule("../../utils/findEmail.js", () => ({
    findEmail: jest.fn()
}));
jest.unstable_mockModule("../../models/SessionModel.js", () => ({
    sessionModel: {
        find: jest.fn(),
        deleteOne: jest.fn(),
        create: jest.fn()
    }
}));
jest.unstable_mockModule("bcrypt", () => ({
    default: { compare: jest.fn() },
    compare: jest.fn()
}));

// 2. IMPORTS
const { loginService } = await import("../../services/loginService.js");
const { findEmail } = await import("../../utils/findEmail.js");
const { sessionModel } = await import("../../models/SessionModel.js");
const bcrypt = (await import("bcrypt")).default;

describe("Login Service - Session Limits", () => {
    
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should delete the oldest session if user already has 2 active sessions', async () => {
        const mockUser = { _id: "user_123", password: "hashed" };
        
        // Setup: User exists & Password matches
        findEmail.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);

        // Setup: User ALREADY has 2 sessions
        const oldSession = { _id: "session_old", createdAt: 100 };
        const newSession = { _id: "session_new", createdAt: 200 };
        
        // Mock the .find().sort() chain
        const mockSort = jest.fn().mockResolvedValue([oldSession, newSession]);
        sessionModel.find.mockReturnValue({ sort: mockSort });

        // Mock Delete and Create
        sessionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
        sessionModel.create.mockResolvedValue({ _id: "session_brand_new" });

        // RUN
        await loginService({ email: "test@test.com", password: "123" });

        // ASSERT
        // 1. Check if deleteOne was called with the OLD session ID
        expect(sessionModel.deleteOne).toHaveBeenCalledWith({ _id: "session_old" });
        
        // 2. Check if new session was created
        expect(sessionModel.create).toHaveBeenCalled();
    });

    test('should NOT delete anything if user has only 1 session', async () => {
        findEmail.mockResolvedValue({ _id: "user_123", password: "hashed" });
        bcrypt.compare.mockResolvedValue(true);

        const oneSession = { _id: "session_1" };
        
        // Mock finding only 1 session
        const mockSort = jest.fn().mockResolvedValue([oneSession]);
        sessionModel.find.mockReturnValue({ sort: mockSort });

        sessionModel.create.mockResolvedValue({ _id: "new_one" });

        await loginService({ email: "test@test.com", password: "123" });

        // ASSERT: Should NOT call delete
        expect(sessionModel.deleteOne).not.toHaveBeenCalled();
    });
});