import mongoose, { Types } from "mongoose"
import { minLength } from "zod";

const reviewSchema = new mongoose.Schema(
    {
        clientId : {
            type : Types.ObjectId
        },
        review : { 
            type : Number,
        }
    },
    { timestamps: true }
);

export const reviewModel = mongoose.model("Review", cartSchema);
