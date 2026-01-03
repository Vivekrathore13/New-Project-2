import mongoose from "mongoose";
import { db_name } from "../constants.js";


const connectDB= async () => {
    try {
      const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${db_name}`)
      console.log(`\n MongoDB connected !! DB HOST:${connectionInstance.connection.host}`)
    } catch (error) {
      console.log("MONGODB connection Failed",error);
      process.exit(1)
    }

}

export default connectDB