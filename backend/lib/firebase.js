import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (!admin.apps.length) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
  
  return admin;
};

export const firebaseAdmin = initializeFirebase();

// Helper function to verify Firebase ID token
export const verifyFirebaseToken = async (idToken) => {
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid authentication token');
  }
};

// Helper function to create or update user profile
export const getUserOrCreateProfile = async (decodedToken) => {
  const { prisma } = await import('../lib/prisma.js');
  
  try {
    // Check if user already exists
    let profile = await prisma.profile.findUnique({
      where: { userId: decodedToken.uid }
    });

    if (!profile) {
      // Create new profile
      profile = await prisma.profile.create({
        data: {
          userId: decodedToken.uid,
          email: decodedToken.email || null,
          phoneNumber: decodedToken.phone_number || null,
          emailVerified: decodedToken.email_verified || false,
          phoneVerified: decodedToken.phone_number ? true : false,
          provider: decodedToken.firebase?.sign_in_provider || 'unknown',
          lastLoginAt: new Date()
        }
      });
    } else {
      // Update existing profile with latest login info
      profile = await prisma.profile.update({
        where: { userId: decodedToken.uid },
        data: {
          email: decodedToken.email || profile.email,
          phoneNumber: decodedToken.phone_number || profile.phoneNumber,
          emailVerified: decodedToken.email_verified || profile.emailVerified,
          phoneVerified: decodedToken.phone_number ? true : profile.phoneVerified,
          provider: decodedToken.firebase?.sign_in_provider || profile.provider,
          lastLoginAt: new Date()
        }
      });
    }

    return profile;
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw new Error('Failed to create or update user profile');
  }
};
