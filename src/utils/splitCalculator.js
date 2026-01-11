import { ApiError } from "./ApiError.js";

/**
 * ✅ Calculate normalized splitDetails for expense
 * Supports: equal, exact, percentage
 *
 * @param {number} totalAmount - total expense amount
 * @param {string} splitType - "equal" | "exact" | "percentage"
 * @param {Array} splitDetails - array of split input
 * @returns {Array} normalizedSplitDetails
 */
export const calculateNormalizedSplit = (totalAmount, splitType, splitDetails) => {
  const type = splitType.toLowerCase();

  if (!Array.isArray(splitDetails) || splitDetails.length === 0) {
    throw new ApiError(400, "splitDetails must be a non-empty array");
  }

  const n = splitDetails.length;

  // ✅ rounding helper: last element adjust
  const fixLastAmount = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length - 1; i++) sum += arr[i].amount;
    arr[arr.length - 1].amount = +(totalAmount - sum).toFixed(2);
    return arr;
  };

  let normalizedSplit = [];

  // ==============================
  // ✅ EQUAL
  // ==============================
  if (type === "equal") {
    const perHead = +(totalAmount / n).toFixed(2);

    normalizedSplit = splitDetails.map((s) => ({
      user: s.user,
      amount: perHead,
    }));

    return fixLastAmount(normalizedSplit);
  }

  // ==============================
  // ✅ EXACT
  // ==============================
  if (type === "exact") {
    normalizedSplit = splitDetails.map((s) => {
      if (s.amount === undefined) {
        throw new ApiError(400, "Amount is required in splitDetails for exact split");
      }

      const a = Number(s.amount);
      if (a < 0) throw new ApiError(400, "Split amount must be >= 0");

      return { user: s.user, amount: +a.toFixed(2) };
    });

    const sum = normalizedSplit.reduce((acc, s) => acc + s.amount, 0);
    if (+sum.toFixed(2) !== +totalAmount.toFixed(2)) {
      throw new ApiError(400, "Exact split sum must match total amount");
    }

    return normalizedSplit;
  }

  // ==============================
  // ✅ PERCENTAGE
  // ==============================
  if (type === "percentage") {
    normalizedSplit = splitDetails.map((s) => {
      if (s.percent === undefined) {
        throw new ApiError(400, "percent is required in splitDetails for percentage split");
      }

      const p = Number(s.percent);
      if (p <= 0) throw new ApiError(400, "percent must be > 0");

      return { user: s.user, percent: +p.toFixed(2), amount: 0 };
    });

    const totalPercent = normalizedSplit.reduce((acc, s) => acc + s.percent, 0);
    if (+totalPercent.toFixed(2) !== 100) {
      throw new ApiError(400, "Total percentage must be 100");
    }

    normalizedSplit = normalizedSplit.map((s) => ({
      ...s,
      amount: +((totalAmount * s.percent) / 100).toFixed(2),
    }));

    return fixLastAmount(normalizedSplit);
  }

  // ==============================
  // ❌ unsupported
  // ==============================
  throw new ApiError(400, "Invalid splitType (only equal/exact/percentage supported)");
};
