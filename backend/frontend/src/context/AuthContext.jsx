import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("sbgm_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await API.post("/auth/login", { email, password });
            const userData = { ...data, name: data.full_name }; // Map full_name to name if needed by UI
            setUser(userData);
            localStorage.setItem("sbgm_user", JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error("Login failed detailed error:", error);
            throw new Error(error.response?.data?.message || "Login failed");
        }
    };

    const register = async (details) => {
        try {
            const { data } = await API.post("/auth/register", details);
            // Auto-login after registration
            const userData = { ...data, name: data.full_name };
            setUser(userData);
            localStorage.setItem("sbgm_user", JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error("Registration failed:", error.response?.data?.message || error.message);
            throw new Error(error.response?.data?.message || "Registration failed");
        }
    };

    const logout = async () => {
        try {
            // Call backend logout endpoint for cleanup
            await API.post("/auth/logout");
        } catch (error) {
            console.error("Backend logout failed:", error);
            // Continue with local logout even if backend call fails
        }
        setUser(null);
        localStorage.removeItem("sbgm_user");
    };

    // Helper to update local user state (e.g. after profile update)
    const updateUserState = (newUser) => {
        const updated = { ...user, ...newUser, name: newUser.full_name || user.name };
        setUser(updated);
        localStorage.setItem("sbgm_user", JSON.stringify(updated));
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUserState
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
