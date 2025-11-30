import mongoose from "mongoose";

try {
    if(process.env.NODE_ENV !== "test"){
        await mongoose.connect(process.env.MONGOURL)
        console.log("Database connected");
    }
} catch (error) {
    console.log(error);
    console.log("Database does not connected");
}