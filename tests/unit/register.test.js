import { describe, test, expect, jest } from '@jest/globals'; // Assuming Jest environment
import { registrationService } from "../../services/registrationService.js";

describe("Registration Service Testing", () => {

   test('should successfully register a new user', async () => {
      // 1. SETUP THE DATA
      const cleanData = {
         name: "Billal",
         email: "billal@gmail.com",
         phone: "0987654321",
         password: "password123",
         terms: true,
      };

      // 2. CREATE A FAKE MODEL (MOCK)
      // We pretend this is the database. 
      const mockModel = {
         // When the service asks "Does this user exist?", we say "null" (No).
         findOne: jest.fn().mockResolvedValue(null),
         // When the service tries to create, we say "Okay".
         create: jest.fn().mockResolvedValue({ ...cleanData, _id: '123' }),
      };

      // 3. RUN THE FUNCTION
      // We pass our data and our FAKE model
      const result = await registrationService(cleanData, mockModel);

      // 4. CHECK THE RESULT (This answers your question about toEqual)
      expect(result).toEqual({ message: "User registered successfully" });

      // Optional: Verify the database was actually called
      expect(mockModel.create).toHaveBeenCalled();
   });

   test('should return error if user already exists', async () => {
      const inputData = {
         email: "billal@gmail.com",
         phone: "0987654321",
         password: "password123",
         terms: true
      };

      // MOCK SETUP
      const existingUserMock = {
         // We force findOne to return a real object (truthy) instead of null
         findOne: jest.fn().mockResolvedValue({ _id: "123", email: "billal@gmail.com" }),
         create: jest.fn() // Won't be called, but good to have
      };

      // ACTION
      const result = await registrationService(inputData, existingUserMock);

      // ASSERTION
      expect(result).toEqual({ error: "User already exists" });
      // Verify create was NEVER called because we stopped early
      expect(existingUserMock.create).not.toHaveBeenCalled();
   });

   test('should return error if terms are not accepted', async () => {
      const inputData = {
         email: "new@gmail.com",
         terms: false // <--- THIS IS THE TRIGGER
      };

      // MOCK SETUP
      const mockModel = {
         findOne: jest.fn().mockResolvedValue(null), // User does not exist
      };

      // ACTION
      const result = await registrationService(inputData, mockModel);

      // ASSERTION
      expect(result).toEqual({ error: "Please accept the terms and conditions" });
   });

   test('should catch database errors', async () => {
      const inputData = {
         email: "billal@gmail.com",
         password: "pass",
         terms: true
      };

      // MOCK SETUP
      const brokenMock = {
         findOne: jest.fn().mockResolvedValue(null), // User is new
         // We force the CREATE function to crash
         create: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      };

      // ACTION
      const result = await registrationService(inputData, brokenMock);

      // ASSERTION
      // This confirms your try/catch block caught the error and returned your custom message
      expect(result).toEqual({ error: "Error while inserting user" });
   });
});