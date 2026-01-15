import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  getDashboardSummary,getGroupSummary 
} from "../controllers/summary.controllers.js";

const router = Router();

router.use(verifyJWT);

// ✅ dashboard summary
router.get("/dashboard/summary", getDashboardSummary);

router.get("/groups/:groupId/summary", getGroupSummary);

export default router;
