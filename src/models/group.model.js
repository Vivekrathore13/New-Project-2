import mongoose, { Schema } from "mongoose";

const groupSchema= new mongoose.Schema(
  {
    groupname:{
      type:String,
      unique:true,
      trim:true,
      index:true,
      required:true
    },
    totalExpense:{
      type:Number,
      default:0,
    },
    user:[ 
      {
      type:Schema.Types.ObjectId,
      ref:"User"
    }
  ],
  },{timestamps:true}
)

export const Group= mongoose.model("Group",groupSchema)