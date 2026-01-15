import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/group.model.js";
import { Invitation } from "../models/invitation.model.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendNotification } from "../utils/notificationHelper.js";



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

  // ✅ token payload includes inviteId
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

  // ✅ SEND INVITE EMAIL (ONLY ADDED THIS PART)
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 16px;">
      <h2>You are invited to join a group 🎉</h2>
      <p><b>${req.user.fullName}</b> invited you to join the group.</p>
      <p>Click below to join:</p>
      <a href="${inviteLink}"
         style="display:inline-block;background:#2563eb;color:white;
                padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold;">
         Join Group
      </a>
      <p style="margin-top:16px;color:#64748b;font-size:13px;">
        This invitation will expire in 2 days.
      </p>
    </div>
  `;

  await sendEmail({
    to: normalizedEmail,
    subject: "Expense Splitter - Group Invitation",
    html,
  });

  // ✅ ADD NOTIFICATION (invite sent)
await sendNotification({
  userId: req.user._id, // admin ko bhi
  groupId,
  type: "INVITE",
  title: "Invitation Sent",
  message: `Invite sent to ${normalizedEmail}`,
  meta: { inviteId: invite._id, email: normalizedEmail, groupId },
});


  return res.status(200).json(
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

export const acceptInviteExisting = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user?._id;

  if (!token) throw new ApiError(400, "Token is required");
  if (!userId) throw new ApiError(401, "Unauthorized");

  // ✅ Find invite by token
  const invite = await Invitation.findOne({ token });
  if (!invite) throw new ApiError(404, "Invalid or expired invite token");

  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invite link expired");
  }

  if (invite.status !== "PENDING") {
    throw new ApiError(400, "Invitation already used");
  }

  // ✅ Find group
  const group = await Group.findById(invite.groupId);
  if (!group) throw new ApiError(404, "Group not found");

  // ✅ Ensure logged in user's email matches invited email
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new ApiError(
      403,
      "This invite is for a different email. Please login with invited email."
    );
  }

  // ✅ If already member
  const alreadyMember = group.member?.some(
    (id) => id.toString() === userId.toString()
  );

  if (alreadyMember) {
    return res
      .status(200)
      .json(new ApiResponse(200, { groupId: group._id }, "Already a member ✅"));
  }

  // ✅ Add user to group
  group.member.push(userId);
  await group.save();

  // ✅ Mark invite accepted
  invite.status = "ACCEPTED";
  invite.acceptedAt = new Date();
  await invite.save();

  // ✅ NOTIFY USER
await sendNotification({
  userId: userId,
  groupId: group._id,
  type: "INVITE",
  title: "Joined group ✅",
  message: `You joined group successfully`,
  meta: { groupId: group._id },
});

// ✅ NOTIFY ADMIN
await sendNotification({
  userId: group.admin,
  groupId: group._id,
  type: "INVITE",
  title: "New member joined",
  message: `${user.fullName} joined your group`,
  meta: { groupId: group._id, userId },
});


  return res
    .status(200)
    .json(new ApiResponse(200, { groupId: group._id }, "Joined group successfully ✅"));
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

  // ✅ NOTIFY USER
await sendNotification({
  userId: user._id,
  groupId: group._id,
  type: "INVITE",
  title: "Joined group ✅",
  message: `You joined group successfully`,
  meta: { groupId: group._id },
});

// ✅ NOTIFY ADMIN
await sendNotification({
  userId: group.admin,
  groupId: group._id,
  type: "INVITE",
  title: "New member joined",
  message: `${user.fullName} joined your group`,
  meta: { groupId: group._id, userId: user._id },
});


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



  