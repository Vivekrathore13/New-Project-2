import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app =express()

import userrouter from './routes/user.routes.js'
import grouprouter from "./routes/group.routes.js"
import expenserouter from "./routes/expense.routes.js"
import  settlementrouter  from "./routes/settlement.routes.js"
import notificationrouter from "./routes/notification.routes.js"
import summaryRoutes from "./routes/summary.routes.js";

app.use(cors(
  {
    origin:process.env.CORS_ORIGIN,
    credentials:true
  }
));

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true ,limit:"16kb"}))
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api",userrouter)
app.use("/api",grouprouter)
app.use("/api",expenserouter)
app.use("/api",settlementrouter)
app.use("/api/notifications", notificationrouter)
app.use("/api", summaryRoutes);

export {app}