import mongoose from 'mongoose'

const invitationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true
    },

    token: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED"],
      default: "PENDING"
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);