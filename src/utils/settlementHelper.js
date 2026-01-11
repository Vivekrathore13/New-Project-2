import mongoose from "mongoose";
import { Group } from "../models/group.model.js";
import { Expense } from "../models/expense.model.js";
import { Settlement } from "../models/settlement.model.js";
import { ApiError } from "./ApiError.js";

/**
 * ✅ Calculates NET balances for a group.
 * net = (paid by user) - (owed by user)  [including settlement payments adjustment]
 *
 * Returns:
 * {
 *   group,
 *   members: [memberIdString...],
 *   netMap: Map(userIdString -> netAmountNumber),
 *   balances: [{ userId, fullName, email, net, status }]
 * }
 */
export const calculateGroupBalances = async (groupId) => {
  if (!groupId || !mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid groupId");
  }

  // ✅ fetch group with member details
  const group = await Group.findById(groupId).populate("member", "fullName email");
  if (!group) throw new ApiError(404, "Group not found");

  const members = group.member.map((m) => m._id.toString());

  // ✅ fetch all expenses + settlement logs of group
  const expenses = await Expense.find({ groupId });
  const settlements = await Settlement.find({ groupId });

  // ✅ init net map
  const netMap = new Map();
  members.forEach((id) => netMap.set(id, 0));

  // ====================================
  // ✅ 1) Apply expense impact
  // paidBy gets +amount
  // split users get -splitAmount
  // ====================================
  for (const exp of expenses) {
    const paidBy = exp.paidBy.toString();
    const expAmount = Number(exp.amount) || 0;

    netMap.set(paidBy, (netMap.get(paidBy) || 0) + expAmount);

    for (const s of exp.splitDetails) {
      const uid = s.user.toString();
      const owe = Number(s.amount) || 0;
      netMap.set(uid, (netMap.get(uid) || 0) - owe);
    }
  }

  // ====================================
  // ✅ 2) Apply settlement payments adjustment
  // If X paid Y amount:
  // - X debt reduces => net[X] += amount
  // - Y credit reduces => net[Y] -= amount
  // ====================================
  for (const st of settlements) {
    const from = st.from.toString();
    const to = st.to.toString();
    const amt = Number(st.amount) || 0;

    netMap.set(from, (netMap.get(from) || 0) + amt);
    netMap.set(to, (netMap.get(to) || 0) - amt);
  }

  // ✅ round to 2 decimals
  for (const [uid, val] of netMap.entries()) {
    netMap.set(uid, +val.toFixed(2));
  }

  // ✅ build balances array (for API response)
  const balances = group.member.map((m) => {
    const uid = m._id.toString();
    const net = +(netMap.get(uid) || 0).toFixed(2);

    let status = "settled";
    if (net > 0) status = "gets back";
    if (net < 0) status = "owes";

    return {
      userId: m._id,
      fullName: m.fullName,
      email: m.email,
      net,
      status,
    };
  });

  return { group, members, netMap, balances };
};
