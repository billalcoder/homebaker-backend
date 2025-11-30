import { sessionModel } from "../models/SessionModel.js";

export async function isSession(){
    sessionModel.findOne()
}