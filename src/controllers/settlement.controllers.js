import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/group.model.js";
import { Settlement } from "../models/settlement.model.js";
import { calculateGroupBalances } from "../utils/settlementHelper.js";
import { sendNotification } from "../utils/notificationHelper.js";


// ✅ GET GROUP BALANCES
export const getGroupBalance = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  if (!userId) throw new ApiError(401, "Unauthorized User");

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  const { group, balances } = await calculateGroupBalances(groupId);

  const memberIds = group.member.map((m) => m._id.toString());
  if (!memberIds.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { groupId, balances },
      "Group balances fetched successfully"
    )
  );
});

// ✅ GET SETTLEMENT SUGGESTIONS
export const getSettlementSuggestions = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  if (!userId) throw new ApiError(401, "Unauthorized User");

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  const { group, balances } = await calculateGroupBalances(groupId);

  const memberIds = group.member.map((m) => m._id.toString());
  if (!memberIds.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  // ✅ creditors & debtors
  const creditors = [];
  const debtors = [];

  for (const b of balances) {
    if (b.net > 0) creditors.push({ userId: b.userId, amount: +b.net.toFixed(2) });
    if (b.net < 0) debtors.push({ userId: b.userId, amount: +Math.abs(b.net).toFixed(2) });
  }

  // ✅ Minimum transactions matching
  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const payAmount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: +payAmount.toFixed(2),
    });

    debtor.amount = +(debtor.amount - payAmount).toFixed(2);
    creditor.amount = +(creditor.amount - payAmount).toFixed(2);

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  const note =
    "Settlement simplified ✅ Some users become 0 because their payables and receivables adjust (netting), so minimum payments are needed.";

  return res.status(200).json(
    new ApiResponse(
      200,
      { groupId, balances, settlements, note },
      "Settlement suggestions generated successfully"
    )
  );
});

// ✅ CREATE SETTLEMENT LOG
export const createSettlement = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  const { from, to, amount } = req.body;

  if (!userId) throw new ApiError(401, "Unauthorized User");

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  if (!from || !to || amount === undefined) {
    throw new ApiError(400, "from, to, amount are required");
  }

  if (!mongoose.isValidObjectId(from) || !mongoose.isValidObjectId(to)) {
    throw new ApiError(400, "from/to must be valid MongoId");
  }

  if (from.toString() === to.toString()) {
    throw new ApiError(400, "from and to cannot be same");
  }

  const payAmount = Number(amount);
  if (!payAmount || payAmount <= 0) {
    throw new ApiError(400, "Amount must be greater than 0");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const members = group.member.map((m) => m.toString());

  if (!members.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  if (!members.includes(from.toString()) || !members.includes(to.toString())) {
    throw new ApiError(400, "from and to must be group members");
  }

  // ✅ Ensure "from" owes money
  const { netMap } = await calculateGroupBalances(groupId);

  const fromNet = Number(netMap.get(from.toString()) || 0);
  const fromOwes = +Math.max(0, -fromNet).toFixed(2);

  if (fromOwes === 0) {
    throw new ApiError(400, "This user does not owe anything currently");
  }

  if (payAmount > fromOwes) {
    throw new ApiError(400, `Amount exceeds pending debt. Max payable: ${fromOwes}`);
  }

  const settlement = await Settlement.create({
    groupId,
    from,
    to,
    amount: +payAmount.toFixed(2),
    settledAt: new Date(),
  });

  // ✅ 9) Notifications (ADD HERE ✅)
  await sendNotification({
    userId: to,
    groupId,
    type: "SETTLEMENT",
    title: "Payment received",
    message: `You received ₹${payAmount} in settlement`,
    meta: { settlementId: settlement._id, from },
  });

  await sendNotification({
    userId: from,
    groupId,
    type: "SETTLEMENT",
    title: "Payment recorded",
    message: `You paid ₹${payAmount} in settlement`,
    meta: { settlementId: settlement._id, to },
  });

  return res.status(201).json(
    new ApiResponse(201, settlement, "Payment recorded successfully")
  );
});

// ✅ GET SETTLEMENT LOGS
export const getSettlementLogs = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?._id || req.user?.id;

  if (!userId) throw new ApiError(401, "Unauthorized User");

  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const members = group.member.map((m) => m.toString());
  if (!members.includes(userId.toString())) {
    throw new ApiError(403, "You are not a group member");
  }

  const logs = await Settlement.find({ groupId })
    .populate("from", "fullName email")
    .populate("to", "fullName email")
    .sort({ settledAt: -1, createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { groupId, logs }, "Settlement logs fetched successfully")
  );
});
