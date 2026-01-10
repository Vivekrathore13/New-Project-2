import mongoose from "mongoose";

const expenseSchema= new mongoose.Schema(
  {
     groupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Group",
          required: true
        },
    description:{
      type:String,
      trim:true,
      required:true
    },
    amount:{
      type:Number,
      required:true,
      min:1,
    },
    paidBy:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
      splitDetails: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required:true
        },
        share: {
          type: Number,
          required: true
        }
      }
    ],
    splitType: {
      type: String,
      enum: ["equal","percentage","exact","shares"],
      default: "equal"
    }
  },{timestamps:true}
)

export const Expense = mongoose.model("Expense",expenseSchema)