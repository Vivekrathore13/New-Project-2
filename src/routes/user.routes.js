import express from "express";
import { registerUser, loginUser ,refreshAcessToken } from "../controllers/user.controllers.js";
import { body } from "express-validator";
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const router = express.Router();

router.post(
  "/signup",
  body("fullName", "Full name is required").notEmpty(),
  body("fullName", "Only alphabets allowed")
    .isAlpha("en-US", { ignore: " " }),
  body("email", "Email is required").notEmpty(),
  body("email", "Valid Email Required").isEmail(),
  body("password", "Password is required").notEmpty(),
  registerUser,
);

router.post("/login", loginUser);
router.post("/refresh-token", refreshAcessToken);


export default router;
