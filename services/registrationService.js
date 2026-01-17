import bcrypt from "bcrypt";

export async function registrationService(cleanData, model) {
    cleanData.email = cleanData.email.toLowerCase();
    const { email, phone, terms } = cleanData;

    try {
        // Check existing email or phone
        const existing = await model.findOne({
            $or: [{ email }, { phone }],
        }).lean();

        if (existing) {
            return { error: "User already exists" };
        }

        // Terms check
        if (!terms) {
            return { error: "Please accept the terms and conditions" };
        }

        // Create user
        await model.create(cleanData);

        return { message: "User registered successfully" };

    } catch (err) {
        console.error(err);
        return { error: "Error while inserting user" };
    }
}


