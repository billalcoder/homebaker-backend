import { jest, describe, test, expect, afterEach } from '@jest/globals';

// --------------------------------------------------------
// 1. DEFINE MOCKS (Must happen before imports)
// --------------------------------------------------------

// Mock the Utils file
jest.unstable_mockModule("../../utils/findEmail.js", () => ({
    findEmail: jest.fn()
}));

// Mock the Session Model
// FIX: Added 'find' and 'deleteOne' because your new service logic uses them!
jest.unstable_mockModule("../../models/SessionModel.js", () => ({
    sessionModel: {
        create: jest.fn(),
        find: jest.fn(),
        deleteOne: jest.fn()
    }
}));

// Mock Bcrypt
jest.unstable_mockModule("bcrypt", () => ({
    default: {
        compare: jest.fn()
    },
    compare: jest.fn()
}));

// --------------------------------------------------------
// 2. DYNAMIC IMPORTS
// --------------------------------------------------------
const { loginService } = await import("../../services/loginService.js");
const { findEmail } = await import("../../utils/findEmail.js");
const { sessionModel } = await import("../../models/SessionModel.js");
const bcryptModule = await import("bcrypt");
const bcrypt = bcryptModule.default || bcryptModule;

// --------------------------------------------------------
// 3. THE TESTS
// --------------------------------------------------------
describe("Login Service", () => {
    
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should return sessionId if email and password are correct', async () => {
        const loginData = { email: "test@test.com", password: "password123" };
        const mockUser = { _id: "user_123", email: "test@test.com", password: "hashed_password" };

        // 1. Setup User & Password match
        findEmail.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        
        // 2. FIX: Setup the Session Logic (.find().sort())
        // We simulate that the user has NO existing sessions (empty array)
        const mockSort = jest.fn().mockResolvedValue([]); 
        
        // When sessionModel.find is called, return an object that contains .sort()
        sessionModel.find.mockReturnValue({ sort: mockSort });

        // 3. Setup Create
        sessionModel.create.mockResolvedValue({ _id: "session_999" });

        const result = await loginService(loginData);

        expect(result).toEqual({ sessionId: "session_999" });
    });

    test('should return 401 if user does not exist', async () => {
        findEmail.mockResolvedValue(null);

        const result = await loginService({ email: "wrong@test.com", password: "123" });

        expect(result.statusCode).toBe(401);
        expect(result.error).toBe("Invalid email or password");
    });

    test('should return 401 if password does not match', async () => {
        const mockUser = { _id: "user_123", password: "hashed_password" };

        findEmail.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false); // Wrong password

        const result = await loginService({ email: "test@test.com", password: "wrong" });

        expect(result.statusCode).toBe(401);
        expect(result.error).toBe("Invalid email or password");
    });
});