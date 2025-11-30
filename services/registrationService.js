import bcrypt from "bcrypt";

export async function registrationService(cleanData, model) {
    const { email, phone, terms } = cleanData;

    try {
        // Check existing email or phone
        const existing = await model.findOne({
            $or: [{ email }, { phone }],
        });

        if (existing) {
            return { error: "User already exists" };
        }

        // Terms check
        if (!terms) {
            return { error: "Please accept the terms and conditions" };
        }

        // Hash password
        cleanData.password = await bcrypt.hash(cleanData.password, 10);

        // Create user
        await model.create(cleanData);

        return { message: "User registered successfully" };

    } catch (err) {
        console.error(err);
        return { error: "Error while inserting user" };
    }
}


