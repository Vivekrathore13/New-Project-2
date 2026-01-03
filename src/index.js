import mongoose from "mongoose";
import dotenv from "dotenv"
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
  path:'./env'
})

connectDB()
.then(()=>{
  app.listen(`Server is running at port : ${process.env.PORT}`)
})
.catch((err) =>{
  console.log("MONGO db connection Failed !!!",err);
})