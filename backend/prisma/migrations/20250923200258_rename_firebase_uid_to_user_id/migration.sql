/*
  Warnings:

  - You are about to drop the column `firebaseUid` on the `profiles` table. All the data in the column will be lost.
  - Added the required column `userId` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
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
INSERT INTO "new_profiles" ("country", "createdAt", "dateOfBirth", "email", "emailVerified", "fullName", "gender", "id", "identityNumber", "lastLoginAt", "nationality", "phoneNumber", "phoneVerified", "provider", "status", "updatedAt") SELECT "country", "createdAt", "dateOfBirth", "email", "emailVerified", "fullName", "gender", "id", "identityNumber", "lastLoginAt", "nationality", "phoneNumber", "phoneVerified", "provider", "status", "updatedAt" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
CREATE UNIQUE INDEX "profiles_country_identityNumber_key" ON "profiles"("country", "identityNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
