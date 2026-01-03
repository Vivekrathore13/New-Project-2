import mongoose from "mongoose";

const expenseSchema= new mongoose.Schema(
  {
    description:{
      Type:String,
      trim:true,
      index:true,
      required:true
    },
    amount:{
      type:Number,
      required:true,
    },
    paidBy:{
      type:Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    splitamong:{
      type:Schema.Types.ObjectId,
      ref:"User"
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },
    splitAmong: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    splitType: {
      type: String,
      enum: ["equal", "percentage"],
      default: "equal"
    }
  },{timestamps:true}
)

export const expense= mongoose.model("Expense",expenseSchema)