import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { HelmetProvider } from "react-helmet-async";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardLoader from "./components/layout/DashboardLoader";

// Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));

// Admin Dashboard Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ProductManagement = lazy(() => import("./pages/admin/ProductManagement"));
const ServiceGroupManagement = lazy(() => import("./pages/admin/ServiceGroupManagement"));
const ProductTypeManagement = lazy(() => import("./pages/admin/ProductTypeManagement"));
const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const JobManagement = lazy(() => import("./pages/admin/JobManagement"));
const MetadataManagement = lazy(() => import("./pages/admin/MetadataManagement"));
const SupportTicketManagement = lazy(() => import("./pages/admin/SupportTicketManagement"));
const CommunicationModule = lazy(() => import("./pages/admin/CommunicationModule"));
const LeadManagement = lazy(() => import("./pages/admin/LeadManagement"));
const MAKLeadManagement = lazy(() => import("./pages/admin/MAKLeadManagement"));
const MAKEventManagement = lazy(() => import("./pages/admin/MAKEventManagement"));
const MessageTemplates = lazy(() => import("./pages/admin/MessageTemplates"));
const MasterReport = lazy(() => import("./pages/admin/MasterReport"));
const AttendanceManagement = lazy(() => import("./pages/admin/AttendanceManagement"));
const OfficeSettings = lazy(() => import("./pages/admin/OfficeSettings"));
const TaskBoard = lazy(() => import("./pages/admin/TaskBoard"));
const ERPreports = lazy(() => import("./pages/admin/ERPreports"));
const PayrollManagement = lazy(() => import("./pages/admin/PayrollManagement"));
const LocationManagement = lazy(() => import("./pages/admin/LocationManagement"));
const BlogManagement = lazy(() => import("./pages/admin/BlogManagement"));
const OfferLetterManagement = lazy(() => import("./pages/admin/OfferLetterManagement"));

// User Dashboard Pages
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const MyOrders = lazy(() => import("./pages/user/MyOrders"));
const OrderDetail = lazy(() => import("./pages/user/OrderDetail"));
const MyDocuments = lazy(() => import("./pages/user/MyDocuments"));
const Support = lazy(() => import("./pages/user/Support"));
const Security = lazy(() => import("./pages/user/Security"));

const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false, onlyAdmin = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <DashboardLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;

  if (superAdminOnly && user.role !== "super_admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (onlyAdmin && !["admin", "super_admin"].includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (adminOnly && user.role === "user") {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
};

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <DashboardLoader />;
  if (!user || !user.token || isTokenExpired(user.token)) {
    return <Navigate to="/auth/login" replace />;
  }
  if (["admin", "super_admin", "employee"].includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/user/dashboard" replace />;
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Suspense fallback={<DashboardLoader />}>
              <Routes>
                {/* Root → login or dashboard */}
                <Route path="/" element={<RootRedirect />} />

                {/* Auth Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/change-password" element={<ChangePassword />} />

                {/* Admin ERP Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="products" element={<ProductManagement />} />
                  <Route path="groups" element={<ServiceGroupManagement />} />
                  <Route path="types" element={<ProductTypeManagement />} />
                  <Route path="orders" element={<OrderManagement />} />
                  <Route path="leads" element={<LeadManagement />} />
                  <Route path="mak-leads" element={<MAKLeadManagement />} />
                  <Route path="mak-events" element={<MAKEventManagement />} />
                  <Route path="templates" element={<MessageTemplates />} />
                  <Route path="master-report" element={<MasterReport />} />
                  <Route path="users" element={<ProtectedRoute onlyAdmin><UserManagement /></ProtectedRoute>} />
                  <Route path="jobs" element={<ProtectedRoute onlyAdmin><JobManagement /></ProtectedRoute>} />
                  <Route path="attendance" element={<AttendanceManagement />} />
                  <Route path="office-settings" element={<ProtectedRoute superAdminOnly><OfficeSettings /></ProtectedRoute>} />
                  <Route path="tasks" element={<TaskBoard />} />
                  <Route path="reports" element={<ProtectedRoute onlyAdmin><ERPreports /></ProtectedRoute>} />
                  <Route path="payroll" element={<ProtectedRoute superAdminOnly><PayrollManagement /></ProtectedRoute>} />
                  <Route path="location-tracking" element={<ProtectedRoute superAdminOnly><LocationManagement /></ProtectedRoute>} />
                  <Route path="blogs" element={<BlogManagement />} />
                  <Route path="metadata" element={<MetadataManagement />} />
                  <Route path="support" element={<SupportTicketManagement />} />
                  <Route path="communication" element={<CommunicationModule />} />
                  <Route path="cat/:category" element={<div />} />
                  <Route path="security" element={<Security />} />
                  <Route path="offer-letter" element={<ProtectedRoute superAdminOnly><OfferLetterManagement /></ProtectedRoute>} />
                </Route>

                {/* User ERP Routes */}
                <Route
                  path="/user"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<UserDashboard />} />
                  <Route path="profile" element={<UserProfile />} />
                  <Route path="orders" element={<MyOrders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="documents" element={<MyDocuments />} />
                  <Route path="support" element={<Support />} />
                  <Route path="security" element={<Security />} />
                </Route>

                {/* Catch-all → login */}
                <Route path="*" element={<Navigate to="/auth/login" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
