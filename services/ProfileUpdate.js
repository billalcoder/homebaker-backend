import bcrypt from "bcrypt";

export async function updateProfileService({ model, authUser, data }) {
    if (!authUser) {
        throw { status: 401, message: "Unauthorized Access" };
    }

    const updated = await model.updateOne(
        { _id: authUser._id },
        { $set: data }
    );

    return updated;
}


export async function updatePasswordService({ model, authUser, data }) {
    if (!authUser) {
        throw { status: 401, message: "Unauthorized Access" };
    }

    const user = await model.findById(authUser._id);

    if (!user) {
        throw { status: 404, message: "User not found" };
    }

    // 1️⃣ Verify old password
    const isMatch = await bcrypt.compare(data.old, user.password);
    if (!isMatch) {
        throw { status: 400, message: "Old password is incorrect" };
    }

    // 2️⃣ Set new password (hashing via pre-save hook)
    user.password = data.new;

    // 3️⃣ Save user (IMPORTANT)
    await user.save();

    return true;
}

