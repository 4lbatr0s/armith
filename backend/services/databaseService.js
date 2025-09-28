import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database Service
 * Handles all database operations using Prisma ORM
 */
class DatabaseService {
  
  // Profile Operations
  async createProfile(profileData) {
    try {
      const profile = await prisma.profile.create({
        data: {
          ...profileData,
          id: uuidv4()
        }
      });
      return { success: true, data: profile };
    } catch (error) {
      console.error('Error creating profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getProfileById(profileId) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: {
          idCardValidations: true,
          selfieValidations: true,
          amlCheck: true
        }
      });
      return { success: true, data: profile };
    } catch (error) {
      console.error('Error getting profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getProfileByCountryAndIdentity(country, identityNumber) {
    try {
      const profile = await prisma.profile.findUnique({
        where: {
          unique_country_identity: {
            country,
            identityNumber
          }
        },
        include: {
          idCardValidations: true,
          selfieValidations: true,
          amlCheck: true
        }
      });
      return { success: true, data: profile };
    } catch (error) {
      console.error('Error getting profile by country and identity:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProfile(profileId, updateData) {
    try {
      const profile = await prisma.profile.update({
        where: { id: profileId },
        data: updateData
      });
      return { success: true, data: profile };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // ID Card Validation Operations
  async createIdCardValidation(validationData) {
    try {
      const validation = await prisma.idCardValidation.create({
        data: {
          ...validationData,
          id: uuidv4()
        }
      });
      return { success: true, data: validation };
    } catch (error) {
      console.error('Error creating ID card validation:', error);
      return { success: false, error: error.message };
    }
  }

  async updateIdCardValidation(validationId, updateData) {
    try {
      const validation = await prisma.idCardValidation.update({
        where: { id: validationId },
        data: updateData
      });
      return { success: true, data: validation };
    } catch (error) {
      console.error('Error updating ID card validation:', error);
      return { success: false, error: error.message };
    }
  }

  // Selfie Validation Operations
  async createSelfieValidation(validationData) {
    try {
      const validation = await prisma.selfieValidation.create({
        data: {
          ...validationData,
          id: uuidv4()
        }
      });
      return { success: true, data: validation };
    } catch (error) {
      console.error('Error creating selfie validation:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSelfieValidation(validationId, updateData) {
    try {
      const validation = await prisma.selfieValidation.update({
        where: { id: validationId },
        data: updateData
      });
      return { success: true, data: validation };
    } catch (error) {
      console.error('Error updating selfie validation:', error);
      return { success: false, error: error.message };
    }
  }

  // AML Check Operations
  async createAmlCheck(amlData) {
    try {
      const amlCheck = await prisma.amlCheck.create({
        data: {
          ...amlData,
          id: uuidv4()
        }
      });
      return { success: true, data: amlCheck };
    } catch (error) {
      console.error('Error creating AML check:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAmlCheck(amlId, updateData) {
    try {
      const amlCheck = await prisma.amlCheck.update({
        where: { id: amlId },
        data: updateData
      });
      return { success: true, data: amlCheck };
    } catch (error) {
      console.error('Error updating AML check:', error);
      return { success: false, error: error.message };
    }
  }

  // Threshold Configuration Operations
  async getThresholdConfig(category, fieldName) {
    try {
      const config = await prisma.thresholdConfig.findUnique({
        where: {
          unique_category_field: {
            category,
            fieldName
          }
        }
      });
      return { success: true, data: config };
    } catch (error) {
      console.error('Error getting threshold config:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllThresholdConfigs() {
    try {
      const configs = await prisma.thresholdConfig.findMany({
        where: { isActive: true }
      });
      return { success: true, data: configs };
    } catch (error) {
      console.error('Error getting all threshold configs:', error);
      return { success: false, error: error.message };
    }
  }

  async updateThresholdConfig(category, fieldName, thresholdValue) {
    try {
      const config = await prisma.thresholdConfig.update({
        where: {
          unique_category_field: {
            category,
            fieldName
          }
        },
        data: {
          thresholdValue,
          version: { increment: 1 }
        }
      });
      return { success: true, data: config };
    } catch (error) {
      console.error('Error updating threshold config:', error);
      return { success: false, error: error.message };
    }
  }

  // Validation Session Operations
  async createValidationSession(sessionData) {
    try {
      const session = await prisma.validationSession.create({
        data: {
          ...sessionData,
          id: uuidv4(),
          sessionToken: uuidv4()
        }
      });
      return { success: true, data: session };
    } catch (error) {
      console.error('Error creating validation session:', error);
      return { success: false, error: error.message };
    }
  }

  async getValidationSession(sessionToken) {
    try {
      const session = await prisma.validationSession.findUnique({
        where: { sessionToken },
        include: {
          profile: {
            include: {
              idCardValidations: true,
              selfieValidations: true,
              amlCheck: true
            }
          }
        }
      });
      return { success: true, data: session };
    } catch (error) {
      console.error('Error getting validation session:', error);
      return { success: false, error: error.message };
    }
  }

  async updateValidationSession(sessionId, updateData) {
    try {
      const session = await prisma.validationSession.update({
        where: { id: sessionId },
        data: updateData
      });
      return { success: true, data: session };
    } catch (error) {
      console.error('Error updating validation session:', error);
      return { success: false, error: error.message };
    }
  }

  // Audit Log Operations
  async createAuditLog(auditData) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          ...auditData,
          id: uuidv4()
        }
      });
      return { success: true, data: auditLog };
    } catch (error) {
      console.error('Error creating audit log:', error);
      return { success: false, error: error.message };
    }
  }

  // Statistics and Analytics
  async getProfileStats() {
    try {
      const stats = await prisma.profile.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      });
      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting profile stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getValidationStats() {
    try {
      const [idStats, selfieStats] = await Promise.all([
        prisma.idCardValidation.groupBy({
          by: ['status'],
          _count: { status: true }
        }),
        prisma.selfieValidation.groupBy({
          by: ['status'],
          _count: { status: true }
        })
      ]);
      
      return { 
        success: true, 
        data: { 
          idCardValidations: idStats, 
          selfieValidations: selfieStats 
        } 
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup operations
  async cleanupExpiredSessions() {
    try {
      const expiredSessions = await prisma.validationSession.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
          }
        }
      });

      if (expiredSessions.length > 0) {
        await prisma.validationSession.updateMany({
          where: {
            id: {
              in: expiredSessions.map(s => s.id)
            }
          },
          data: {
            status: 'EXPIRED'
          }
        });
      }

      return { success: true, data: { expiredCount: expiredSessions.length } };
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { success: true, data: { status: 'healthy' } };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
