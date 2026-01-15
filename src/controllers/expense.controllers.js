import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from"jsonwebtoken";
import { User } from "../models/user.model.js";
import { Group } from "../models/group.model.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import { Expense } from "../models/expense.model.js";
import { response } from "express";
import {calculateNormalizedSplit} from "../utils/splitCalculator.js"
import { sendNotification } from "../utils/notificationHelper.js";


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
//   - equal → amount / member
//   - exact → sum === amount
//   - percentage → total = 100
//   - shares → calculate shares total
// normalize splitDetails (rounding, decimals)
// create expense document
// save expense in DB
// return response (without internal fields)

*/

 export const CreateExpense = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  const errors = validationResult(req);
if (!errors.isEmpty()) {
  throw new ApiError(400, errors.array()[0].msg);
}

  let { description, amount, paidBy, splitDetails, splitType = "equal" } = req.body;

  // ✅ 1) Auth check
  if (!userId) throw new ApiError(401, "Unauthorized request");

  // ✅ 2) groupId validation
  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid Group Id");
  }

  // ✅ 3) basic fields validation
  if (!description || !description.trim() || !amount || !paidBy || !splitDetails) {
    throw new ApiError(400, "All fields are required");
  }

  const totalAmount = Number(amount);
  if (totalAmount <= 0) throw new ApiError(400, "Amount must be greater than 0");

  if (!mongoose.isValidObjectId(paidBy)) {
    throw new ApiError(400, "Invalid paidBy userId");
  }

  // ✅ 4) Fetch group
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // ✅ 5) Group member list (string ids)
  const member = group.member.map((m) => m.toString());

  // ✅ 6) current user group member hona chahiye
  if (!member.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  // ✅ 7) paidBy bhi group member hona chahiye
  if (!member.includes(paidBy.toString())) {
    throw new ApiError(400, "PaidBy must be a group member");
  }

  // ✅ 8) splitType normalize + allow only 3 types
  splitType = splitType.toLowerCase();
  const allowedTypes = ["equal", "exact", "percentage"];
  if (!allowedTypes.includes(splitType)) {
    throw new ApiError(400, "Invalid splitType (only equal/exact/percentage allowed)");
  }

  // ✅ 9) splitDetails validation
  if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
    throw new ApiError(400, "splitDetails must be a non-empty array");
  }

  // ✅ 10) splitDetails users validate: ObjectId + group member + duplicates
  const splitUserIds = splitDetails.map((s) => s.user?.toString());

  if (splitUserIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new ApiError(400, "Invalid userId in splitDetails");
  }

  if (new Set(splitUserIds).size !== splitUserIds.length) {
    throw new ApiError(400, "Duplicate users in splitDetails not allowed");
  }

  for (const uid of splitUserIds) {
    if (!member.includes(uid)) {
      throw new ApiError(400, "Split users must be group member");
    }
  }

  // ✅ 11) Now compute splitDetails.amount
    const normalizedSplit = calculateNormalizedSplit(totalAmount, splitType, splitDetails);

  // ✅ 12) create expense in DB
  const expense = await Expense.create({
    groupId,
    description:description.trim(),
    amount: totalAmount,
    paidBy,
    splitType,
    splitDetails: normalizedSplit,
  });

  // ✅ 13) update group
  group.expenseLog.push(expense._id);
  group.totalExpense = Number(group.totalExpense || 0) + totalAmount;
  await group.save({ validateBeforeSave: false });

// ✅ NOTIFICATIONS: send to all members except creator
for (const memberId of member) {
  if (memberId.toString() === userId.toString()) continue;

  await sendNotification({
    userId: memberId,
    groupId,
    type: "EXPENSE",
    title: "New expense added",
    message: `New expense: ${description.trim()} (₹${totalAmount})`,
    meta: {
      expenseId: expense._id,
      paidBy,
      amount: totalAmount,
      groupId,
    },
  });
}


  // ✅ 14) return
  return res.status(201).json(
    new ApiResponse(201, expense, "Expense created successfully")
  );
});

export const GetGroupExpense=asyncHandler(async(req,res)=>{
  const {groupId}=req.params
  const userId=req.user?._id || req.user?.id;

  if(!userId){
    throw new ApiError(401,"Unauthorized User")
  }
  if(!mongoose.isValidObjectId(groupId)){
    throw new ApiError(400,"invalid Group id")
  }
  const group=await Group.findById(groupId)

  if(!group){
    throw new ApiError(404,"Group is not Found")
  }
   const member=group.member.map(m=>m.toString())

   if(!member.includes(String(userId))){
    throw new ApiError(403,"You are not a group member")
   }
   
   const expense=await Expense.find({groupId}).populate("paidBy","fullName").populate("splitDetails.user","fullName email").sort({createdAt:-1})

   return res.status(200).json(
    new ApiResponse(200,expense,"Expenses fetched successfully")
   )
})

export const DeleteExpense=asyncHandler(async(req,res)=>{
  const {expenseId,groupId}=req.params
  const userId=req.user.id || req.user?._id
   if(!userId){
    throw new ApiError(401,"Unauthorized User")
  }
  if(!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(expenseId)){
    throw new ApiError(400,"invalid Group id")
  }
  const group=await Group.findById(groupId)

  if(!group){
    throw new ApiError(400,"Group is not Found")
  }
  const member=group.member.map(m=>(m.toString()))

  if(!member.includes(String(userId))){
    throw new ApiError(403,"You are not a group member")
  }

  const expense=await Expense.findById(expenseId)

  if(!expense){
    throw new ApiError(400,"Expense not found")
  }
  if(expense.groupId.toString()!==groupId.toString()){
    throw new ApiError(400,"Expense does not belong to this group")
  }

if (
  group.admin.toString() !== userId.toString() &&
  expense.paidBy.toString() !== userId.toString()
) {
  throw new ApiError(403, "Not allowed");
}




 await Expense.findByIdAndDelete(expenseId)

 group.expenseLog.pull(expenseId)
 group.totalExpense -=expense.amount
 await group.save({ validateBeforeSave: false });

// ✅ NOTIFICATIONS: send to members except deleter
for (const memberId of member) {
  if (memberId.toString() === userId.toString()) continue;

  await sendNotification({
    userId: memberId,
    groupId,
    type: "EXPENSE",
    title: "Expense deleted",
    message: `Expense deleted (₹${expense.amount})`,
  });
} 

 return res.status(200).json(new ApiResponse(200 ,"Expense deleted successfully"))
})


export const UpdateExpense = asyncHandler(async (req, res) => {
  const { expenseId, groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  const errors = validationResult(req);
if (!errors.isEmpty()) {
  throw new ApiError(400, errors.array()[0].msg);
}
  // ✅ Auth
  if (!userId) {
    throw new ApiError(401, "Unauthorized User");
  }

  // ✅ Validate ids
  if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(expenseId)) {
    throw new ApiError(400, "Invalid groupId or expenseId");
  }

  // ✅ Fetch group
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // ✅ member check
  const members = group.member.map((m) => m.toString());
  if (!members.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  // ✅ Fetch expense
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  // ✅ expense belongs to this group
  if (expense.groupId.toString() !== groupId.toString()) {
    throw new ApiError(400, "Expense does not belong to this group");
  }

  // ✅ permission (admin OR paidBy)
 const adminId = group.admin?.toString?.() || group.admin;
const paidById = expense.paidBy?._id?.toString?.() || expense.paidBy?.toString?.() || expense.paidBy;

const isAdmin = String(adminId) === String(userId);
const isPayer = String(paidById) === String(userId);

if (!isAdmin && !isPayer) {
  throw new ApiError(403, "Not allowed");
}


  // ✅ update fields
  let { description, amount, paidBy, splitType, splitDetails } = req.body;

  if (
    !description ||
    !description.trim() ||
    amount === undefined ||
    !paidBy ||
    !splitType ||
    !splitDetails
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const totalAmount = Number(amount);
  if (totalAmount <= 0) throw new ApiError(400, "Amount must be greater than 0");

  if (!mongoose.isValidObjectId(paidBy)) {
    throw new ApiError(400, "Invalid paidBy userId");
  }

  // ✅ paidBy group member
  if (!members.includes(paidBy.toString())) {
    throw new ApiError(400, "PaidBy must be a group member");
  }

  // ✅ splitType normalize
  splitType = splitType.toLowerCase();
  const allowedTypes = ["equal", "exact", "percentage"];
  if (!allowedTypes.includes(splitType)) {
    throw new ApiError(400, "Invalid splitType (only equal/exact/percentage allowed)");
  }

  // ✅ splitDetails validation
  if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
    throw new ApiError(400, "splitDetails must be a non-empty array");
  }

  // ✅ users inside splitDetails must be group members + no duplicates
  const splitUserIds = splitDetails.map((s) => s.user?.toString());

  if (splitUserIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new ApiError(400, "Invalid userId in splitDetails");
  }

  if (new Set(splitUserIds).size !== splitUserIds.length) {
    throw new ApiError(400, "Duplicate users in splitDetails not allowed");
  }

  for (const uid of splitUserIds) {
    if (!members.includes(uid)) {
      throw new ApiError(400, "Split users must be group member");
    }
  }

  // ✅ ✅ ✅ helper call (main change)
  const normalizedSplitDetails = calculateNormalizedSplit(
    totalAmount,
    splitType,
    splitDetails
  );

  // ✅ revert old expense amount from group total
  group.totalExpense = Number(group.totalExpense || 0) - Number(expense.amount || 0);
  if (group.totalExpense < 0) group.totalExpense = 0;

  // ✅ update expense doc
  expense.description = description.trim();
  expense.amount = totalAmount;
  expense.paidBy = paidBy;
  expense.splitType = splitType;
  expense.splitDetails = normalizedSplitDetails;

  await expense.save();

  // ✅ apply new expense amount to group
  group.totalExpense = Number(group.totalExpense || 0) + totalAmount;
  await group.save({ validateBeforeSave: false });


  // ✅ NOTIFICATIONS: send to members except updater
for (const memberId of members) {
  if (memberId.toString() === userId.toString()) continue;

  await sendNotification({
    userId: memberId,
    groupId,
    type: "EXPENSE",
    title: "Expense updated",
    message: `Expense updated: ${description.trim()} (₹${totalAmount})`,
    meta: {
      expenseId: expense._id,
      paidBy,
      amount: totalAmount,
      groupId,
    },
  });
}


  return res.status(200).json(
    new ApiResponse(200, expense, "Expense updated successfully")
  );
});

export const GetExpenseById = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  const userId = req.user?._id || req.user?.id;

  // ✅ auth
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // ✅ validate expenseId
  if (!mongoose.isValidObjectId(expenseId)) {
    throw new ApiError(400, "Invalid expenseId");
  }

  // ✅ fetch expense
  const expense = await Expense.findById(expenseId)
    .populate("paidBy", "fullName email")
    .populate("splitDetails.user", "fullName email");

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  // ✅ fetch group (to check membership)
  const group = await Group.findById(expense.groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // ✅ member check
  const members = group.member.map((m) => m.toString());
  if (!members.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  return res.status(200).json(
    new ApiResponse(200, expense, "Expense fetched successfully")
  );
});

