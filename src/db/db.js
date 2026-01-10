import mongoose from "mongoose";
import { db_name } from "../constants.js";
import { Group } from "../models/group.model.js"; // ✔️ correct path

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${db_name}`
    );

    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );

    // ⭐⭐⭐ AUTO FIX — runs only after connect
    await Group.syncIndexes();
    console.log("✅ Group indexes synced successfully");
    
  } catch (error) {
    console.log("MONGODB connection Failed", error);
    process.exit(1);
  }
};

export default connectDB;
