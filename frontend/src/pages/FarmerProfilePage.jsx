/**
 * FarmerProfilePage - User profile management page.
 *
 * Allows the logged-in user to:
 * - View their profile information
 * - Edit their name
 * - Add/remove crops (max 2)
 *
 * Only accessible to logged-in users.
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

import { Input, Button, Card, Select, LoadingSpinner } from "@components/common";
import { useAuth } from "@context/AuthContext";
import { updateProfile } from "@services/authApi";
import { getCommodities } from "@services/apmcApi";
import { ROUTES } from "@utils/constants";

// Animation variants
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// Profile Edit Form Component
function ProfileEditForm({
  formData,
  setFormData,
  errors,
  setErrors,
  loading,
  commodities,
  commoditiesLoading,
  selectedCrop,
  setSelectedCrop,
  onSubmit,
  onAddCrop,
  onRemoveCrop,
}) {
  const handleNameChange = useCallback(
    (e) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
      setErrors((prev) => ({ ...prev, name: null }));
    },
    [setFormData, setErrors]
  );

  const availableCropOptions = commodities
    .filter((crop) => !formData.crops.includes(crop))
    .map((crop) => ({ value: crop, label: crop }));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Input
        name="name"
        label="Full Name"
        type="text"
        placeholder="Enter your full name"
        value={formData.name}
        onChange={handleNameChange}
        error={errors.name}
        required
        maxLength={100}
        disabled={loading}
      />

      {/* Crops Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          My Crops (Max 2)
        </label>
        <p className="text-xs text-neutral-500 mb-3">
          Add your crops to see personalized APMC prices on your dashboard
        </p>

        {formData.crops.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.crops.map((crop) => (
              <div
                key={crop}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
              >
                <CheckIcon className="h-4 w-4" />
                {crop}
                <button
                  type="button"
                  onClick={() => onRemoveCrop(crop)}
                  className="ml-1 hover:text-primary-900 focus:outline-none"
                  disabled={loading}
                  aria-label={`Remove ${crop}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {formData.crops.length < 2 && (
          <div className="flex gap-2">
            {commoditiesLoading ? (
              <div className="flex-1 flex items-center justify-center py-2">
                <LoadingSpinner size="sm" message="Loading crops..." />
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <Select
                    name="selectedCrop"
                    placeholder="Select a crop to add"
                    options={availableCropOptions}
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    disabled={loading || availableCropOptions.length === 0}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onAddCrop}
                  disabled={loading || !selectedCrop}
                >
                  Add
                </Button>
              </>
            )}
          </div>
        )}

        {formData.crops.length === 2 && (
          <p className="text-xs text-green-600 mt-2">
            Maximum crops added. Remove one to add a different crop.
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" fullWidth loading={loading}>
        Save Changes
      </Button>
    </form>
  );
}

// Main Component
function FarmerProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({ name: "", crops: [] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("");

  // Commodities
  const [commodities, setCommodities] = useState([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        crops: user.crops || [],
      });
    }
  }, [user]);

  // Fetch commodities
  useEffect(() => {
    async function fetchCommodities() {
      try {
        const data = await getCommodities();
        const commodityList = data.commodities?.map((c) => c.commodity) || [];
        setCommodities(commodityList);
      } catch (error) {
        console.error("Failed to fetch commodities:", error);
      } finally {
        setCommoditiesLoading(false);
      }
    }
    fetchCommodities();
  }, []);

  // Handlers
  const handleAddCrop = useCallback(() => {
    if (!selectedCrop) return;
    if (formData.crops.length >= 2) {
      toast.error("Maximum 2 crops allowed");
      return;
    }
    if (formData.crops.includes(selectedCrop)) {
      toast.error("Crop already added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      crops: [...prev.crops, selectedCrop],
    }));
    setSelectedCrop("");
  }, [selectedCrop, formData.crops]);

  const handleRemoveCrop = useCallback((cropToRemove) => {
    setFormData((prev) => ({
      ...prev,
      crops: prev.crops.filter((crop) => crop !== cropToRemove),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!formData.name || !formData.name.trim()) {
        setErrors({ name: "Name is required" });
        return;
      }
      if (formData.name.trim().length < 2) {
        setErrors({ name: "Name must be at least 2 characters" });
        return;
      }

      setLoading(true);
      try {
        const updatedUser = await updateProfile(user.mobile_number, {
          name: formData.name.trim(),
          crops: formData.crops,
        });
        updateUser(updatedUser);
        toast.success("Profile updated successfully");
      } catch (error) {
        toast.error(error.message || "Failed to update profile");
      } finally {
        setLoading(false);
      }
    },
    [formData, user, updateUser]
  );

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto px-4 py-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          My Profile
        </h1>
        <p className="text-neutral-500">
          Manage your account information and crop preferences
        </p>
      </motion.div>

      {/* Profile Info Card */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <UserIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {user.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-neutral-500 text-sm">
                  <PhoneIcon className="h-4 w-4 shrink-0" />
                  <span>{user.mobile_number}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-500 text-sm">
                  <MapPinIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {user.taluka}, {user.district}, {user.state}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Link to Dashboard */}
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-primary-700">
              View your personalized dashboard
            </span>
            <ArrowRightIcon className="h-4 w-4 text-primary-600" />
          </Link>
        </Card>
      </motion.div>

      {/* Edit Profile Card */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <PencilIcon className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Edit Profile
            </h3>
          </div>

          <ProfileEditForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            loading={loading}
            commodities={commodities}
            commoditiesLoading={commoditiesLoading}
            selectedCrop={selectedCrop}
            setSelectedCrop={setSelectedCrop}
            onSubmit={handleSubmit}
            onAddCrop={handleAddCrop}
            onRemoveCrop={handleRemoveCrop}
          />
        </Card>
      </motion.div>

      {/* Account Info */}
      <motion.div variants={itemVariants} className="mt-6">
        <p className="text-xs text-neutral-400 text-center">
          Account created on{" "}
          {new Date(user.created_at).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default FarmerProfilePage;
