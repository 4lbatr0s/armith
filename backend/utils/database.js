import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database helper functions
const DB_PATH = path.join(__dirname, '../db.json');

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