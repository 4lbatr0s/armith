import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { 
  ID_FIELDS, 
  SELFIE_FIELDS,
  ALL_DOCUMENT_CONDITION_VALUES,
  ALL_LIGHTING_CONDITION_VALUES,
  ALL_FACE_SIZE_VALUES,
  ALL_FACE_COVERAGE_VALUES
} from './constants/fieldNames.js';

// Country-specific ID verification prompts
const ID_PROMPTS = {
  tr: {
    name: 'Turkish Republic ID Card',
    prompt: ChatPromptTemplate.fromMessages([
      new SystemMessage(`You are an AI KYC assistant verifying a Turkish Republic ID Card (Türkiye Cumhuriyeti Kimlik Kartı).

EXTRACT THESE FIELDS:
- ${ID_FIELDS.FULL_NAME}: Full name as it appears
- ${ID_FIELDS.IDENTITY_NUMBER}: TC Kimlik No (exactly 11 digits)
- ${ID_FIELDS.DATE_OF_BIRTH}: Date in YYYY-MM-DD format
- ${ID_FIELDS.EXPIRY_DATE}: Expiry date in YYYY-MM-DD format
- ${ID_FIELDS.GENDER}: M/F or Turkish equivalent
- ${ID_FIELDS.NATIONALITY}: Should be "TR"
- ${ID_FIELDS.SERIAL_NUMBER}: Document serial number
- ${ID_FIELDS.MRZ}: Machine readable zone if visible
- ${ID_FIELDS.ADDRESS}: Address from back of card

ASSESSMENT FIELDS (CRITICAL - YOU MUST FILL THESE):
- ${ID_FIELDS.DOCUMENT_CONDITION}: Assess document condition - ${ALL_DOCUMENT_CONDITION_VALUES.map(v => `"${v}"`).join(', ')} (good: clear/readable, damaged: tears/stains but readable, poor: severely damaged/unreadable)
- ${ID_FIELDS.COUNTRY_CODE}: Detected country code from document (should be "tr" for Turkish ID)

CONFIDENCE SCORES (0-1):
You MUST provide confidence scores for these fields:
- ${ID_FIELDS.FULL_NAME_CONFIDENCE}: How confident you are in the name extraction
- ${ID_FIELDS.IDENTITY_NUMBER_CONFIDENCE}: How confident you are in the ID number
- ${ID_FIELDS.DATE_OF_BIRTH_CONFIDENCE}: How confident you are in the birth date
- ${ID_FIELDS.EXPIRY_DATE_CONFIDENCE}: How confident you are in the expiry date
- ${ID_FIELDS.IMAGE_QUALITY}: Overall image quality assessment

VALIDATION RULES:
- Identity number: Must be exactly 11 digits and pass Turkish ID checksum
- Dates: Must be in YYYY-MM-DD format and logically valid
- Names: Only Turkish and Latin characters allowed
- If field is unreadable, set to null but still provide confidence score
- Document condition affects validation - "poor" condition will trigger errors

THRESHOLDS TO MEET:
- ${ID_FIELDS.FULL_NAME_CONFIDENCE} ≥ 0.8
- ${ID_FIELDS.IDENTITY_NUMBER_CONFIDENCE} ≥ 0.95
- ${ID_FIELDS.DATE_OF_BIRTH_CONFIDENCE} ≥ 0.9
- ${ID_FIELDS.EXPIRY_DATE_CONFIDENCE} ≥ 0.9
- ${ID_FIELDS.IMAGE_QUALITY} ≥ 0.7

Add errors array with proper error codes if validation fails.`),
      new HumanMessage("Analyze these Turkish ID card images and extract all information with confidence scores.")
    ])
  },
  
  us: {
    name: 'US Driver License / State ID',
    prompt: ChatPromptTemplate.fromMessages([
      new SystemMessage("US ID verification not implemented yet."),
      new HumanMessage("This feature is not available.")
    ])
  },
  
  gb: {
    name: 'UK Driving Licence',
    prompt: ChatPromptTemplate.fromMessages([
      new SystemMessage("UK ID verification not implemented yet."),
      new HumanMessage("This feature is not available.")
    ])
  }
};

// Generic fallback prompt for unsupported countries
const GENERIC_ID_PROMPT = ChatPromptTemplate.fromMessages([
  new SystemMessage("Generic ID verification not implemented yet."),
  new HumanMessage("This feature is not available.")
]);

// Selfie verification prompt
const SELFIE_PROMPT = ChatPromptTemplate.fromMessages([
  new SystemMessage(`You are a face verification assistant for identity verification.

COMPARE ID PHOTO TO SELFIE:
- Analyze facial features match (eyes, nose, mouth, face shape)
- Check age consistency between photos
- Detect signs of spoofing or fake images
- Assess image quality and lighting

REQUIRED FIELDS:
- ${SELFIE_FIELDS.IS_MATCH}: Boolean if faces match
- ${SELFIE_FIELDS.FACE_COUNT}: Number of faces detected
- ${SELFIE_FIELDS.SPOOFING_RISK}: Risk score 0-1 (lower is better)
- ${SELFIE_FIELDS.IMAGE_QUALITY_ISSUES}: Array of quality problems

ASSESSMENT FIELDS (CRITICAL - YOU MUST FILL THESE):
- ${SELFIE_FIELDS.LIGHTING_CONDITION}: Assess lighting - ${ALL_LIGHTING_CONDITION_VALUES.map(v => `"${v}"`).join(', ')} (good: well-lit/clear, poor: dim but acceptable, insufficient: too dark/bright for verification)
- ${SELFIE_FIELDS.FACE_SIZE}: Assess face size - ${ALL_FACE_SIZE_VALUES.map(v => `"${v}"`).join(', ')} (adequate: face fills 25-75% of frame, too_small: face < 25%, too_large: face > 75%)
- ${SELFIE_FIELDS.FACE_COVERAGE}: Assess face visibility - ${ALL_FACE_COVERAGE_VALUES.map(v => `"${v}"`).join(', ')} (clear: face fully visible, partially_covered: some obstruction, fully_covered: face not visible)

THRESHOLD FIELDS (REQUIRED):
- ${SELFIE_FIELDS.MATCH_CONFIDENCE}: Match percentage 0-100
- ${SELFIE_FIELDS.IMAGE_QUALITY}: Overall quality score 0-1
- ${SELFIE_FIELDS.FACE_DETECTION_CONFIDENCE}: Face detection confidence 0-1

VALIDATION THRESHOLDS:
- ${SELFIE_FIELDS.MATCH_CONFIDENCE} ≥ 80%
- ${SELFIE_FIELDS.IMAGE_QUALITY} ≥ 0.7
- ${SELFIE_FIELDS.FACE_DETECTION_CONFIDENCE} ≥ 0.8
- ${SELFIE_FIELDS.SPOOFING_RISK} ≤ 0.3
- ${SELFIE_FIELDS.FACE_COUNT} = 1
- ${SELFIE_FIELDS.LIGHTING_CONDITION} must be "good" or "poor" (not "insufficient")
- ${SELFIE_FIELDS.FACE_SIZE} must be "adequate" (not "too_small" or "too_large")
- ${SELFIE_FIELDS.FACE_COVERAGE} must be "clear" (not "partially_covered" or "fully_covered")

Add errors array if any validation fails or thresholds not met.`),
  new HumanMessage("Compare the ID photo with these selfie images and verify if they match.")
]);

// Helper function to get country-specific prompt
const getIdPrompt = (countryCode) => {
  const country = countryCode.toLowerCase();
  if (ID_PROMPTS[country]) {
    return ID_PROMPTS[country].prompt;
  }
  return GENERIC_ID_PROMPT;
};

// Helper function to get country name
const getCountryName = (countryCode) => {
  const country = countryCode.toLowerCase();
  if (ID_PROMPTS[country]) {
    return ID_PROMPTS[country].name;
  }
  return 'Identity Document';
};

// Supported countries list
const SUPPORTED_COUNTRIES = Object.keys(ID_PROMPTS);

// Helper function to check if country is supported
const isCountrySupported = (countryCode) => {
  return SUPPORTED_COUNTRIES.includes(countryCode.toLowerCase());
};

export {
  ID_PROMPTS,
  GENERIC_ID_PROMPT,
  SELFIE_PROMPT,
  getIdPrompt,
  getCountryName,
  SUPPORTED_COUNTRIES,
  isCountrySupported
}; 