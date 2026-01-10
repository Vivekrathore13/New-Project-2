import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from"jsonwebtoken";
import { User } from "../models/user.model";
import { Group } from "../models/group.model";
import { verifyJWT } from "../middlewares/auth.middlewares";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import { Expense } from "../models/expense.model";

/*
  Crete Expense set of steps


// get expense details from frontend
// validation – required fields empty na ho
// validate group exists
// validate paidBy user exists
// validate paidBy belongs to group
// validate splitType
// validate splitDetails array
// validate splitDetails users belong to group
// splitType ke according validation
//   - equal → amount / members
//   - exact → sum === amount
//   - percentage → total = 100
//   - shares → calculate shares total
// normalize splitDetails (rounding, decimals)
// create expense document
// save expense in DB
// return response (without internal fields)

*/

const CreateExpense = asyncHandler(async (req,res) =>{
  const {groupId}=req.params;

  if(!groupId){
    throw new ApiError(400,"Group id is not found")
  }

  const GroupExist= await Expense.findById(groupId)

  if(!GroupExist){
    throw new ApiError(400,"Group is not found")
  }

   const { description,amount} = req.body;
})