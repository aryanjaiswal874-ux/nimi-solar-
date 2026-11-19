import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5577/api",
});

// Add a request interceptor to include the token in headers
API.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem("sbgm_user"));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear user data and redirect to login
            localStorage.removeItem("sbgm_user");
            window.location.href = "/auth/login";
        }
        return Promise.reject(error);
    }
);

export default API;
