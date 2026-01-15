import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  getDashboardSummary,
} from "../controllers/summary.controllers.js";

const router = Router();

router.use(verifyJWT);

// ✅ dashboard summary
router.get("/dashboard/summary", getDashboardSummary);


export default router;
