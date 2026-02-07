/**
 * Authentication API Service
 *
 * Provides methods for user authentication operations:
 * - Login with mobile number and OTP
 * - Signup with user details
 * - Request OTP
 * - Get location master data
 */

import api, { API_V1 } from "./api";

const AUTH_ENDPOINTS = {
  LOGIN: `${API_V1}/auth/login`,
  SIGNUP: `${API_V1}/auth/signup`,
  REQUEST_OTP: `${API_V1}/auth/request-otp`,
  LOCATIONS: `${API_V1}/auth/locations`,
  ME: `${API_V1}/auth/me`,
  PROFILE: `${API_V1}/auth/profile`,
};

/**
 * Login with mobile number and OTP.
 *
 * @param {string} mobileNumber - User's mobile number (10-15 digits)
 * @param {string} otp - OTP code (4-6 digits)
 * @returns {Promise<{success: boolean, message: string, user: object, token: string}>}
 */
export async function login(mobileNumber, otp) {
  const response = await api.post(AUTH_ENDPOINTS.LOGIN, {
    mobile_number: mobileNumber,
    otp: otp,
  });
  return response.data;
}

/**
 * Signup a new user.
 *
 * @param {object} userData - User registration data
 * @param {string} userData.mobileNumber - Mobile number (10-15 digits)
 * @param {string} userData.name - User's full name
 * @param {string} userData.state - State name
 * @param {string} userData.district - District name
 * @param {string} userData.taluka - Taluka name
 * @returns {Promise<{success: boolean, message: string, user: object, token: string}>}
 */
export async function signup(userData) {
  const response = await api.post(AUTH_ENDPOINTS.SIGNUP, {
    mobile_number: userData.mobileNumber,
    name: userData.name,
    state: userData.state,
    district: userData.district,
    taluka: userData.taluka,
  });
  return response.data;
}

/**
 * Request OTP for login.
 *
 * @param {string} mobileNumber - User's mobile number
 * @returns {Promise<{success: boolean, message: string, mobile_number: string}>}
 */
export async function requestOtp(mobileNumber) {
  const response = await api.post(AUTH_ENDPOINTS.REQUEST_OTP, {
    mobile_number: mobileNumber,
  });
  return response.data;
}

/**
 * Get location master data for signup dropdowns.
 *
 * @returns {Promise<{states: string[], districts: object, talukas: object}>}
 */
export async function getLocationData() {
  const response = await api.get(AUTH_ENDPOINTS.LOCATIONS);
  return response.data;
}

/**
 * Get current user details.
 *
 * @param {string} mobileNumber - User's mobile number
 * @returns {Promise<object>} User data
 */
export async function getCurrentUser(mobileNumber) {
  const response = await api.get(AUTH_ENDPOINTS.ME, {
    params: { mobile_number: mobileNumber },
  });
  return response.data;
}

/**
 * Update user profile.
 *
 * @param {string} mobileNumber - User's mobile number
 * @param {object} profileData - Profile data to update
 * @param {string} [profileData.name] - New name
 * @param {string[]} [profileData.crops] - Selected crops (max 2)
 * @returns {Promise<object>} Updated user data
 */
export async function updateProfile(mobileNumber, profileData) {
  const response = await api.put(AUTH_ENDPOINTS.PROFILE, profileData, {
    params: { mobile_number: mobileNumber },
  });
  return response.data;
}

export default {
  login,
  signup,
  requestOtp,
  getLocationData,
  getCurrentUser,
  updateProfile,
};
