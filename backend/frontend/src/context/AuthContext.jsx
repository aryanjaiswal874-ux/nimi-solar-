import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper to check if token is expired
const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("sbgm_user");
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);

                    // Check if access token is expired but refresh token exists
                    if (parsedUser.token && isTokenExpired(parsedUser.token) && parsedUser.refreshToken) {
                        // Try to refresh the token
                        try {
                            const response = await API.post("/auth/refresh", {
                                refreshToken: parsedUser.refreshToken
                            });

                            const { token: newAccessToken, refreshToken: newRefreshToken, user: updatedUser } = response.data;
                            const updatedUserData = { ...parsedUser, ...updatedUser, token: newAccessToken, refreshToken: newRefreshToken };
                            localStorage.setItem("sbgm_user", JSON.stringify(updatedUserData));
                            setUser(updatedUserData);
                        } catch (refreshError) {
                            // Refresh failed, clear auth state
                            console.log("Token refresh failed, clearing auth state");
                            localStorage.removeItem("sbgm_user");
                            setUser(null);
                        }
                    } else if (parsedUser.token && !isTokenExpired(parsedUser.token)) {
                        // Token is still valid
                        setUser(parsedUser);
                    } else {
                        // No valid token
                        localStorage.removeItem("sbgm_user");
                        setUser(null);
                    }
                } catch (e) {
                    console.error("Auth init error:", e);
                    localStorage.removeItem("sbgm_user");
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const { data } = await API.post("/auth/login", { email, password });
            const userData = {
                ...data,
                name: data.full_name
            };
            setUser(userData);
            localStorage.setItem("sbgm_user", JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error("Login failed detailed error:", error);
            throw new Error(error.response?.data?.message || "Login failed");
        }
    }, []);

    const register = useCallback(async (details) => {
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
    }, []);

    const logout = useCallback(async () => {
        try {
            // Call backend logout endpoint for cleanup
            await API.post("/auth/logout");
        } catch (error) {
            console.error("Backend logout failed:", error);
            // Continue with local logout even if backend call fails
        }
        setUser(null);
        localStorage.removeItem("sbgm_user");
    }, []);

    // Helper to update local user state (e.g. after profile update)
    const updateUserState = useCallback((newUser) => {
        const updated = { ...user, ...newUser, name: newUser.full_name || user.name };
        setUser(updated);
        localStorage.setItem("sbgm_user", JSON.stringify(updated));
    }, [user]);

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
