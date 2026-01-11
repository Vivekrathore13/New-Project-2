import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/group.model.js";
import { Invitation } from "../models/invitation.model.js";

export const sendInvite = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { groupId } = req.params;

  if (!email) throw new ApiError(400, "Email is required");

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  if (group.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only admin can send invites");
  }

  const normalizedEmail = email.toLowerCase();

  // ✅ prevent duplicate pending invite
  const existing = await Invitation.findOne({
    groupId,
    email: normalizedEmail,
    status: "PENDING",
    expiresAt: { $gt: Date.now() }
  });

  if (existing) throw new ApiError(409, "Invite already sent");

  const payload = { groupId, email: normalizedEmail };

  const token = jwt.sign(payload, process.env.INVITE_TOKEN_SECRET, {
    expiresIn: "2d",
  });

  const invite = await Invitation.create({
    groupId,
    email: normalizedEmail,
    token,
    status: "PENDING",
    expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000
  });

  const inviteLink = `${process.env.FRONTEND_URL}/join-group?token=${token}`;

  return res.status(200).json(
    new ApiResponse(200, { inviteId: invite._id, link: inviteLink }, "Invitation generated successfully")
  );
});
export const verifyToken = asyncHandler(async (req, res) => {
  const token = req.query.token || req.params.token;

  if (!token) throw new ApiError(400, "Token is required");

  const invite = await Invitation.findOne({ token });
  if (!invite) throw new ApiError(400, "Invalid invitation token");

  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link has expired");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      email: invite.email,
      groupId: invite.groupId,
      status: invite.status
    }, "Invitation token is valid")
  );
});
export const joinGroup = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) throw new ApiError(400, "Token is required");

  const invite = await Invitation.findOne({ token });
  if (!invite) throw new ApiError(400, "Invalid invitation token");

  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link expired");
  }

  // ✅ already used
  if (invite.status !== "PENDING") {
    throw new ApiError(400, "Invitation already used");
  }

  const loggedInEmail = req.user.email.toLowerCase();

  if (invite.email !== loggedInEmail) {
    throw new ApiError(403, "This invitation is not for your email");
  }

  const group = await Group.findById(invite.groupId);
  if (!group) throw new ApiError(404, "Group not found");

  const alreadyMember = group.member.some(
    (id) => id.toString() === req.user._id.toString()
  );

  if (alreadyMember) throw new ApiError(409, "You are already a member");

  group.member.push(req.user._id);
  await group.save();

  invite.status = "ACCEPTED";
  await invite.save();

  return res.status(200).json(
    new ApiResponse(200, { group }, "Joined group successfully")
  );
});

