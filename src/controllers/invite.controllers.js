import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Group } from "../models/group.model.js";
import { Invitation } from "../models/invitation.model.js";

export const sendInvite = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { groupId } = req.params;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

 if (group.admin.toString() !== req.user._id.toString()) {
  throw new ApiError(403, "Only admin can send invites");
}


  const token = crypto.randomBytes(32).toString("hex");

  const invite = await Invitation.create({
    groupId,
    email: email.toLowerCase(),
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });

  const inviteLink = `http://localhost:3000/join-group?token=${token}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      { inviteId: invite._id, link: inviteLink },
      "Invitation generated successfully"
    )
  );
});

export const verifyToken = asyncHandler(async (req, res) => {
  const { token } = req.params; // OR req.query — your choice

  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  // find invite in DB
  const invite = await Invitation.findOne({ token });

  if (!invite) {
    throw new ApiError(400, "Invalid invitation token");
  }

  // expiry check
  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link has expired");
  }

  return res.status(200).json(
    new ApiResponse(200,
      {
        email: invite.email,
        groupId: invite.groupId,
        status: invite.status
      },
      "Invitation token is valid"
    )
  );
});

export const joinGroup=asyncHandler(async(req,res) => {
  const {token}=req.body
  if (!token) {
    throw new ApiError(400, "Token is required");
  }
   const invite = await Invitation.findOne({ token });

  if (!invite) {
    throw new ApiError(400, "Invalid invitation token");
  }

    // 3️⃣ expiry check
  if (invite.expiresAt < Date.now()) {
    throw new ApiError(400, "Invitation link expired");
  }

  // 4️⃣ user login se email lo (verifyJWT ne set kiya hai)
  const loggedInEmail = req.user.email;

  // 5️⃣ invited email match check
  if (invite.email !== loggedInEmail) {
    throw new ApiError(403, "This invitation is not for your email");
  }

 
  // 6️⃣ group dhoondo
  const group = await Group.findById(invite.groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // 7️⃣ already member?
  if (group.member.includes(req.user._id)) {
    throw new ApiError(409, "You are already a member of this group");
  }

  // 8️⃣ member add karo
  group.member.push(req.user._id);
  await group.save();

  // 9️⃣ invitation status update
  invite.status = "ACCEPTED";
  await invite.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { group },
      "Joined group successfully"
    )
  );
});
