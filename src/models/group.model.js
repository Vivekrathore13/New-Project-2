import mongoose, { Schema } from "mongoose";

const groupSchema= new mongoose.Schema(
  {
    groupname:{
      type:String,
      trim:true,
      required:true
    },
    totalExpense:{
      type:Number,
      default:0,
    },
    admin:
      {
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
   member:[ 
      {
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    }
  ],
  expenseLog: [{
  amount: Number,
  addedBy: { type: mongoose.Schema.Types.ObjectId,ref: "User" },
  createdAt: { type: Date, default: Date.now }
}]

  },
  {timestamps:true}
)

export const Group= mongoose.model("Group",groupSchema)