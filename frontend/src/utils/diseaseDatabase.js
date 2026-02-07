/**
 * Disease Knowledge Base
 *
 * Local reference data for crop diseases, mirroring the backend diseases.json.
 * Used by the AI model layer to map detected class indices to full disease
 * information (name, treatment, dosage, cost, prevention tips).
 *
 * Each entry's `classIndex` corresponds to the output neuron index of the
 * TensorFlow.js classification model. When no real model is loaded the
 * mock inference layer selects entries from this database based on a
 * hash of the uploaded image data.
 */

const DISEASE_DATABASE = [
  {
    classIndex: 0,
    disease_name: "Paddy Blast",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u092C\u094D\u0932\u093E\u0938\u094D\u091F",
    crop_type: "Paddy",
    symptoms:
      "Spindle-shaped lesions on leaves with brown centers and gray margins. Lesions appear on leaf blades, leaf sheaths, nodes, and panicles. Severe infection causes leaf drying and panicle blast.",
    affected_stages: "Tillering, Flowering, Panicle Initiation",
    treatment_chemical:
      "Tricyclazole 75% WP @ 0.6g/l or Isoprothiolane 40% EC @ 1.5ml/l or Carbendazim 50% WP @ 0.5g/l",
    treatment_organic:
      "Neem oil spray (5ml/l), proper drainage, avoid excess nitrogen, use resistant varieties like IR64, Swarna",
    dosage: "0.6g per liter of water, spray 2-3 times at 10-15 day intervals",
    cost_per_acre: 500,
    prevention_tips:
      "Use resistant varieties, maintain proper spacing, avoid excess nitrogen fertilizer, ensure good drainage, remove infected plant debris",
  },
  {
    classIndex: 1,
    disease_name: "Brown Spot of Paddy",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u092D\u0942\u0930\u093E \u0927\u092C\u094D\u092C\u093E",
    crop_type: "Paddy",
    symptoms:
      "Small, circular to oval brown spots on leaves with yellow halos. Spots coalesce to form large patches. Affects grain quality and yield.",
    affected_stages: "Seedling, Tillering, Flowering",
    treatment_chemical:
      "Mancozeb 75% WP @ 2g/l or Propiconazole 25% EC @ 0.5ml/l",
    treatment_organic:
      "Neem seed kernel extract (5%), cow urine spray, proper field sanitation",
    dosage: "2g per liter of water, apply at boot stage and heading stage",
    cost_per_acre: 450,
    prevention_tips:
      "Use certified seeds, maintain proper plant spacing, avoid water stress, remove infected debris",
  },
  {
    classIndex: 2,
    disease_name: "Sheath Blight of Paddy",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u0936\u0940\u0925 \u092C\u094D\u0932\u093E\u0907\u091F",
    crop_type: "Paddy",
    symptoms:
      "Oval or elliptical greenish-gray lesions on leaf sheaths near water level. Lesions enlarge and turn straw-colored with brown margins. Causes lodging.",
    affected_stages: "Tillering, Booting, Heading",
    treatment_chemical:
      "Validamycin 3% L @ 2.5ml/l or Hexaconazole 5% EC @ 1ml/l",
    treatment_organic:
      "Bordeaux mixture (1%), proper water management, avoid dense planting",
    dosage: "2.5ml per liter of water, spray when disease appears",
    cost_per_acre: 600,
    prevention_tips:
      "Maintain proper spacing, avoid waterlogging, use resistant varieties, remove infected stubbles",
  },
  {
    classIndex: 3,
    disease_name: "Bacterial Leaf Blight of Paddy",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u091C\u0940\u0935\u093E\u0923\u0941 \u092A\u0924\u094D\u0924\u0940 \u091D\u0941\u0932\u0938\u093E",
    crop_type: "Paddy",
    symptoms:
      "Water-soaked lesions on leaf margins that turn yellow and then white. Lesions extend along leaf veins. Yellow bacterial ooze appears.",
    affected_stages: "Seedling, Tillering, Flowering",
    treatment_chemical:
      "Streptocycline 100ppm + Copper oxychloride 0.3% or Kasugamycin 2% + Copper hydroxide",
    treatment_organic:
      "Garlic extract (5%), neem oil spray, proper drainage",
    dosage: "100g streptocycline + 1.5kg copper oxychloride per hectare",
    cost_per_acre: 550,
    prevention_tips:
      "Use disease-free seeds, avoid overhead irrigation, maintain proper spacing, remove infected plants",
  },
  {
    classIndex: 4,
    disease_name: "Wheat Rust",
    disease_name_hindi: "\u0917\u0947\u0939\u0942\u0902 \u0915\u093E \u0930\u0938\u094D\u091F",
    crop_type: "Wheat",
    symptoms:
      "Orange-brown pustules on leaves, stems, and glumes. Pustules rupture to release powdery spores. Severe infection causes leaf drying.",
    affected_stages: "Tillering, Heading, Grain Filling",
    treatment_chemical:
      "Propiconazole 25% EC @ 0.5ml/l or Tebuconazole 25% EC @ 0.5ml/l",
    treatment_organic:
      "Neem oil spray, use resistant varieties, avoid late sowing",
    dosage: "0.5ml per liter of water, spray at first appearance",
    cost_per_acre: 480,
    prevention_tips:
      "Use resistant varieties, timely sowing, avoid excess nitrogen, monitor fields regularly",
  },
  {
    classIndex: 5,
    disease_name: "Powdery Mildew of Wheat",
    disease_name_hindi: "\u0917\u0947\u0939\u0942\u0902 \u0915\u093E \u091A\u0942\u0930\u094D\u0923\u0940 \u0906\u0938\u093F\u0924\u093E",
    crop_type: "Wheat",
    symptoms:
      "White powdery fungal growth on upper leaf surface. Leaves turn yellow and dry. Reduces photosynthesis and grain filling.",
    affected_stages: "Tillering, Booting, Heading",
    treatment_chemical:
      "Sulfur 80% WP @ 2.5g/l or Triadimefon 25% WP @ 0.5g/l",
    treatment_organic:
      "Milk spray (10%), baking soda spray (0.5%), proper spacing",
    dosage: "2.5g per liter of water, spray at disease onset",
    cost_per_acre: 400,
    prevention_tips:
      "Use resistant varieties, avoid dense planting, ensure good air circulation, balanced fertilization",
  },
  {
    classIndex: 6,
    disease_name: "Cotton Leaf Curl Virus",
    disease_name_hindi: "\u0915\u092A\u093E\u0938 \u0915\u093E \u092A\u0924\u094D\u0924\u093E \u092E\u0930\u094B\u0921\u093C",
    crop_type: "Cotton",
    symptoms:
      "Upward or downward curling of leaves with vein thickening. Enations appear on underside of leaves. Stunted growth and reduced yield.",
    affected_stages: "Vegetative, Flowering, Boll Formation",
    treatment_chemical:
      "Imidacloprid 17.8% SL @ 0.3ml/l for whitefly vector control",
    treatment_organic:
      "Neem oil spray, yellow sticky traps, remove infected plants early",
    dosage: "0.3ml per liter of water, spray every 15 days",
    cost_per_acre: 700,
    prevention_tips:
      "Use resistant varieties (Bt cotton), control whitefly vectors, avoid late sowing, maintain field hygiene",
  },
  {
    classIndex: 7,
    disease_name: "Late Blight of Potato",
    disease_name_hindi: "\u0906\u0932\u0942 \u0915\u093E \u0905\u0917\u0947\u0924\u0940 \u0905\u0902\u0917\u092E\u093E\u0930\u0940",
    crop_type: "Potato",
    symptoms:
      "Water-soaked dark lesions on leaves that rapidly enlarge. White fungal growth on underside. Tubers show brown rot. Rapid spread in cool, wet weather.",
    affected_stages: "Vegetative, Flowering, Tuber Formation",
    treatment_chemical:
      "Mancozeb 75% WP @ 2g/l or Metalaxyl + Mancozeb @ 2.5g/l",
    treatment_organic:
      "Bordeaux mixture (1%), proper drainage, remove infected plants",
    dosage: "2g per liter of water, spray preventively before disease onset",
    cost_per_acre: 650,
    prevention_tips:
      "Use certified seed, proper spacing, avoid overhead irrigation, destroy volunteer plants",
  },
  {
    classIndex: 8,
    disease_name: "Early Blight of Tomato",
    disease_name_hindi: "\u091F\u092E\u093E\u091F\u0930 \u0915\u093E \u0905\u0917\u0947\u0924\u0940 \u0905\u0902\u0917\u092E\u093E\u0930\u0940",
    crop_type: "Tomato",
    symptoms:
      "Concentric ring patterns (target spots) on older leaves. Leaf yellowing and defoliation. Fruit lesions near stem end.",
    affected_stages: "Seedling, Vegetative, Fruiting",
    treatment_chemical:
      "Mancozeb 75% WP @ 2g/l or Chlorothalonil 75% WP @ 2g/l",
    treatment_organic:
      "Neem oil spray, Trichoderma application, crop rotation, mulching",
    dosage: "2g per liter of water, spray every 10-14 days",
    cost_per_acre: 550,
    prevention_tips:
      "Crop rotation, proper spacing, mulching, remove infected plant debris, stake plants for air circulation",
  },
  {
    classIndex: 9,
    disease_name: "Sugarcane Red Rot",
    disease_name_hindi: "\u0917\u0928\u094D\u0928\u093E \u0915\u093E \u0932\u093E\u0932 \u0938\u0921\u093C\u0928",
    crop_type: "Sugarcane",
    symptoms:
      "Reddening of internal cane tissue with white patches. Crown wilting and drying. Cane becomes hollow and emits alcoholic odour.",
    affected_stages: "Grand Growth, Maturity",
    treatment_chemical:
      "Carbendazim 50% WP sett treatment @ 0.1% or Thiophanate-methyl 70% WP",
    treatment_organic:
      "Hot water treatment of setts (50C for 2 hours), use disease-free setts, crop rotation",
    dosage: "1g per liter for sett dip treatment, 30 minutes before planting",
    cost_per_acre: 350,
    prevention_tips:
      "Use disease-free setts, avoid ratoon of infected crops, proper drainage, crop rotation with non-host crops",
  },
  {
    classIndex: 10,
    disease_name: "Chilli Leaf Curl",
    disease_name_hindi: "\u092E\u093F\u0930\u094D\u091A \u0915\u093E \u092A\u0924\u094D\u0924\u093E \u092E\u0930\u094B\u0921\u093C",
    crop_type: "Chilli",
    symptoms:
      "Upward curling and puckering of leaves. Leaves become thick and leathery. Stunted plant growth and reduced fruit set.",
    affected_stages: "Vegetative, Flowering, Fruiting",
    treatment_chemical:
      "Imidacloprid 17.8% SL @ 0.3ml/l for thrips/whitefly control",
    treatment_organic:
      "Neem oil spray, yellow sticky traps, intercropping with maize",
    dosage: "0.3ml per liter of water, spray every 10-15 days",
    cost_per_acre: 500,
    prevention_tips:
      "Use resistant varieties, control insect vectors, remove infected plants, avoid monoculture",
  },
  {
    classIndex: 11,
    disease_name: "Downy Mildew of Maize",
    disease_name_hindi: "\u092E\u0915\u094D\u0915\u093E \u0915\u093E \u092E\u0943\u0926\u0941 \u0906\u0938\u093F\u0924\u093E",
    crop_type: "Maize",
    symptoms:
      "Chlorotic streaks on leaves running parallel to veins. Downy white fungal growth on lower leaf surface. Stunted growth and tassel malformation.",
    affected_stages: "Seedling, Vegetative",
    treatment_chemical:
      "Metalaxyl 35% WS @ 6g/kg seed treatment or Mancozeb 75% WP @ 2.5g/l spray",
    treatment_organic:
      "Seed treatment with Trichoderma, crop rotation, remove infected plants",
    dosage: "6g per kg of seed for treatment, or 2.5g/l for foliar spray",
    cost_per_acre: 420,
    prevention_tips:
      "Use resistant hybrids, seed treatment, avoid waterlogging, crop rotation with non-host crops",
  },
  {
    classIndex: 12,
    disease_name: "Onion Purple Blotch",
    disease_name_hindi: "\u092A\u094D\u092F\u093E\u091C \u0915\u093E \u092C\u0948\u0902\u0917\u0928\u0940 \u0927\u092C\u094D\u092C\u093E",
    crop_type: "Onion",
    symptoms:
      "Purple-brown lesions on leaves with concentric rings. Lesions enlarge and coalesce. Leaves dry and collapse from tips.",
    affected_stages: "Vegetative, Bulb Formation",
    treatment_chemical:
      "Mancozeb 75% WP @ 2.5g/l or Chlorothalonil 75% WP @ 2g/l",
    treatment_organic:
      "Neem oil spray, Trichoderma application, proper spacing for air circulation",
    dosage: "2.5g per liter of water, spray every 10-15 days",
    cost_per_acre: 480,
    prevention_tips:
      "Use disease-free sets, proper drainage, avoid overhead irrigation, crop rotation",
  },
  {
    classIndex: 13,
    disease_name: "Healthy Plant",
    disease_name_hindi: "\u0938\u094D\u0935\u0938\u094D\u0925 \u092A\u094C\u0927\u093E",
    crop_type: "All",
    symptoms: "No disease symptoms detected. The plant appears healthy with normal growth.",
    affected_stages: "N/A",
    treatment_chemical: "No treatment required.",
    treatment_organic: "Continue regular care and monitoring.",
    dosage: "N/A",
    cost_per_acre: 0,
    prevention_tips:
      "Maintain balanced fertilization, ensure proper irrigation, monitor regularly for early detection of any disease",
  },
];

/**
 * Total number of classes the model can predict.
 */
export const NUM_CLASSES = DISEASE_DATABASE.length;

/**
 * Look up a disease entry by its class index.
 *
 * @param {number} classIndex - Model output neuron index.
 * @returns {Object|null} Disease record or null.
 */
export function getDiseaseByClassIndex(classIndex) {
  return DISEASE_DATABASE.find((d) => d.classIndex === classIndex) || null;
}

/**
 * Look up a disease entry by name (case-insensitive).
 *
 * @param {string} name - Disease name in English.
 * @returns {Object|null} Disease record or null.
 */
export function getDiseaseByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return DISEASE_DATABASE.find(
    (d) => d.disease_name.toLowerCase() === lower,
  ) || null;
}

/**
 * Get all diseases for a given crop type.
 *
 * @param {string} cropType - Crop type string (e.g. "Paddy").
 * @returns {Array<Object>} Matching disease records.
 */
export function getDiseasesByCrop(cropType) {
  if (!cropType) return [];
  const lower = cropType.toLowerCase();
  return DISEASE_DATABASE.filter(
    (d) => d.crop_type.toLowerCase() === lower || d.crop_type === "All",
  );
}

/**
 * Get the complete disease database.
 *
 * @returns {Array<Object>} All disease records.
 */
export function getAllDiseases() {
  return DISEASE_DATABASE;
}

export default DISEASE_DATABASE;
