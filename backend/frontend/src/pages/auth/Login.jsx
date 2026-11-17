import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Loader2, Lock, User, Eye, EyeOff, BadgeCheck, IdCard } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { company } from "../../config/company";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isWorkerLogin, setIsWorkerLogin] = useState(false);
  const { login, user: loggedInUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loggedInUser) {
      if (["admin", "super_admin", "employee"].includes(loggedInUser.role)) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/user/dashboard", { replace: true });
      }
    }
  }, [loggedInUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError(isWorkerLogin ? "Please enter your Employee ID." : "Please enter your email address.");
      return;
    }

    if (isWorkerLogin && identifier.includes('@')) {
      setError("Workers must login with Employee ID, not email.");
      return;
    }

    if (!isWorkerLogin && !identifier.includes('@')) {
      setError("Admins must login with email address.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(identifier, password);
      if (["admin", "super_admin", "employee"].includes(user.role)) {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundImage: "url('/authbg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}
    >
      <Helmet>
        <title>Login — {company.name}</title>
        <meta name="description" content={`Sign in to ${company.name} ERP dashboard`} />
      </Helmet>

      {/* Optional dark overlay for better contrast if authbg is bright */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card bg-white/95 backdrop-blur-xl border border-white/20 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl">

          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <img src="/logo.png" alt={company.name} className="h-16 object-contain drop-shadow-sm" />
            </div>

            <p className="text-sm mt-1.5 text-slate-500 font-medium">
              Sign in to your dashboard
            </p>
          </div>

          {/* Login Mode Toggle */}
          <div className="mb-6 p-1 bg-slate-100 rounded-lg flex">
            <button
              type="button"
              onClick={() => { setIsWorkerLogin(false); setError(""); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                !isWorkerLogin
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BadgeCheck size={14} className="inline mr-1.5" /> Admin Login
            </button>
            <button
              type="button"
              onClick={() => { setIsWorkerLogin(true); setError(""); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                isWorkerLogin
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <IdCard size={14} className="inline mr-1.5" /> Worker Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isWorkerLogin ? "Employee ID" : "Email Address"}
              </label>
              <div className="relative">
                {isWorkerLogin ? (
                  <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                ) : (
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <input
                  required
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isWorkerLogin ? "EMP001" : "name@company.com"}
                  className="erp-input pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                  autoComplete={isWorkerLogin ? "off" : "email"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="erp-input pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs font-semibold p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 shadow-lg shadow-blue-500/30">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
            </button>

            <div className="text-center mt-5">
              <Link
                to="/auth/forgot-password"
                className="text-xs font-semibold hover:underline text-blue-600 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </form>

          <div className="mt-8 pt-6 text-center border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account?{" "}
              <Link to="/auth/signup" className="font-semibold text-blue-600 hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] mt-6 text-white/80 font-medium tracking-wide drop-shadow-md">
          {company.copyright}
        </p>
      </div>
    </div>
  );
};

export default Login;