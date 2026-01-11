import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  getGroupBalance,
  getSettlementSuggestions,
  createSettlement,
  getSettlementLogs,
} from "../controllers/settlement.controllers.js";

const router = Router();

// ✅ all routes protected
router.use(verifyJWT);

// balances
router.get("/groups/:groupId/balance", getGroupBalance);

// suggestions
router.get("/groups/:groupId/settlements/suggestions", getSettlementSuggestions);

// create settlement log
router.post("/groups/:groupId/settlements", createSettlement);

// settlement logs
router.get("/groups/:groupId/settlements/logs", getSettlementLogs);

export default router;
