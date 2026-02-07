/**
 * LoginPage - User login with mobile number and OTP.
 *
 * Flow:
 * 1. User enters mobile number
 * 2. User clicks "Request OTP" (dummy - always succeeds)
 * 3. User enters OTP (any 4-6 digit code works)
 * 4. User clicks "Login" to authenticate
 */

import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { PhoneIcon, KeyIcon } from "@heroicons/react/24/outline";

import { Input, Button, Card } from "@components/common";
import { useAuth } from "@context/AuthContext";
import { login, requestOtp } from "@services/authApi";
import { ROUTES } from "@utils/constants";

function LoginPage() {
  const navigate = useNavigate();
  const { loginSuccess, setError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    mobileNumber: "",
    otp: "",
  });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const validateMobileNumber = useCallback((value) => {
    if (!value) return "Mobile number is required";
    if (!/^\d{10,15}$/.test(value)) return "Enter a valid 10-15 digit mobile number";
    return null;
  }, []);

  const validateOtp = useCallback((value) => {
    if (!value) return "OTP is required";
    if (!/^\d{4,6}$/.test(value)) return "OTP must be 4-6 digits";
    return null;
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Only allow digits for mobile number and OTP
    if ((name === "mobileNumber" || name === "otp") && value && !/^\d*$/.test(value)) {
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
    clearError();
  }, [clearError]);

  const handleRequestOtp = useCallback(async () => {
    const mobileError = validateMobileNumber(formData.mobileNumber);
    if (mobileError) {
      setErrors({ mobileNumber: mobileError });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await requestOtp(formData.mobileNumber);
      if (response.success) {
        setOtpSent(true);
        toast.success("OTP sent successfully (use any 4-6 digit code)");
      }
    } catch (error) {
      const message = error.message || "Failed to send OTP";
      toast.error(message);
      setError(message);
    } finally {
      setOtpLoading(false);
    }
  }, [formData.mobileNumber, validateMobileNumber, setError]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const newErrors = {
      mobileNumber: validateMobileNumber(formData.mobileNumber),
      otp: validateOtp(formData.otp),
    };

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await login(formData.mobileNumber, formData.otp);
      if (response.success) {
        loginSuccess(response.user, response.token);
        toast.success(`Welcome back, ${response.user.name}!`);
        navigate(ROUTES.HOME);
      }
    } catch (error) {
      const message = error.message || "Login failed";
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [formData, validateMobileNumber, validateOtp, loginSuccess, navigate, setError]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Login with your mobile number
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              name="mobileNumber"
              label="Mobile Number"
              type="tel"
              placeholder="Enter your 10-digit mobile number"
              value={formData.mobileNumber}
              onChange={handleChange}
              error={errors.mobileNumber}
              required
              maxLength={15}
              leadingIcon={<PhoneIcon className="h-5 w-5" />}
              disabled={loading}
            />

            {!otpSent ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                loading={otpLoading}
                onClick={handleRequestOtp}
              >
                Request OTP
              </Button>
            ) : (
              <>
                <Input
                  name="otp"
                  label="OTP"
                  type="text"
                  placeholder="Enter OTP (any 4-6 digits)"
                  value={formData.otp}
                  onChange={handleChange}
                  error={errors.otp}
                  required
                  maxLength={6}
                  leadingIcon={<KeyIcon className="h-5 w-5" />}
                  helperText="For demo: any 4-6 digit code works"
                  disabled={loading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={loading}
                >
                  Login
                </Button>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Resend OTP
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {"Don't have an account? "}
              <Link
                to={ROUTES.SIGNUP}
                className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default LoginPage;
