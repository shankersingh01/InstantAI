"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Email verification states
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");

    if (name === "password") {
      const strength = {
        score: 0,
        hasMinLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSpecialChar: /[^A-Za-z0-9]/.test(value),
      };

      if (strength.hasMinLength) strength.score += 1;
      if (strength.hasUppercase) strength.score += 1;
      if (strength.hasLowercase) strength.score += 1;
      if (strength.hasNumber) strength.score += 1;
      if (strength.hasSpecialChar) strength.score += 1;

      setPasswordStrength(strength);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6).split("");
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      return;
    }

    if (value.match(/^[0-9]$/) || value === "") {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value !== "" && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && index > 0 && otp[index] === "") {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate form
      if (
        !formData.name ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        throw new Error("Please fill in all fields");
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address");
      }

      // Password validation
      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Password match validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Terms agreement validation
      if (!agreeToTerms) {
        throw new Error("You must agree to the terms and conditions");
      }

      // Make API call to register
      let response;
      try {
        response = await axiosInstance.post("/signup/set-password", {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
      } catch (err) {
        // If user is already verified, show error and do not proceed to OTP
        if (err.response?.data?.detail === "User already verified") {
          setError(
            "User already verified. Please log in or use a different email."
          );
          setLoading(false);
          return;
        } else {
          throw err;
        }
      }

      if (response && response.status === 200) {
        setSuccess("Account created successfully! Please verify your email.");
        setShowVerification(true);
        setTimerActive(true);

        // Start the timer
        const timer = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timer);
              setTimerActive(false);
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);

        // Request OTP
        try {
          const otpResponse = await axiosInstance.post("/signup/request-otp", {
            email: formData.email,
          });
          if (otpResponse.status === 200) {
            setSuccess("Verification code sent to your email");
            console.log("OTP (for testing):", otpResponse.data.otp); // Remove in production
          }
        } catch (otpError) {
          // If user is already verified at this stage, show error and do not show OTP UI
          if (otpError.response?.data?.detail === "User already verified") {
            setShowVerification(false);
            setError(
              "User already verified. Please log in or use a different email."
            );
            return;
          }
          console.error("Error sending OTP:", otpError);
          setError("Failed to send verification code. Please try again.");
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setOtpError("Please enter all 6 digits");
      return;
    }

    setVerifying(true);
    setOtpError("");
    setSuccess("");

    try {
      const response = await axiosInstance.post("/signup/verify-otp", {
        email: formData.email,
        otp: otpValue,
      });

      if (response.status === 200) {
        setVerified(true);
        setSuccess("Email verified successfully! Redirecting to login...");

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      setOtpError(
        error.response?.data?.detail ||
          "Failed to verify OTP. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setTimeLeft(300);
    setTimerActive(true);

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          setTimerActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    try {
      const response = await axiosInstance.post("/signup/request-otp", {
        email: formData.email,
      });
      if (response.status === 200) {
        setSuccess("New verification code sent to your email");
        console.log("New OTP (for testing):", response.data.otp); // Remove in production
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      setError("Failed to resend verification code. Please try again.");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            sign in to your account
          </Link>
        </p>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <motion.div
              className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div
              className="mb-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle
                    className="h-5 w-5 text-green-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {success}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {!showVerification ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Full name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                {/* Password Strength Indicator UI */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Password strength:
                      </div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {(() => {
                          const score = passwordStrength.score;
                          if (score <= 2) return "Weak";
                          if (score <= 3) return "Fair";
                          if (score <= 4) return "Good";
                          return "Strong";
                        })()}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                      <div
                        className={`h-1.5 rounded-full ${(() => {
                          const score = passwordStrength.score;
                          if (score <= 2) return "bg-red-500";
                          if (score <= 3) return "bg-yellow-500";
                          if (score <= 4) return "bg-green-400";
                          return "bg-green-500";
                        })()}`}
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <ul className="space-y-1 mt-2">
                      <li className="text-xs flex items-center">
                        <span
                          className={`mr-1 ${
                            passwordStrength.hasMinLength
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {passwordStrength.hasMinLength ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            passwordStrength.hasMinLength
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          At least 8 characters
                        </span>
                      </li>
                      <li className="text-xs flex items-center">
                        <span
                          className={`mr-1 ${
                            passwordStrength.hasUppercase
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {passwordStrength.hasUppercase ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            passwordStrength.hasUppercase
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          At least one uppercase letter
                        </span>
                      </li>
                      <li className="text-xs flex items-center">
                        <span
                          className={`mr-1 ${
                            passwordStrength.hasLowercase
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {passwordStrength.hasLowercase ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            passwordStrength.hasLowercase
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          At least one lowercase letter
                        </span>
                      </li>
                      <li className="text-xs flex items-center">
                        <span
                          className={`mr-1 ${
                            passwordStrength.hasNumber
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {passwordStrength.hasNumber ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            passwordStrength.hasNumber
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          At least one number
                        </span>
                      </li>
                      <li className="text-xs flex items-center">
                        <span
                          className={`mr-1 ${
                            passwordStrength.hasSpecialChar
                              ? "text-green-500"
                              : "text-gray-400"
                          }`}
                        >
                          {passwordStrength.hasSpecialChar ? "✓" : "○"}
                        </span>
                        <span
                          className={
                            passwordStrength.hasSpecialChar
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          At least one special character
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm ${
                      formData.password &&
                      formData.confirmPassword &&
                      formData.password !== formData.confirmPassword
                        ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="terms"
                  className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                >
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Terms and Conditions
                  </Link>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="-ml-1 mr-2 h-4 w-4" />
                      Create account
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Verify your email
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  We&apos;ve sent a verification code to {formData.email}
                </p>
              </div>

              <div className="flex justify-between space-x-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={verifying || verified}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {otpError}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {timerActive ? (
                    <span>
                      Code expires in:{" "}
                      <span className="font-medium">
                        {formatTime(timeLeft)}
                      </span>
                    </span>
                  ) : (
                    <span>Code expired</span>
                  )}
                </div>

                {!timerActive && (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otp.join("").length !== 6 || verifying || verified}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  "Verify email"
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
