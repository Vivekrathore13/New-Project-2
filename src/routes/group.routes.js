import express from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createGroup,
  totalExpense,
  groupMembers,
  deleteGroup,
  deleteMember,
  getGroupById,
  getMyGroups
} from "../controllers/group.controllers.js";

import { sendInvite, joinGroup, verifyToken } from "../controllers/invite.controllers.js";
import { body,param} from "express-validator";

const router = express.Router();

/* ----------------------------- GROUP ROUTES ----------------------------- */

// ✅ 1) Create group
router.post(
  "/group/create",
  verifyJWT,
  body("groupname", "Group name is required").notEmpty(),
  createGroup
);

// ✅ 2) Get My Groups
router.get(
  "/group/my",
  verifyJWT,
  getMyGroups
);

// ✅ 3) Get Group by Id
router.get(
  "/group/:id",
  verifyJWT,
  getGroupById
);

// ✅ 4) Get all members of group
router.get(
  "/group/:groupId/members",
  verifyJWT,
  groupMembers
);

// ✅ 5) Add expense to group (totalExpense)
router.post(
  "/group/:groupId/expense",
  verifyJWT,
  body("amount", "Amount is required").notEmpty(),
  totalExpense
);

// ✅ 6) Delete Group (only admin)
router.delete(
  "/group/:groupId",
  verifyJWT,
  deleteGroup
);

// ✅ 7) Delete Member (only admin)
router.delete(
  "/group/:groupId/member/:memberId",
  verifyJWT,
  deleteMember
);


/* ----------------------------- INVITE ROUTES ----------------------------- */

// ✅ 8) Send Invite
router.post(
  "/group/:groupId/invite",
  verifyJWT,
  body("email", "Valid email is required").isEmail(),
  sendInvite
);

// ✅ 9) Verify Invite Token
router.get(
  "/group/invite/verify/:token",
  verifyToken
);

// ✅ 10) Join group using invite
router.post(
  "/group/join",
  verifyJWT,
  joinGroup
);

export default router;
