import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed threshold configurations
  const thresholdConfigs = [
    // ID Validation Thresholds
    {
      category: 'ID_VALIDATION',
      fieldName: 'fullNameConfidence',
      thresholdValue: 0.8,
      dataType: 'FLOAT',
      description: 'Minimum confidence for full name extraction'
    },
    {
      category: 'ID_VALIDATION',
      fieldName: 'identityNumberConfidence',
      thresholdValue: 0.95,
      dataType: 'FLOAT',
      description: 'Minimum confidence for identity number extraction'
    },
    {
      category: 'ID_VALIDATION',
      fieldName: 'dateOfBirthConfidence',
      thresholdValue: 0.9,
      dataType: 'FLOAT',
      description: 'Minimum confidence for date of birth extraction'
    },
    {
      category: 'ID_VALIDATION',
      fieldName: 'expiryDateConfidence',
      thresholdValue: 0.9,
      dataType: 'FLOAT',
      description: 'Minimum confidence for expiry date extraction'
    },
    {
      category: 'ID_VALIDATION',
      fieldName: 'imageQuality',
      thresholdValue: 0.7,
      dataType: 'FLOAT',
      description: 'Minimum image quality for ID validation'
    },
    
    // Selfie Validation Thresholds
    {
      category: 'SELFIE_VALIDATION',
      fieldName: 'matchConfidence',
      thresholdValue: 80,
      dataType: 'FLOAT',
      description: 'Minimum face match confidence percentage'
    },
    {
      category: 'SELFIE_VALIDATION',
      fieldName: 'imageQuality',
      thresholdValue: 0.7,
      dataType: 'FLOAT',
      description: 'Minimum image quality for selfie validation'
    },
    {
      category: 'SELFIE_VALIDATION',
      fieldName: 'faceDetectionConfidence',
      thresholdValue: 0.8,
      dataType: 'FLOAT',
      description: 'Minimum face detection confidence'
    },
    {
      category: 'SELFIE_VALIDATION',
      fieldName: 'spoofingRisk',
      thresholdValue: 0.3,
      dataType: 'FLOAT',
      description: 'Maximum acceptable spoofing risk score'
    },
    
    // AML Check Thresholds
    {
      category: 'AML_CHECK',
      fieldName: 'riskScore',
      thresholdValue: 0.7,
      dataType: 'FLOAT',
      description: 'Maximum acceptable AML risk score'
    }
  ];

  // Insert threshold configurations
  for (const config of thresholdConfigs) {
    await prisma.thresholdConfig.upsert({
      where: {
        unique_category_field: {
          category: config.category,
          fieldName: config.fieldName
        }
      },
      update: config,
      create: config
    });
  }

  console.log('✅ Threshold configurations seeded successfully');
  console.log(`📊 Seeded ${thresholdConfigs.length} threshold configurations`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
