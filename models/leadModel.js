import mongoose from "mongoose";

const leadModel = mongoose.Schema({
   shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
    index: true // Highly recommended for fast calendar lookups
  },
  userName: {
    type: String,
    required: true
  },
  userPhoneNo: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Essential for your "March 20th" date filtering
  }
})

export const leadmodel = mongoose.model("lead" , leadModel) 