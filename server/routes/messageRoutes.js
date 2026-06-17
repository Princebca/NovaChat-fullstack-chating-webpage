import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { getUserForSidebar, getMessages, markMessageAsSeen, sendMessage } from "../controllers/mesageController.js";

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUserForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);
messageRouter.post("/send/:id", protectRoute, sendMessage)

export default messageRouter;