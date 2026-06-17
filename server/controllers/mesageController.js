import User from '../models/User.js';
import Message from '../models/message.js';
import cloudinary from '../lib/cloudinary.js';
import { io, userSocketMap } from '../server.js'

// Get all users except the looged in user

export const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

        // count number of messages not seen
        const unseenMessages = {}
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({ senderId: user._id, receiverId: userId, seen: false })
            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        })

        await Promise.all(promises)

        res.json({ success: true, users: filteredUsers, unseenMessages });
    } catch (error) {
        console.log("Get user for sidebar controller error", error.message);
        res.json({ success: false, message: error.message });
    }
}

// get all messages for selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        // find all messages between selected user and me
        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        })
        await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });

        res.json({ success: true, messages });
    } catch (error) {
        console.log("Get messages controller error", error.message);
        res.json({ success: false, message: error.message });
    }
}

// api to make message seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true }, { new: true });
        res.json({ success: true });
    } catch (error) {
        console.log("Mark message as seen controller error", error.message);
        res.json({ success: false, message: error.message });
    }
}

// send message to selected user
export const sendMessage = async (req, res) => {
    try {

        const { text, image } = req.body;

        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        // handle media upload
        let mediaUrl = null;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image, { resource_type: "image" });
            mediaUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text: text || "",
            image: mediaUrl
        })
        // Emit the new mesage to the receiver's socket
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        console.log("Saved Message:", newMessage);
        res.json({ success: true, newMessage });

    } catch (error) {
        console.log("Send message controller error", error.message);
        res.json({ success: false, message: error.message });
    }
}
