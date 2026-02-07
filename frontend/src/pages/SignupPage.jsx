/**
 * SignupPage - User registration with profile details.
 *
 * Collects:
 * - Mobile number (unique)
 * - Name
 * - State (dropdown)
 * - District (dropdown, filtered by state)
 * - Taluka (dropdown, filtered by district)
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { PhoneIcon, UserIcon } from "@heroicons/react/24/outline";

import { Input, Button, Card, Select, LoadingSpinner } from "@components/common";
import { useAuth } from "@context/AuthContext";
import { signup, getLocationData } from "@services/authApi";
import { ROUTES } from "@utils/constants";

function SignupPage() {
  const navigate = useNavigate();
  const { loginSuccess, setError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    mobileNumber: "",
    name: "",
    state: "",
    district: "",
    taluka: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationData, setLocationData] = useState({
    states: [],
    districts: {},
    talukas: {},
  });

  // Fetch location data on mount
  useEffect(() => {
    async function fetchLocationData() {
      try {
        const data = await getLocationData();
        setLocationData(data);
      } catch (error) {
        console.error("Failed to fetch location data:", error);
        toast.error("Failed to load location data");
      } finally {
        setLocationLoading(false);
      }
    }
    fetchLocationData();
  }, []);

  // Get available districts based on selected state
  const availableDistricts = formData.state
    ? locationData.districts[formData.state] || []
    : [];

  // Get available talukas based on selected district
  const availableTalukas = formData.district
    ? locationData.talukas[formData.district] || []
    : [];

  const validateField = useCallback((name, value) => {
    switch (name) {
      case "mobileNumber":
        if (!value) return "Mobile number is required";
        if (!/^\d{10,15}$/.test(value)) return "Enter a valid 10-15 digit mobile number";
        return null;
      case "name":
        if (!value || !value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return null;
      case "state":
        if (!value) return "State is required";
        return null;
      case "district":
        if (!value) return "District is required";
        return null;
      case "taluka":
        if (!value) return "Taluka is required";
        return null;
      default:
        return null;
    }
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Only allow digits for mobile number
    if (name === "mobileNumber" && value && !/^\d*$/.test(value)) {
      return;
    }
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Reset dependent fields when parent changes
      if (name === "state") {
        updated.district = "";
        updated.taluka = "";
      } else if (name === "district") {
        updated.taluka = "";
      }
      
      return updated;
    });
    
    setErrors((prev) => ({ ...prev, [name]: null }));
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {
      mobileNumber: validateField("mobileNumber", formData.mobileNumber),
      name: validateField("name", formData.name),
      state: validateField("state", formData.state),
      district: validateField("district", formData.district),
      taluka: validateField("taluka", formData.taluka),
    };

    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await signup({
        mobileNumber: formData.mobileNumber,
        name: formData.name.trim(),
        state: formData.state,
        district: formData.district,
        taluka: formData.taluka,
      });
      
      if (response.success) {
        loginSuccess(response.user, response.token);
        toast.success(`Welcome, ${response.user.name}! Account created successfully.`);
        navigate(ROUTES.HOME);
      }
    } catch (error) {
      const message = error.message || "Signup failed";
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [formData, validateField, loginSuccess, navigate, setError]);

  // Convert arrays to options format for Select component
  const stateOptions = locationData.states.map((state) => ({
    value: state,
    label: state,
  }));

  const districtOptions = availableDistricts.map((district) => ({
    value: district,
    label: district,
  }));

  const talukaOptions = availableTalukas.map((taluka) => ({
    value: taluka,
    label: taluka,
  }));

  if (locationLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-neutral-900">
              Create Account
            </h1>
            <p className="mt-2 text-neutral-600">
              Register to access all features
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

            <Input
              name="name"
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              maxLength={100}
              leadingIcon={<UserIcon className="h-5 w-5" />}
              disabled={loading}
            />

            <Select
              name="state"
              label="State"
              placeholder="Select your state"
              options={stateOptions}
              value={formData.state}
              onChange={handleChange}
              error={errors.state}
              required
              disabled={loading}
            />

            <Select
              name="district"
              label="District"
              placeholder={formData.state ? "Select your district" : "Select state first"}
              options={districtOptions}
              value={formData.district}
              onChange={handleChange}
              error={errors.district}
              required
              disabled={loading || !formData.state}
            />

            <Select
              name="taluka"
              label="Taluka"
              placeholder={formData.district ? "Select your taluka" : "Select district first"}
              options={talukaOptions}
              value={formData.taluka}
              onChange={handleChange}
              error={errors.taluka}
              required
              disabled={loading || !formData.district}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{" "}
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Login
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default SignupPage;
