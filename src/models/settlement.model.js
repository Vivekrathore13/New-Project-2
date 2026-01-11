import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    settledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Optional index for faster logs
settlementSchema.index({ groupId: 1, settledAt: -1 });

export const Settlement = mongoose.model("Settlement", settlementSchema);
