import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database helper functions
const DB_PATH = path.join(__dirname, '../db.json');
const SETTINGS_PATH = path.join(__dirname, '../settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  verificationRules: {
    requireIdCard: true,
    requireSelfie: true
  },
  thresholds: {
    fullNameConfidence: 0.8,
    identityNumberConfidence: 0.95,
    dateOfBirthConfidence: 0.9,
    expiryDateConfidence: 0.9,
    imageQuality: 0.7,
    matchConfidence: 80,
    faceDetectionConfidence: 0.8,
    spoofingRiskMax: 0.3,
    minAge: 18,
    maxAge: 120
  },
  metadata: {
    lastUpdated: null,
    updatedBy: null
  }
};

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

export const readDatabase = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], metadata: { version: '1.0.0', createdAt: new Date().toISOString() } };
  }
};

export const writeDatabase = async (data) => {
  try {
    data.metadata.lastUpdated = new Date().toISOString();
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
};

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

export const readSettings = async () => {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings, using defaults:', error);
    // Return defaults if file doesn't exist
    return DEFAULT_SETTINGS;
  }
};

export const writeSettings = async (settings) => {
  try {
    settings.metadata = {
      ...settings.metadata,
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing settings:', error);
    return false;
  }
};

export const getDefaultSettings = () => DEFAULT_SETTINGS; 