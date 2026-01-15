import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validationResult } from "express-validator";
import jwt from 'jsonwebtoken'
import mongoose  from "mongoose";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}
// REGISTER USER CONTROLLER
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  // ✅ express-validator errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, errors.array()[0].msg);
  }

  // ✅ check required fields (extra safety)
  if (![fullName, email, password].every(Boolean)) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ check existing user
  const existedUser = await User.findOne({ email: email.toLowerCase() });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // ✅ create user
  const user = await User.create({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    password: password.trim(),
  });

  // ✅ remove sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});



const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1) validate input
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // 2) find user
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3) check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // 4) generate tokens
  const { accessToken, refreshToken } =
    await generateAccessAndRefereshTokens(user._id);

  // 5) exclude sensitive fields
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 6) cookie options
  const options = {
    httpOnly: true,
    secure: false, sameSite: "lax",

  };
  // 7) send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const refreshAcessToken = asyncHandler(async (req, res) => {
 
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

     console.log("incomingRefreshToken =>", incomingRefreshToken);
console.log("type =>", typeof incomingRefreshToken);


  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select("+refreshToken");

if (!user) {
  throw new ApiError(401, "Invalid refresh token");
}

if (incomingRefreshToken !== user.refreshToken) {
  throw new ApiError(401, "Refresh token is expired or used");
}


    const options = {
      httpOnly: true,
      secure: false,     // ✅ dev mode
      sameSite: "lax"
    };

    // ✅ generate new pair
    const { accessToken, refreshToken: newrefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed successfully"
        )
      );

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

 const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized User");
  }

  // ✅ DB refreshToken clear
  await User.findByIdAndUpdate(
    userId,
    { $unset: { refreshToken: 1 } }, // or refreshToken: ""
    { new: true }
  );

  // ✅ Clear cookies
  const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully ✅"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { fullName } = req.body;

  if (!userId) throw new ApiError(401, "Unauthorized");

  if (!fullName || !fullName.trim()) {
    throw new ApiError(400, "Full name is required");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { fullName: fullName.trim() },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully ✅"));
});


export { loginUser,registerUser,refreshAcessToken,logoutUser,updateProfile};
