import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/group.model.js";
import { Invitation } from "../models/invitation.model.js";
import { User } from "../models/user.model.js";

// ✅ same function as in user.controllers.js (copy here to avoid import confusion)
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// ✅ 1) SEND INVITE (Admin only)
export const sendInvite = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { groupId } = req.params;

  if (!email) throw new ApiError(400, "Email is required");

  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  if (group.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only admin can send invites");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ✅ prevent duplicate pending invite
  const existing = await Invitation.findOne({
    groupId,
    email: normalizedEmail,
    status: "PENDING",
    expiresAt: { $gt: Date.now() },
  });

  if (existing) throw new ApiError(409, "Invite already sent");

  // ✅ Create invite first (token later)
  const invite = await Invitation.create({
    groupId,
    invitedBy: req.user._id,
    email: normalizedEmail,
    token: "temp",
    status: "PENDING",
    expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days
  });

  // ✅ token payload includes inviteId (important)
  const payload = {
    inviteId: invite._id,
    groupId,
    email: normalizedEmail,
  };

  const token = jwt.sign(payload, process.env.INVITE_TOKEN_SECRET, {
    expiresIn: "2d",
  });

  invite.token = token;
  await invite.save();

  const inviteLink = `${process.env.FRONTEND_URL}/join-group?token=${token}`;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { inviteId: invite._id, link: inviteLink },
        "Invitation generated successfully"
      )
    );
});

// ✅ 2) VERIFY TOKEN (Public)
export const verifyToken = asyncHandler(async (req, res) => {
  const token = req.query.token || req.params.token;

  if (!token) throw new ApiError(400, "Token is required");

  // ✅ Verify jwt
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.INVITE_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  const invite = await Invitation.findById(decoded.inviteId);
  if (!invite) throw new ApiError(400, "Invitation not found");

  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link has expired");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: invite.email,
        groupId: invite.groupId,
        status: invite.status,
      },
      "Invitation token is valid"
    )
  );
});

// ✅ 3) ACCEPT INVITE + SIGNUP + AUTO LOGIN (Public)
export const acceptInviteSignup = asyncHandler(async (req, res) => {
  const { token, fullName, password } = req.body;

  if (!token) throw new ApiError(400, "Token is required");
  if (!fullName || !password) throw new ApiError(400, "Full name and password are required");

  // ✅ verify jwt token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.INVITE_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  const { inviteId, email, groupId } = decoded;

  const invite = await Invitation.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invitation not found");

  if (invite.status !== "PENDING") {
    throw new ApiError(400, "Invitation already used");
  }

  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link expired");
  }

  // ✅ strict check: same email only
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new ApiError(403, "Invitation email mismatch");
  }

  // ✅ group exists?
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // ✅ check if user already exists
  const existedUser = await User.findOne({ email: email.toLowerCase() });

  if (existedUser) {
    // Option A: Strict (recommended)
    throw new ApiError(409, "User already exists, please login to join group");
  }

  // ✅ CREATE USER
  const user = await User.create({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
    isregistered: true,
  });

  // ✅ Add to group (avoid duplicates)
  const alreadyMember = group.member.some((id) => id.toString() === user._id.toString());
  if (!alreadyMember) {
    group.member.push(user._id);
    await group.save();
  }

  // ✅ Mark invite accepted
  invite.status = "ACCEPTED";
  invite.acceptedAt = new Date();
  await invite.save();

  // ✅ generate login tokens
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

  const safeUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: false, // dev
    sameSite: "lax",
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: safeUser,
          group,
          accessToken,
          refreshToken,
        },
        "Joined group successfully"
      )
    );
});
