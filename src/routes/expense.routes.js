import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {CreateExpense,GetGroupExpense,DeleteExpense,UpdateExpense,GetExpenseById} from "../controllers/expense.controllers.js"
import { body,param } from "express-validator";

const router =express.Router();

router.post(
  "/:groupId/createExpense",
  verifyJWT,
  [
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),

    body("amount")
      .notEmpty().withMessage("Amount is required")
      .isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),

    body("paidBy")
      .notEmpty().withMessage("PaidBy is required")
      .isMongoId().withMessage("PaidBy must be a valid MongoId"),

    body("splitType")
      .optional()
      .isIn(["equal", "exact", "percentage"])
      .withMessage("Invalid splitType"),

    body("splitDetails")
      .isArray({ min: 1 })
      .withMessage("splitDetails must be a non-empty array"),

    body("splitDetails.*.user")
      .notEmpty()
      .isMongoId()
      .withMessage("Each splitDetails user must be valid MongoId"),
  ],
  CreateExpense
);


router.get("/:groupId/getExpense",verifyJWT,GetGroupExpense)

router.delete("/:groupId/:expenseId/deleteExpense",verifyJWT,DeleteExpense)

router.patch(
  "/:groupId/:expenseId/updateExpense",
  verifyJWT,
  [
    // params validation
    param("groupId").isMongoId().withMessage("Invalid groupId"),
    param("expenseId").isMongoId().withMessage("Invalid expenseId"),

    // body validation
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),

    body("amount")
      .notEmpty().withMessage("Amount is required")
      .isFloat({ gt: 0 })
      .withMessage("Amount must be greater than 0"),

    body("paidBy")
      .notEmpty().withMessage("PaidBy is required")
      .isMongoId().withMessage("PaidBy must be a valid MongoId"),

    body("splitType")
      .notEmpty()
      .isIn(["equal", "exact", "percentage"])
      .withMessage("Invalid splitType"),

    body("splitDetails")
      .isArray({ min: 1 })
      .withMessage("splitDetails must be a non-empty array"),

    body("splitDetails.*.user")
      .notEmpty()
      .isMongoId()
      .withMessage("Each splitDetails user must be valid MongoId"),
  ],
  UpdateExpense
);


router.get("/:expenseId/getExpenseById",verifyJWT,GetExpenseById)

export default router;