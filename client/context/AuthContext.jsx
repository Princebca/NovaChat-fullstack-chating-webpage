import { createContext, useEffect, useState } from 'react';
import axios from 'axios'
import toast from 'react-hot-toast';
import io from "socket.io-client"

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    // Check if user is authenticated and if so, set the user data and connect the socket
    const checkAuth = async () => {
        try {
            const { data } = await axios.get('/api/auth/check');
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user)
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    }

    // Login Function to handle user authentication and socket conection
    const login = async (state, credentials) => {
        const toastId = toast.loading("Logging in...");
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message || "Logged in successfully");
                
            } else {
                toast.error(data.message);
            }
            toast.dismiss(toastId);
        }catch(error){
            toast.error(error.response.data.message);
        } 
    }

    // Logout Function to handle user disconnection from the socket and remove the token from localStorage
    const logout = async () => {
        try {
            localStorage.removeItem("token");
            setToken(null);
            setAuthUser(null);
            setOnlineUsers([]);
            axios.defaults.headers.common["token"] = null
            socket?.disconnect();
            setSocket(null);
            toast.success("Logged out successfully");
        }catch(error){
            toast.error(error.message);
        }
    }

    // Update Profile function to handle user profle updates
    const updateProfile = async (body) => {
        const toastId = toast.loading("Updating profile...");
        try {
            const { data } = await axios.put('/api/auth/update-profile', body);
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully",data.message);
            } else {
                toast.error(data.message);
            }
            toast.dismiss(toastId);
        }catch(error){
            toast.error(error.response.data.message);
        } 
    }

    // Connect socket function to handle socket connection and online users updates
    const connectSocket = (userData) => {
        if (!userData || socket?.connected) {
            return;
        }
        const newSocket = io(backendUrl, {
            query: {
                userId: userData._id,
            }
        });
        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds)
        })
    }

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['token'] = token;
        }
        checkAuth();
    }, [])

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}