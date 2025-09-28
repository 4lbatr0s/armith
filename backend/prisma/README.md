# KYC Flow Database Schema

This directory contains the Prisma schema and database configuration for the KYC (Know Your Customer) flow system.

## Database Models

### Core Models

#### 1. Profile
- **Purpose**: Represents a person entering the KYC flow
- **Key Features**:
  - Unique constraint on `country + identityNumber` combination
  - One-to-many relationship with validations
  - One-to-one relationship with AML check
  - Status tracking (PENDING, APPROVED, REJECTED, etc.)

#### 2. IdCardValidation
- **Purpose**: Stores ID card verification results
- **Key Features**:
  - Extracted document data (name, ID number, dates, etc.)
  - Confidence scores for each field
  - Document condition assessment
  - Error tracking and rejection reasons

#### 3. SelfieValidation
- **Purpose**: Stores selfie verification results
- **Key Features**:
  - Face matching results and confidence
  - Spoofing risk assessment
  - Image quality analysis
  - Lighting and face coverage assessment

#### 4. AmlCheck
- **Purpose**: Anti-Money Laundering verification
- **Key Features**:
  - Risk scoring and level assessment
  - Sanctions, PEP, and adverse media checks
  - External service integration support

### Configuration Models

#### 5. ThresholdConfig
- **Purpose**: Dynamic threshold management
- **Key Features**:
  - Configurable validation thresholds
  - Category-based organization
  - Version tracking for changes

#### 6. ValidationSession
- **Purpose**: Tracks KYC sessions
- **Key Features**:
  - Session token management
  - Device and IP tracking
  - Session lifecycle management

#### 7. AuditLog
- **Purpose**: Comprehensive audit trail
- **Key Features**:
  - Entity change tracking
  - User and session context
  - Before/after value storage

## Database Setup

### Prerequisites
1. Node.js 18+ installed
2. Prisma CLI installed globally: `npm install -g prisma`

### Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and set your DATABASE_URL
   DATABASE_URL="file:./dev.db"
   ```

3. **Generate Prisma client**:
   ```bash
   npm run db:generate
   ```

4. **Run initial migration**:
   ```bash
   npm run db:migrate
   ```

5. **Seed the database**:
   ```bash
   npm run db:seed
   ```

### Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database and reseed

## Schema Design Decisions

### 1. GUID Primary Keys
- All models use `cuid()` for primary keys
- Provides globally unique identifiers
- Better for distributed systems

### 2. Unique Constraints
- `Profile` has unique constraint on `country + identityNumber`
- `ThresholdConfig` has unique constraint on `category + fieldName`
- Prevents duplicate entries and ensures data integrity

### 3. JSON Fields
- Used for flexible data storage (errors, rejection reasons, device info)
- Allows for complex nested data without schema changes
- Trade-off between flexibility and queryability

### 4. Enum Types
- Standardized status and condition values
- Type safety at database level
- Easy to extend with new values

### 5. Audit Trail
- Comprehensive logging of all changes
- Supports compliance requirements
- Enables debugging and analytics

## Data Relationships

```
Profile (1) ←→ (1) AmlCheck
    ↓ (1)
    ↓ (many)
IdCardValidation

Profile (1) ←→ (many) SelfieValidation

Profile (1) ←→ (many) ValidationSession

All Models → AuditLog (for change tracking)
```

## Future Enhancements

### Suggested Additions

1. **Document Templates**
   - Store country-specific document templates
   - Field mapping configurations
   - Validation rules per country

2. **Risk Scoring Engine**
   - Configurable risk calculation algorithms
   - Historical risk data
   - Machine learning model integration

3. **Notification System**
   - Email/SMS notifications for status changes
   - Webhook integrations
   - Real-time updates

4. **Analytics Dashboard**
   - Performance metrics
   - Success/failure rates
   - Geographic distribution

5. **Multi-tenancy Support**
   - Organization/tenant isolation
   - Custom configurations per tenant
   - Usage tracking and billing

## Migration Strategy

### From JSON to SQLite

1. **Data Migration Script**: Create a script to migrate existing JSON data
2. **Gradual Rollout**: Implement feature flags for database switching
3. **Backup Strategy**: Maintain JSON backup during transition
4. **Validation**: Compare results between old and new systems

### Example Migration Script

```javascript
// migrate-from-json.js
import { readDatabase } from '../utils/database.js';
import databaseService from '../services/databaseService.js';

async function migrateData() {
  const jsonData = await readDatabase();
  
  for (const user of jsonData.users) {
    // Create profile
    const profileResult = await databaseService.createProfile({
      fullName: user.idResult?.fullName,
      identityNumber: user.idResult?.identityNumber,
      dateOfBirth: user.idResult?.dateOfBirth,
      gender: user.idResult?.gender,
      nationality: user.idResult?.nationality,
      country: user.country,
      status: user.status
    });
    
    if (profileResult.success) {
      // Create ID card validation
      await databaseService.createIdCardValidation({
        profileId: profileResult.data.id,
        countryCode: user.country,
        frontImageUrl: user.frontImageUrl,
        backImageUrl: user.backImageUrl,
        // ... other fields
      });
    }
  }
}
```

## Performance Considerations

### Indexing Strategy
- Primary keys are automatically indexed
- Unique constraints create indexes
- Consider adding indexes on frequently queried fields:
  - `Profile.status`
  - `Profile.createdAt`
  - `IdCardValidation.status`
  - `AuditLog.entityType`

### Query Optimization
- Use `include` selectively to avoid N+1 queries
- Implement pagination for large result sets
- Consider caching for frequently accessed data

### Database Maintenance
- Regular cleanup of expired sessions
- Archive old audit logs
- Monitor database size and performance
