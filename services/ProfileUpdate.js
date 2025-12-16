/**
 * Generic update service for User / Client
 */
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

/**
 * Generic password update service
 */
export async function updatePasswordService({ model, authUser, data }) {
    if (!authUser) {
        throw { status: 401, message: "Unauthorized Access" };
    }

    const updated = await model.findByIdAndUpdate(
        authUser._id,
        { $set: data },
    );
    console.log(updated);
    return updated;
}
