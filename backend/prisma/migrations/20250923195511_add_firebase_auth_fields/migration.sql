/*
  Warnings:

  - Added the required column `firebaseUid` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "lastLoginAt" DATETIME,
    "fullName" TEXT,
    "identityNumber" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "nationality" TEXT,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING'
);
INSERT INTO "new_profiles" ("country", "createdAt", "dateOfBirth", "fullName", "gender", "id", "identityNumber", "nationality", "status", "updatedAt") SELECT "country", "createdAt", "dateOfBirth", "fullName", "gender", "id", "identityNumber", "nationality", "status", "updatedAt" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_firebaseUid_key" ON "profiles"("firebaseUid");
CREATE UNIQUE INDEX "profiles_country_identityNumber_key" ON "profiles"("country", "identityNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
