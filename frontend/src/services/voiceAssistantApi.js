/**
 * Voice Assistant API client.
 *
 * Sends user messages to the Groq-powered backend endpoint
 * and returns AI-generated conversational responses with
 * real weather/price data.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/voice`;

/**
 * Send a voice/text message to the AI assistant.
 *
 * @param {Object} params
 * @param {string} params.message  - User's voice transcript or typed message.
 * @param {string} [params.language] - 'en' or 'hi'.
 * @param {Object} [params.location] - { state, district, taluka }.
 * @returns {Promise<{ response: string, intent: string, navigate_to: string|null, data: object|null }>}
 */
export async function sendVoiceMessage({ message, language = "en", location = null }) {
  const payload = { message, language };
  if (location && location.taluka) {
    payload.location = {
      state: location.state,
      district: location.district,
      taluka: location.taluka,
    };
  }

  const { data } = await api.post(`${BASE}/chat`, payload);
  return data;
}
