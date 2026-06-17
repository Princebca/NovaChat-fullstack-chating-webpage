import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcryptjs from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Sign Up a new user
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.json({ success: false, message: "All fields are required" });
        }

        const user = await User.findOne({ email });

        if (user) {
            return res.json({ success: false, message: "User already exists" });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio
        });

        const token = generateToken(newUser._id);

        res.json({ success: true, userData: newUser, token, message: "Account created successfully" });

    } catch (error) {
        console.log("Signup controller error:", error.message);
        return res.json({ success: false, message: error.message });
    }
}

// controller to login user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });

        if (!userData) {
            return res.json({ success: false, message: "User not found" });
        }

        const isPasswordValid = await bcryptjs.compare(password, userData.password);

        if (!isPasswordValid) {
            return res.json({ success: false, message: "Invalid password" });
        }

        const token = generateToken(userData._id);

        res.json({ success: true, userData, token, message: "Login successful" });

    } catch (error) {
        console.log("Login controller error:", error.message);
        return res.json({ success: false, message: error.message });
    }
}

// controller to check if user is authenticated
export const checkAuth = (req, res) => {
    return res.json({ success: true, message: "Authenticated", user: req.user })
}

// Controller to update user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;

        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId, { bio, fullName }, { new: true });

        } else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(userId, { profilePic: upload.secure_url, bio, fullName }, { new: true });
        }

        res.json({ success: true, updatedUser, message: "Profile updated successfully" });
    } catch (error) {
        console.log("Update profile controller error:", error.message);
        res.json({ success: false, message: error.message });
    }
}