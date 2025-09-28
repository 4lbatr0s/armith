-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fullName" TEXT,
    "identityNumber" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "nationality" TEXT,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING'
);

-- CreateTable
CREATE TABLE "id_card_validations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "profileId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "frontImageUrl" TEXT NOT NULL,
    "backImageUrl" TEXT,
    "fullName" TEXT,
    "identityNumber" TEXT,
    "dateOfBirth" DATETIME,
    "expiryDate" DATETIME,
    "gender" TEXT,
    "nationality" TEXT,
    "serialNumber" TEXT,
    "mrz" TEXT,
    "address" TEXT,
    "documentCondition" TEXT,
    "fullNameConfidence" REAL,
    "identityNumberConfidence" REAL,
    "dateOfBirthConfidence" REAL,
    "expiryDateConfidence" REAL,
    "imageQuality" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "rejectionReasons" JSONB,
    CONSTRAINT "id_card_validations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "selfie_validations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "profileId" TEXT NOT NULL,
    "idPhotoUrl" TEXT NOT NULL,
    "selfieUrls" JSONB NOT NULL,
    "isMatch" BOOLEAN,
    "matchConfidence" REAL,
    "spoofingRisk" REAL,
    "faceCount" INTEGER,
    "imageQualityIssues" JSONB,
    "lightingCondition" TEXT,
    "faceSize" TEXT,
    "faceCoverage" TEXT,
    "imageQuality" REAL,
    "faceDetectionConfidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "rejectionReasons" JSONB,
    CONSTRAINT "selfie_validations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aml_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "profileId" TEXT NOT NULL,
    "riskScore" REAL,
    "riskLevel" TEXT,
    "sanctionsCheck" BOOLEAN,
    "pepCheck" BOOLEAN,
    "adverseMediaCheck" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "notes" TEXT,
    "externalCheckId" TEXT,
    "externalProvider" TEXT,
    CONSTRAINT "aml_checks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "threshold_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "thresholdValue" REAL NOT NULL,
    "dataType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "validation_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completedAt" DATETIME,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" JSONB,
    CONSTRAINT "validation_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_country_identityNumber_key" ON "profiles"("country", "identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "aml_checks_profileId_key" ON "aml_checks"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "threshold_configs_category_fieldName_key" ON "threshold_configs"("category", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "validation_sessions_sessionToken_key" ON "validation_sessions"("sessionToken");
