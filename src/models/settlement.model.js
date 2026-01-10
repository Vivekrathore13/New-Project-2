import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group"
    },

    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    amount: {
      type: Number,
      required: true
    },

    settledAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Settlement = mongoose.model("Settlement", settlementSchema);