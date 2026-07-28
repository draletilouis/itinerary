-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'FAMILY', 'GROUP', 'CORPORATE', 'SCHOOL', 'ORGANISATION', 'TRAVEL_AGENCY', 'TOUR_OPERATOR');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFYING', 'PLANNING', 'QUOTATION_SENT', 'NEGOTIATION', 'CONFIRMED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TourType" AS ENUM ('CUSTOM', 'STANDARD_PACKAGE', 'GROUP_DEPARTURE', 'PRIVATE', 'CORPORATE', 'SCHOOL', 'DAY', 'MULTI_DAY');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'PLANNING', 'COSTING', 'QUOTED', 'AWAITING_CONFIRMATION', 'CONFIRMED', 'OPERATIONAL_PREPARATION', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PROVISIONAL', 'AWAITING_DEPOSIT', 'CONFIRMED', 'PARTIALLY_PAID', 'FULLY_PAID', 'IN_OPERATION', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING', 'DUE', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('DEPOSIT', 'INSTALMENT', 'FINAL_BALANCE', 'ADDITIONAL_SERVICE', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinancialRecordStatus" AS ENUM ('RECORDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SupplierBillStatus" AS ENUM ('DRAFT', 'RECEIVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'BANK', 'PROVIDER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItineraryStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'CLIENT_REVIEW', 'APPROVED', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ItineraryItemType" AS ENUM ('ACTIVITY', 'ACCOMMODATION', 'TRANSPORT', 'MEAL', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "CostCalculationBasis" AS ENUM ('STANDARD', 'ACCOMMODATION', 'PER_PERSON', 'VEHICLE', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "PricingMarkupMethod" AS ENUM ('PERCENTAGE', 'FIXED', 'PER_PERSON', 'CATEGORY', 'TARGET_PRICE', 'TARGET_MARGIN');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLoginAttempt" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" UUID NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'primary',
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "taxNumber" TEXT,
    "bankDetails" TEXT,
    "terms" TEXT,
    "emergencyContact" TEXT,
    "reportingCurrencyCode" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" UUID NOT NULL,
    "baseCurrencyCode" CHAR(3) NOT NULL,
    "quoteCurrencyCode" CHAR(3) NOT NULL,
    "rate" DECIMAL(24,10) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceSequence" (
    "id" UUID NOT NULL,
    "sequenceName" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "fullName" TEXT NOT NULL,
    "organisation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "alternativePhone" TEXT,
    "country" TEXT,
    "nationality" TEXT,
    "address" TEXT,
    "preferredCommunicationMethod" TEXT,
    "travelPreferences" TEXT,
    "dietaryRequirements" TEXT,
    "accessibilityRequirements" TEXT,
    "specialRequests" TEXT,
    "emergencyContact" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traveller" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "nationality" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" DATE,
    "visaStatus" TEXT,
    "dietaryNeeds" TEXT,
    "accessibilityNote" TEXT,
    "roomPreference" TEXT,
    "emergencyContact" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traveller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "assignedToId" UUID,
    "createdById" UUID NOT NULL,
    "proposedStartDate" DATE,
    "proposedEndDate" DATE,
    "flexibleDates" BOOLEAN NOT NULL DEFAULT false,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "childAges" INTEGER[],
    "rooms" INTEGER,
    "destinationsOfInterest" TEXT[],
    "arrivalLocation" TEXT,
    "departureLocation" TEXT,
    "customerBudget" DECIMAL(18,2),
    "budgetCurrencyCode" CHAR(3),
    "accommodationPreference" TEXT,
    "activityInterests" TEXT[],
    "transportPreference" TEXT,
    "dietaryRequirements" TEXT,
    "accessibilityRequirements" TEXT,
    "specialRequests" TEXT,
    "notes" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "followUpAt" TIMESTAMP(3),
    "lossReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryFollowUp" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "outcome" TEXT,
    "completedAt" TIMESTAMP(3),
    "assignedToId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnquiryFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryStatusHistory" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "fromStatus" "EnquiryStatus",
    "toStatus" "EnquiryStatus" NOT NULL,
    "reason" TEXT,
    "changedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "sourceEnquiryId" UUID,
    "type" "TourType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "ownerId" UUID NOT NULL,
    "costingCurrencyCode" CHAR(3) NOT NULL,
    "quotationCurrencyCode" CHAR(3) NOT NULL,
    "estimatedInternalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estimatedProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estimatedMargin" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualMargin" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "bookingStatus" "BookingStatus",
    "status" "TourStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourStatusHistory" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "fromStatus" "TourStatus",
    "toStatus" "TourStatus" NOT NULL,
    "reason" TEXT,
    "changedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tourId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "acceptedQuotationVersionId" UUID NOT NULL,
    "acceptedItineraryVersionId" UUID,
    "bookingDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "travellerCount" INTEGER NOT NULL,
    "leadTravellerId" UUID,
    "currencyCode" CHAR(3) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "depositAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(18,4) NOT NULL,
    "finalPaymentDate" DATE,
    "status" "BookingStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "notes" TEXT,
    "cancellationReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourTraveller" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "travellerId" UUID NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourTraveller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPaymentSchedule" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "bestTravelPeriods" TEXT,
    "typicalStayDays" INTEGER,
    "entryRequirements" TEXT,
    "travelAdvice" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRoute" (
    "id" UUID NOT NULL,
    "originId" UUID NOT NULL,
    "destinationId" UUID NOT NULL,
    "distanceKm" DECIMAL(10,2),
    "estimatedMinutes" INTEGER,
    "routeNotes" TEXT,
    "roadConditions" TEXT,
    "recommendedStops" TEXT,
    "transportType" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierType" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxIdentifier" TEXT,
    "paymentTerms" TEXT,
    "preferredCurrencyCode" CHAR(3),
    "bankDetails" TEXT,
    "contractStart" DATE,
    "contractEnd" DATE,
    "rating" DECIMAL(3,2),
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "destinationId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER,
    "availableStartTimes" TEXT[],
    "ageRestrictions" TEXT,
    "capacity" INTEGER,
    "supplierId" UUID,
    "suggestedSellingValue" DECIMAL(18,2),
    "seasonalAvailability" TEXT,
    "permitRequirements" TEXT,
    "equipmentRequirements" TEXT,
    "safetyNotes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRate" (
    "id" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "supplierId" UUID,
    "rateType" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "commissionable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "destinationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "rating" TEXT,
    "description" TEXT,
    "contactInfo" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "amenities" TEXT[],
    "mealPlans" TEXT[],
    "supplierId" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" UUID NOT NULL,
    "accommodationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "maximumOccupancy" INTEGER NOT NULL,
    "adultCapacity" INTEGER NOT NULL,
    "childCapacity" INTEGER NOT NULL DEFAULT 0,
    "bedConfiguration" TEXT,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationRate" (
    "id" UUID NOT NULL,
    "accommodationId" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "supplierId" UUID,
    "mealPlan" TEXT NOT NULL,
    "occupancy" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "childRate" DECIMAL(18,2),
    "extraBedRate" DECIMAL(18,2),
    "currencyCode" CHAR(3) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "commissionPercent" DECIMAL(9,4),
    "contractReference" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccommodationRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enquiryId" UUID,
    "tourId" UUID,
    "startDate" DATE,
    "endDate" DATE,
    "status" "ItineraryStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "coverImageUrl" TEXT,
    "brandingTemplate" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryVersion" (
    "id" UUID NOT NULL,
    "itineraryId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "introduction" TEXT,
    "summary" TEXT,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "importantNotes" TEXT,
    "terms" TEXT,
    "status" "ItineraryStatus" NOT NULL DEFAULT 'DRAFT',
    "changeNote" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ItineraryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE,
    "title" TEXT NOT NULL,
    "startLocation" TEXT,
    "endLocation" TEXT,
    "destinationId" UUID,
    "clientNarrative" TEXT,
    "meals" TEXT[],
    "transport" TEXT,
    "distanceKm" DECIMAL(10,2),
    "drivingMinutes" INTEGER,
    "pickupTime" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "clientNotes" TEXT,
    "internalNotes" TEXT,
    "guideInstructions" TEXT,
    "driverInstructions" TEXT,
    "supplierNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" UUID NOT NULL,
    "dayId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" "ItineraryItemType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "title" TEXT NOT NULL,
    "clientDescription" TEXT,
    "internalNotes" TEXT,
    "activityId" UUID,
    "accommodationId" UUID,
    "supplierId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourCostItem" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "itineraryDayId" UUID,
    "supplierId" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basis" "CostCalculationBasis" NOT NULL,
    "unitCost" DECIMAL(18,4) NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "days" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "nights" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "rooms" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "vehicles" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "eligibleTravellers" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "taxPercentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "commissionPercentage" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "overrideTotal" DECIMAL(18,4),
    "overrideReason" TEXT,
    "originalCurrencyCode" CHAR(3) NOT NULL,
    "originalTotal" DECIMAL(18,4) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "convertedCurrencyCode" CHAR(3) NOT NULL,
    "convertedTotal" DECIMAL(18,4) NOT NULL,
    "isEstimate" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "TourCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourMarginSetting" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "minimumMargin" DECIMAL(9,4),
    "changedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourMarginSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPricing" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "internalCost" DECIMAL(18,4) NOT NULL,
    "costingToQuotationRate" DECIMAL(24,10) NOT NULL,
    "contingency" DECIMAL(18,4) NOT NULL,
    "costAfterContingency" DECIMAL(18,4) NOT NULL,
    "markupMethod" "PricingMarkupMethod" NOT NULL,
    "markupValue" DECIMAL(18,4) NOT NULL,
    "markupAmount" DECIMAL(18,4) NOT NULL,
    "markupPercentage" DECIMAL(9,4) NOT NULL,
    "tax" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL,
    "sellingPrice" DECIMAL(18,4) NOT NULL,
    "estimatedProfit" DECIMAL(18,4) NOT NULL,
    "estimatedMargin" DECIMAL(9,4) NOT NULL,
    "pricePerTraveller" DECIMAL(18,4) NOT NULL,
    "minimumMargin" DECIMAL(9,4),
    "belowMinimumReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tourId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationVersion" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "itineraryVersionId" UUID,
    "pricingId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "tax" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "internalCost" DECIMAL(18,4) NOT NULL,
    "estimatedProfit" DECIMAL(18,4) NOT NULL,
    "estimatedMargin" DECIMAL(9,4) NOT NULL,
    "customerNotes" TEXT,
    "terms" TEXT,
    "revisionReason" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'GENERATED',
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationCostSnapshot" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "sourceCostItemId" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalCurrencyCode" CHAR(3) NOT NULL,
    "originalTotal" DECIMAL(18,4) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "convertedCurrencyCode" CHAR(3) NOT NULL,
    "convertedTotal" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationExchangeRateSnapshot" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "sourceCurrencyCode" CHAR(3) NOT NULL,
    "targetCurrencyCode" CHAR(3) NOT NULL,
    "rate" DECIMAL(24,10) NOT NULL,
    "effectiveAt" DATE NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "bookingId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "paymentScheduleId" UUID,
    "type" "InvoiceType" NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "tax" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(18,4) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" UUID NOT NULL,
    "receiptReference" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentCurrencyCode" CHAR(3) NOT NULL,
    "originalAmount" DECIMAL(18,4) NOT NULL,
    "bookingCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "bookingCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "method" TEXT NOT NULL,
    "externalReference" TEXT,
    "notes" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED',
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paymentCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "invoiceCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "bookingId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "allocationId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "refundDate" DATE NOT NULL,
    "paymentCurrencyCode" CHAR(3) NOT NULL,
    "paymentCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "bookingCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "bookingCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "tourId" UUID,
    "supplierRef" TEXT,
    "currencyCode" CHAR(3) NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "amountPaid" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(18,4) NOT NULL,
    "status" "SupplierBillStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "paymentCurrencyCode" CHAR(3) NOT NULL,
    "originalAmount" DECIMAL(18,4) NOT NULL,
    "billCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "billCurrencyAmount" DECIMAL(18,4) NOT NULL,
    "method" TEXT NOT NULL,
    "externalReference" TEXT,
    "notes" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED',
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourExpense" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tourId" UUID NOT NULL,
    "supplierId" UUID,
    "supplierBillId" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "originalCurrencyCode" CHAR(3) NOT NULL,
    "originalAmount" DECIMAL(18,4) NOT NULL,
    "costingCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(24,10) NOT NULL,
    "exchangeRateDate" DATE NOT NULL,
    "convertedAmount" DECIMAL(18,4) NOT NULL,
    "receiptReference" TEXT,
    "notes" TEXT,
    "status" "FinancialRecordStatus" NOT NULL DEFAULT 'RECORDED',
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_revokedAt_idx" ON "AuthSession"("expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthLoginAttempt_email_attemptedAt_idx" ON "AuthLoginAttempt"("email", "attemptedAt" DESC);

-- CreateIndex
CREATE INDEX "AuthLoginAttempt_ipAddress_attemptedAt_idx" ON "AuthLoginAttempt"("ipAddress", "attemptedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_singletonKey_key" ON "CompanyProfile"("singletonKey");

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrencyCode_quoteCurrencyCode_effectiveAt_idx" ON "ExchangeRate"("baseCurrencyCode", "quoteCurrencyCode", "effectiveAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrencyCode_quoteCurrencyCode_effectiveAt_key" ON "ExchangeRate"("baseCurrencyCode", "quoteCurrencyCode", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSequence_sequenceName_year_key" ON "ReferenceSequence"("sequenceName", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_reference_key" ON "Customer"("reference");

-- CreateIndex
CREATE INDEX "Customer_fullName_idx" ON "Customer"("fullName");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Traveller_customerId_idx" ON "Traveller"("customerId");

-- CreateIndex
CREATE INDEX "Traveller_passportNumber_idx" ON "Traveller"("passportNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_reference_key" ON "Enquiry"("reference");

-- CreateIndex
CREATE INDEX "Enquiry_status_followUpAt_idx" ON "Enquiry"("status", "followUpAt");

-- CreateIndex
CREATE INDEX "Enquiry_customerId_idx" ON "Enquiry"("customerId");

-- CreateIndex
CREATE INDEX "Enquiry_assignedToId_idx" ON "Enquiry"("assignedToId");

-- CreateIndex
CREATE INDEX "EnquiryFollowUp_enquiryId_scheduledFor_idx" ON "EnquiryFollowUp"("enquiryId", "scheduledFor");

-- CreateIndex
CREATE INDEX "EnquiryFollowUp_assignedToId_status_scheduledFor_idx" ON "EnquiryFollowUp"("assignedToId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Communication_enquiryId_occurredAt_idx" ON "Communication"("enquiryId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "EnquiryStatusHistory_enquiryId_createdAt_idx" ON "EnquiryStatusHistory"("enquiryId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Tour_reference_key" ON "Tour"("reference");

-- CreateIndex
CREATE INDEX "Tour_status_startDate_idx" ON "Tour"("status", "startDate");

-- CreateIndex
CREATE INDEX "Tour_customerId_idx" ON "Tour"("customerId");

-- CreateIndex
CREATE INDEX "Tour_sourceEnquiryId_idx" ON "Tour"("sourceEnquiryId");

-- CreateIndex
CREATE INDEX "Tour_ownerId_idx" ON "Tour"("ownerId");

-- CreateIndex
CREATE INDEX "TourStatusHistory_tourId_createdAt_idx" ON "TourStatusHistory"("tourId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tourId_key" ON "Booking"("tourId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_acceptedQuotationVersionId_key" ON "Booking"("acceptedQuotationVersionId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_finalPaymentDate_status_idx" ON "Booking"("finalPaymentDate", "status");

-- CreateIndex
CREATE INDEX "TourTraveller_bookingId_isLead_idx" ON "TourTraveller"("bookingId", "isLead");

-- CreateIndex
CREATE UNIQUE INDEX "TourTraveller_tourId_travellerId_key" ON "TourTraveller"("tourId", "travellerId");

-- CreateIndex
CREATE UNIQUE INDEX "TourTraveller_bookingId_travellerId_key" ON "TourTraveller"("bookingId", "travellerId");

-- CreateIndex
CREATE INDEX "BookingPaymentSchedule_dueDate_status_idx" ON "BookingPaymentSchedule"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPaymentSchedule_bookingId_sequence_key" ON "BookingPaymentSchedule"("bookingId", "sequence");

-- CreateIndex
CREATE INDEX "Destination_country_status_idx" ON "Destination"("country", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_name_country_key" ON "Destination"("name", "country");

-- CreateIndex
CREATE INDEX "TravelRoute_originId_destinationId_idx" ON "TravelRoute"("originId", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelRoute_originId_destinationId_transportType_key" ON "TravelRoute"("originId", "destinationId", "transportType");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_reference_key" ON "Supplier"("reference");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_supplierType_status_idx" ON "Supplier"("supplierType", "status");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE INDEX "Activity_destinationId_status_idx" ON "Activity"("destinationId", "status");

-- CreateIndex
CREATE INDEX "Activity_supplierId_idx" ON "Activity"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_name_destinationId_key" ON "Activity"("name", "destinationId");

-- CreateIndex
CREATE INDEX "ActivityRate_activityId_startDate_endDate_idx" ON "ActivityRate"("activityId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ActivityRate_supplierId_idx" ON "ActivityRate"("supplierId");

-- CreateIndex
CREATE INDEX "Accommodation_destinationId_status_idx" ON "Accommodation"("destinationId", "status");

-- CreateIndex
CREATE INDEX "Accommodation_supplierId_idx" ON "Accommodation"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_name_destinationId_key" ON "Accommodation"("name", "destinationId");

-- CreateIndex
CREATE INDEX "RoomType_accommodationId_status_idx" ON "RoomType"("accommodationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_accommodationId_name_key" ON "RoomType"("accommodationId", "name");

-- CreateIndex
CREATE INDEX "AccommodationRate_accommodationId_roomTypeId_startDate_endD_idx" ON "AccommodationRate"("accommodationId", "roomTypeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccommodationRate_supplierId_idx" ON "AccommodationRate"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_reference_key" ON "Itinerary"("reference");

-- CreateIndex
CREATE INDEX "Itinerary_tourId_idx" ON "Itinerary"("tourId");

-- CreateIndex
CREATE INDEX "Itinerary_enquiryId_idx" ON "Itinerary"("enquiryId");

-- CreateIndex
CREATE INDEX "Itinerary_status_updatedAt_idx" ON "Itinerary"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ItineraryVersion_itineraryId_status_idx" ON "ItineraryVersion"("itineraryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryVersion_itineraryId_versionNumber_key" ON "ItineraryVersion"("itineraryId", "versionNumber");

-- CreateIndex
CREATE INDEX "ItineraryDay_versionId_dayNumber_idx" ON "ItineraryDay"("versionId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryDay_destinationId_idx" ON "ItineraryDay"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_versionId_dayNumber_key" ON "ItineraryDay"("versionId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryItem_dayId_sortOrder_idx" ON "ItineraryItem"("dayId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryItem_dayId_sortOrder_key" ON "ItineraryItem"("dayId", "sortOrder");

-- CreateIndex
CREATE INDEX "TourCostItem_tourId_category_idx" ON "TourCostItem"("tourId", "category");

-- CreateIndex
CREATE INDEX "TourCostItem_supplierId_idx" ON "TourCostItem"("supplierId");

-- CreateIndex
CREATE INDEX "TourCostItem_itineraryDayId_idx" ON "TourCostItem"("itineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "TourMarginSetting_tourId_key" ON "TourMarginSetting"("tourId");

-- CreateIndex
CREATE INDEX "TourPricing_tourId_createdAt_idx" ON "TourPricing"("tourId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TourPricing_tourId_revision_key" ON "TourPricing"("tourId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_reference_key" ON "Quotation"("reference");

-- CreateIndex
CREATE INDEX "Quotation_tourId_status_idx" ON "Quotation"("tourId", "status");

-- CreateIndex
CREATE INDEX "Quotation_customerId_createdAt_idx" ON "Quotation"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "QuotationVersion_quotationId_status_idx" ON "QuotationVersion"("quotationId", "status");

-- CreateIndex
CREATE INDEX "QuotationVersion_validUntil_status_idx" ON "QuotationVersion"("validUntil", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationVersion_quotationId_versionNumber_key" ON "QuotationVersion"("quotationId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationLine_versionId_sortOrder_key" ON "QuotationLine"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuotationCostSnapshot_versionId_category_idx" ON "QuotationCostSnapshot"("versionId", "category");

-- CreateIndex
CREATE INDEX "QuotationExchangeRateSnapshot_versionId_idx" ON "QuotationExchangeRateSnapshot"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_reference_key" ON "Invoice"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentScheduleId_key" ON "Invoice"("paymentScheduleId");

-- CreateIndex
CREATE INDEX "Invoice_bookingId_status_idx" ON "Invoice"("bookingId", "status");

-- CreateIndex
CREATE INDEX "Invoice_customerId_dueDate_status_idx" ON "Invoice"("customerId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_invoiceId_sortOrder_key" ON "InvoiceLine"("invoiceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPayment_receiptReference_key" ON "CustomerPayment"("receiptReference");

-- CreateIndex
CREATE INDEX "CustomerPayment_bookingId_paymentDate_idx" ON "CustomerPayment"("bookingId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_status_idx" ON "CustomerPayment"("customerId", "status");

-- CreateIndex
CREATE INDEX "PaymentAllocation_invoiceId_reversedAt_idx" ON "PaymentAllocation"("invoiceId", "reversedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_invoiceId_key" ON "PaymentAllocation"("paymentId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_reference_key" ON "Refund"("reference");

-- CreateIndex
CREATE INDEX "Refund_bookingId_refundDate_idx" ON "Refund"("bookingId", "refundDate" DESC);

-- CreateIndex
CREATE INDEX "Refund_allocationId_status_idx" ON "Refund"("allocationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBill_reference_key" ON "SupplierBill"("reference");

-- CreateIndex
CREATE INDEX "SupplierBill_supplierId_status_idx" ON "SupplierBill"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierBill_tourId_dueDate_idx" ON "SupplierBill"("tourId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_reference_key" ON "SupplierPayment"("reference");

-- CreateIndex
CREATE INDEX "SupplierPayment_billId_status_idx" ON "SupplierPayment"("billId", "status");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_paymentDate_idx" ON "SupplierPayment"("supplierId", "paymentDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TourExpense_reference_key" ON "TourExpense"("reference");

-- CreateIndex
CREATE INDEX "TourExpense_tourId_expenseDate_idx" ON "TourExpense"("tourId", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "TourExpense_supplierId_idx" ON "TourExpense"("supplierId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Attachment_recordType_recordId_createdAt_idx" ON "Attachment"("recordType", "recordId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Attachment_expiresAt_idx" ON "Attachment"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_reportingCurrencyCode_fkey" FOREIGN KEY ("reportingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_baseCurrencyCode_fkey" FOREIGN KEY ("baseCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_quoteCurrencyCode_fkey" FOREIGN KEY ("quoteCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traveller" ADD CONSTRAINT "Traveller_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryFollowUp" ADD CONSTRAINT "EnquiryFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_sourceEnquiryId_fkey" FOREIGN KEY ("sourceEnquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_costingCurrencyCode_fkey" FOREIGN KEY ("costingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_quotationCurrencyCode_fkey" FOREIGN KEY ("quotationCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStatusHistory" ADD CONSTRAINT "TourStatusHistory_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStatusHistory" ADD CONSTRAINT "TourStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_acceptedQuotationVersionId_fkey" FOREIGN KEY ("acceptedQuotationVersionId") REFERENCES "QuotationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_acceptedItineraryVersionId_fkey" FOREIGN KEY ("acceptedItineraryVersionId") REFERENCES "ItineraryVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadTravellerId_fkey" FOREIGN KEY ("leadTravellerId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTraveller" ADD CONSTRAINT "TourTraveller_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTraveller" ADD CONSTRAINT "TourTraveller_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourTraveller" ADD CONSTRAINT "TourTraveller_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPaymentSchedule" ADD CONSTRAINT "BookingPaymentSchedule_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRoute" ADD CONSTRAINT "TravelRoute_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRoute" ADD CONSTRAINT "TravelRoute_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_preferredCurrencyCode_fkey" FOREIGN KEY ("preferredCurrencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRate" ADD CONSTRAINT "ActivityRate_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRate" ADD CONSTRAINT "ActivityRate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRate" ADD CONSTRAINT "ActivityRate_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRate" ADD CONSTRAINT "AccommodationRate_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRate" ADD CONSTRAINT "AccommodationRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRate" ADD CONSTRAINT "AccommodationRate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationRate" ADD CONSTRAINT "AccommodationRate_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryVersion" ADD CONSTRAINT "ItineraryVersion_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryVersion" ADD CONSTRAINT "ItineraryVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ItineraryVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_originalCurrencyCode_fkey" FOREIGN KEY ("originalCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_convertedCurrencyCode_fkey" FOREIGN KEY ("convertedCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourCostItem" ADD CONSTRAINT "TourCostItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourMarginSetting" ADD CONSTRAINT "TourMarginSetting_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourMarginSetting" ADD CONSTRAINT "TourMarginSetting_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPricing" ADD CONSTRAINT "TourPricing_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPricing" ADD CONSTRAINT "TourPricing_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPricing" ADD CONSTRAINT "TourPricing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_itineraryVersionId_fkey" FOREIGN KEY ("itineraryVersionId") REFERENCES "ItineraryVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "TourPricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationCostSnapshot" ADD CONSTRAINT "QuotationCostSnapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationExchangeRateSnapshot" ADD CONSTRAINT "QuotationExchangeRateSnapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationExchangeRateSnapshot" ADD CONSTRAINT "QuotationExchangeRateSnapshot_sourceCurrencyCode_fkey" FOREIGN KEY ("sourceCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationExchangeRateSnapshot" ADD CONSTRAINT "QuotationExchangeRateSnapshot_targetCurrencyCode_fkey" FOREIGN KEY ("targetCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentScheduleId_fkey" FOREIGN KEY ("paymentScheduleId") REFERENCES "BookingPaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_paymentCurrencyCode_fkey" FOREIGN KEY ("paymentCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_bookingCurrencyCode_fkey" FOREIGN KEY ("bookingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "PaymentAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentCurrencyCode_fkey" FOREIGN KEY ("paymentCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingCurrencyCode_fkey" FOREIGN KEY ("bookingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_paymentCurrencyCode_fkey" FOREIGN KEY ("paymentCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_billCurrencyCode_fkey" FOREIGN KEY ("billCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_supplierBillId_fkey" FOREIGN KEY ("supplierBillId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_originalCurrencyCode_fkey" FOREIGN KEY ("originalCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_costingCurrencyCode_fkey" FOREIGN KEY ("costingCurrencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourExpense" ADD CONSTRAINT "TourExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
