import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Group } from "../models/group.model.js";
import { Expense } from "../models/expense.model.js";
import { Settlement } from "../models/settlement.model.js";
import { calculateGroupBalances } from "../utils/settlementHelper.js"; // ✅ for youOwe/youGetBack

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized User");

  const uid = new mongoose.Types.ObjectId(userId);

  // ✅ 1) total groups (aggregation)
  const groupsAgg = await Group.aggregate([
    { $match: { member: uid } },
    { $project: { _id: 1, groupname: 1, name: 1 } },
  ]);

  const groupIds = groupsAgg.map((g) => g._id);

  // Edge case
  if (groupIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalGroups: 0,
          totalExpenses: 0,
          totalSettlements: 0,
          youOweTotal: 0,
          youGetBackTotal: 0,
          recentSettlements: [],
        },
        "Dashboard summary fetched successfully"
      )
    );
  }

  // ✅ 2) total expenses (aggregation)
  const expenseCountAgg = await Expense.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $count: "totalExpenses" },
  ]);

  // ✅ 3) total settlements (aggregation)
  const settlementCountAgg = await Settlement.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $count: "totalSettlements" },
  ]);

  const totalGroups = groupsAgg.length;
  const totalExpenses = expenseCountAgg?.[0]?.totalExpenses || 0;
  const totalSettlements = settlementCountAgg?.[0]?.totalSettlements || 0;

  // ✅ 4) recent settlements (aggregation + lookups)
  const recentSettlementsAgg = await Settlement.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $sort: { settledAt: -1, createdAt: -1 } },
    { $limit: 5 },

    // from user
    {
      $lookup: {
        from: "users",
        localField: "from",
        foreignField: "_id",
        as: "fromUser",
      },
    },
    { $unwind: { path: "$fromUser", preserveNullAndEmptyArrays: true } },

    // to user
    {
      $lookup: {
        from: "users",
        localField: "to",
        foreignField: "_id",
        as: "toUser",
      },
    },
    { $unwind: { path: "$toUser", preserveNullAndEmptyArrays: true } },

    // group
    {
      $lookup: {
        from: "groups",
        localField: "groupId",
        foreignField: "_id",
        as: "group",
      },
    },
    { $unwind: { path: "$group", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        groupId: 1,
        groupName: { $ifNull: ["$group.groupname", "$group.name"] },

        amount: 1,
        settledAt: { $ifNull: ["$settledAt", "$createdAt"] },

        from: 1,
        to: 1,
        fromName: "$fromUser.fullName",
        toName: "$toUser.fullName",
      },
    },
  ]);

  // ✅ 5) youOweTotal & youGetBackTotal (keep 100% accurate using helper)
  // (later we can optimize but this is safest)
  let youOweTotal = 0;
  let youGetBackTotal = 0;

  for (const g of groupsAgg) {
    const { balances } = await calculateGroupBalances(g._id);

    const myBal = balances.find((b) => String(b.userId) === String(userId));
    const net = Number(myBal?.net || 0);

    if (net > 0) youGetBackTotal += net;
    else if (net < 0) youOweTotal += Math.abs(net);
  }

  youOweTotal = +youOweTotal.toFixed(2);
  youGetBackTotal = +youGetBackTotal.toFixed(2);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalGroups,
        totalExpenses,
        totalSettlements,
        youOweTotal,
        youGetBackTotal,
        recentSettlements: recentSettlementsAgg.map((s) => ({
          settlementId: s._id,
          groupId: s.groupId,
          groupName: s.groupName || "Group",
          fromName: s.fromName || "User",
          toName: s.toName || "User",
          amount: s.amount,
          settledAt: s.settledAt,
          from: s.from,
          to: s.to,
        })),
      },
      "Dashboard summary fetched successfully"
    )
  );
});

export const getGroupSummary = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const members = group.member.map((m) => m.toString());
  if (!members.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  const totalExpenses = await Expense.countDocuments({ groupId });
  const totalSettlements = await Settlement.countDocuments({ groupId });

  const { balances } = await calculateGroupBalances(groupId);

  const myBal = balances.find((b) => String(b.userId) === String(userId));
  const myNet = Number(myBal?.net || 0);

  const suggestionCount = 0; // optional: you can compute by calling your suggestion logic

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        groupId,
        groupName: group.groupname || group.name,
        membersCount: members.length,
        totalExpenses,
        totalSettlements,
        suggestionCount,
        you: { net: myNet },
      },
      "Group summary fetched"
    )
  );
});

