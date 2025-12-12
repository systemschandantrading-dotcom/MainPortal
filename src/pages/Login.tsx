import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";

const Login = () => {
  const [userId, setUserId] = useState(""); // Changed from username to userId
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    clearError();

    // Basic validation
    if (!userId.trim() || !password.trim()) {
      toast.error("Please enter both User ID and password");
      return;
    }

    try {
      const success = await login(userId, password); // Pass userId instead of username
      
      if (success) {
        // Get the user info after login
        const loggedInUser = useAuthStore.getState().user;
        
        // Redirect based on role
        if (loggedInUser?.role?.toLowerCase() === "admin") {
          navigate("/master", { state: { showSuccessModal: true } });
        } else {
          navigate("/", { state: { showSuccessModal: true } });
        }
        
        toast.success("Login successful!");
      } else {
        // Error message will be set by the store
        if (error) {
          toast.error(error);
        } else {
          toast.error("Invalid User ID or password");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="max-w-md w-full space-y-8 relative">
        {/* Main card */}
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-gray-100 transform transition-all duration-300 hover:shadow-indigo-100">
          {/* Header section */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-indigo-300">
                  <span className="text-white font-bold text-lg">CT</span>
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">
              Main Portal
            </h2>
            <p className="text-gray-600 font-medium">
              Chandan Trading
            </p>
          </div>

          {/* Form section */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            {/* User ID field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User
                    className={`h-5 w-5 transition-all duration-200 ${
                      focusedField === "userId"
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onFocus={() => setFocusedField("userId")}
                  onBlur={() => setFocusedField(null)}
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="Enter your User ID"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 transition-all duration-200 ${
                      focusedField === "password"
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="block w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-indigo-600 transition-colors duration-200" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-indigo-600 transition-colors duration-200" />
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white transition-all duration-200 transform shadow-lg hover:shadow-xl ${
                  loading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="text-center pt-1">
              <p className="text-sm text-gray-500">
                Powered by{" "}
                <span className="font-bold text-gray-700">Botivate</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;