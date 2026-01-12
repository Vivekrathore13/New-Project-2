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


  const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // return res.status(400).json({ error: "Bad Request", errorMessages: errors.array() });
            throw new ApiError(400, "All fields are required"); 
        }

  // 1️⃣ validate empty fields
  // if (
  //   [fullName, email, password].some(
  //     (field) => !field || field.trim() === ""
  //   )
  // ) {
  //   throw new ApiError(400, "All fields are required");
  // }

  // 2️⃣ check existing user by email or username
  const existedUser = await User.findOne({ email: email.toLowerCase() });

  if (existedUser) {
    throw new ApiError(
      409,
      "User with this email or username already exists"
    );
  }

  // 3️⃣ assume avatar & coverImage uploaded earlier through multer / cloudinary



  // 4️⃣ create user in DB
  const user = await User.create({
     fullName :req.body.fullName?.trim(),
     email : req.body.email?.trim().toLowerCase(),
     password :req.body.password?.trim(),
   
  });

  // 5️⃣ remove sensitive fields before sending response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while registering the user"
    );
  }

  // 6️⃣ final response
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
  // hi this is my new file
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



export { loginUser,registerUser,refreshAcessToken};
