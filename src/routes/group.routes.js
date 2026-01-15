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

import { sendInvite, acceptInviteSignup , verifyToken,acceptInviteExisting  } from "../controllers/invite.controllers.js";
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
// ✅ Send Invite (admin only)
router.post(
  "/group/:groupId/invite",
  verifyJWT,
  body("email", "Valid email is required").isEmail(),
  sendInvite
);

// ✅ Verify Invite Token (Public)
router.get(
  "/group/invite/verify/:token",
  verifyToken
);

// ✅ Accept Invite for Existing Logged-In User (Protected)
router.post(
  "/group/invite/accept-existing",
  verifyJWT,
  body("token", "Token is required").notEmpty(),
  acceptInviteExisting
);

// ✅ Accept Invite + Signup + Auto login (Public)
router.post(
  "/group/invite/accept",
  body("token", "Token is required").notEmpty(),
  body("fullName", "Full name is required").notEmpty(),
  body("password", "Password is required").notEmpty(),
  acceptInviteSignup
);

export default router;
