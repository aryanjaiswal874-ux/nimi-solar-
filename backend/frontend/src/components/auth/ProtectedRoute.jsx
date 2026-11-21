import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
};

const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Check token validity
    if (!user || !user.token || isTokenExpired(user.token)) {
        // Token missing or expired, but let AuthContext handle refresh attempt
        // If still no valid user after refresh, redirect to login
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (allowedRole && user.role !== allowedRole) {
        // If user tries to access admin, or admin tries to access user (optional restriction)
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
