import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5577/api",
});

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

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

// Add a response interceptor to handle 401 errors (token expired)
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only handle 401 errors, not 403 (permission denied)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return API(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const user = JSON.parse(localStorage.getItem("sbgm_user"));
            if (user && user.refreshToken) {
                try {
                    const response = await axios.post(
                        `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5577/api"}/auth/refresh`,
                        { refreshToken: user.refreshToken }
                    );

                    const { token: newAccessToken, refreshToken: newRefreshToken, user: updatedUser } = response.data;

                    // Update stored user data
                    const updatedUserData = { ...user, ...updatedUser, token: newAccessToken, refreshToken: newRefreshToken };
                    localStorage.setItem("sbgm_user", JSON.stringify(updatedUserData));

                    // Update authorization header for original request
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    processQueue(null, newAccessToken);
                    return API(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);

                    // Refresh failed - clear user and redirect
                    localStorage.removeItem("sbgm_user");
                    if (window.location.pathname !== "/auth/login") {
                        window.location.href = "/auth/login";
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                // No refresh token available
                isRefreshing = false;
                localStorage.removeItem("sbgm_user");
                if (window.location.pathname !== "/auth/login") {
                    window.location.href = "/auth/login";
                }
                return Promise.reject(error);
            }
        }

        // Don't auto-logout on 403 - that's a permission issue, not auth issue
        return Promise.reject(error);
    }
);

export default API;