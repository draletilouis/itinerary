-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('VEHICLE', 'DRIVER', 'GUIDE', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "ResourceAvailabilityType" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'LEAVE', 'RESERVED');

-- CreateEnum
CREATE TYPE "ResourceAssignmentStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OperationalTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAIVED');

-- CreateEnum
CREATE TYPE "SupplierConfirmationStatus" AS ENUM ('PENDING', 'REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "ownership" TEXT NOT NULL,
    "supplierId" UUID,
    "manufactureYear" INTEGER,
    "colour" TEXT,
    "notes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "licenceNumber" TEXT NOT NULL,
    "licenceClass" TEXT,
    "licenceExpiry" DATE,
    "supplierId" UUID,
    "emergencyContact" TEXT,
    "notes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guide" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "languages" TEXT[],
    "specialities" TEXT[],
    "certification" TEXT,
    "certificationExpiry" DATE,
    "supplierId" UUID,
    "notes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAvailability" (
    "id" UUID NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "vehicleId" UUID,
    "driverId" UUID,
    "guideId" UUID,
    "equipmentId" UUID,
    "type" "ResourceAvailabilityType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAssignment" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "vehicleId" UUID,
    "driverId" UUID,
    "guideId" UUID,
    "equipmentId" UUID,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ResourceAssignmentStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "notes" TEXT,
    "conflictOverrideReason" TEXT,
    "assignedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "serviceProvider" TEXT,
    "odometerKm" INTEGER,
    "cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currencyCode" CHAR(3) NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalTask" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "status" "OperationalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "waivedReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierConfirmation" (
    "id" UUID NOT NULL,
    "tourId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "serviceDate" DATE,
    "externalReference" TEXT,
    "status" "SupplierConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedByName" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourIncident" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tourId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "peopleInvolved" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "resolvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalDocument" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tourId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_reference_key" ON "Vehicle"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registration_key" ON "Vehicle"("registration");

-- CreateIndex
CREATE INDEX "Vehicle_status_vehicleType_idx" ON "Vehicle"("status", "vehicleType");

-- CreateIndex
CREATE INDEX "Vehicle_supplierId_idx" ON "Vehicle"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_reference_key" ON "Driver"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenceNumber_key" ON "Driver"("licenceNumber");

-- CreateIndex
CREATE INDEX "Driver_status_fullName_idx" ON "Driver"("status", "fullName");

-- CreateIndex
CREATE INDEX "Driver_supplierId_idx" ON "Driver"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Guide_reference_key" ON "Guide"("reference");

-- CreateIndex
CREATE INDEX "Guide_status_fullName_idx" ON "Guide"("status", "fullName");

-- CreateIndex
CREATE INDEX "Guide_supplierId_idx" ON "Guide"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_reference_key" ON "Equipment"("reference");

-- CreateIndex
CREATE INDEX "Equipment_status_category_idx" ON "Equipment"("status", "category");

-- CreateIndex
CREATE INDEX "ResourceAvailability_resourceType_startDate_endDate_idx" ON "ResourceAvailability"("resourceType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAvailability_vehicleId_startDate_endDate_idx" ON "ResourceAvailability"("vehicleId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAvailability_driverId_startDate_endDate_idx" ON "ResourceAvailability"("driverId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAvailability_guideId_startDate_endDate_idx" ON "ResourceAvailability"("guideId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAvailability_equipmentId_startDate_endDate_idx" ON "ResourceAvailability"("equipmentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAssignment_tourId_status_idx" ON "ResourceAssignment"("tourId", "status");

-- CreateIndex
CREATE INDEX "ResourceAssignment_resourceType_startDate_endDate_status_idx" ON "ResourceAssignment"("resourceType", "startDate", "endDate", "status");

-- CreateIndex
CREATE INDEX "ResourceAssignment_vehicleId_startDate_endDate_idx" ON "ResourceAssignment"("vehicleId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAssignment_driverId_startDate_endDate_idx" ON "ResourceAssignment"("driverId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAssignment_guideId_startDate_endDate_idx" ON "ResourceAssignment"("guideId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAssignment_equipmentId_startDate_endDate_idx" ON "ResourceAssignment"("equipmentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_vehicleId_startDate_endDate_status_idx" ON "VehicleMaintenance"("vehicleId", "startDate", "endDate", "status");

-- CreateIndex
CREATE INDEX "OperationalTask_tourId_status_dueDate_idx" ON "OperationalTask"("tourId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "SupplierConfirmation_tourId_status_serviceDate_idx" ON "SupplierConfirmation"("tourId", "status", "serviceDate");

-- CreateIndex
CREATE INDEX "SupplierConfirmation_supplierId_serviceDate_idx" ON "SupplierConfirmation"("supplierId", "serviceDate");

-- CreateIndex
CREATE UNIQUE INDEX "TourIncident_reference_key" ON "TourIncident"("reference");

-- CreateIndex
CREATE INDEX "TourIncident_tourId_status_severity_idx" ON "TourIncident"("tourId", "status", "severity");

-- CreateIndex
CREATE INDEX "TourIncident_occurredAt_idx" ON "TourIncident"("occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OperationalDocument_reference_key" ON "OperationalDocument"("reference");

-- CreateIndex
CREATE INDEX "OperationalDocument_tourId_createdAt_idx" ON "OperationalDocument"("tourId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guide" ADD CONSTRAINT "Guide_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAvailability" ADD CONSTRAINT "ResourceAvailability_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAvailability" ADD CONSTRAINT "ResourceAvailability_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAvailability" ADD CONSTRAINT "ResourceAvailability_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAvailability" ADD CONSTRAINT "ResourceAvailability_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAvailability" ADD CONSTRAINT "ResourceAvailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAssignment" ADD CONSTRAINT "ResourceAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierConfirmation" ADD CONSTRAINT "SupplierConfirmation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierConfirmation" ADD CONSTRAINT "SupplierConfirmation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierConfirmation" ADD CONSTRAINT "SupplierConfirmation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourIncident" ADD CONSTRAINT "TourIncident_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourIncident" ADD CONSTRAINT "TourIncident_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourIncident" ADD CONSTRAINT "TourIncident_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDocument" ADD CONSTRAINT "OperationalDocument_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalDocument" ADD CONSTRAINT "OperationalDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce resource and range invariants below the application layer.
ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_capacity_positive" CHECK ("capacity" > 0);

ALTER TABLE "Equipment"
  ADD CONSTRAINT "Equipment_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "ResourceAvailability"
  ADD CONSTRAINT "ResourceAvailability_valid_range" CHECK ("startDate" <= "endDate"),
  ADD CONSTRAINT "ResourceAvailability_matching_resource" CHECK (
    ("resourceType" = 'VEHICLE' AND "vehicleId" IS NOT NULL AND "driverId" IS NULL AND "guideId" IS NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'DRIVER' AND "vehicleId" IS NULL AND "driverId" IS NOT NULL AND "guideId" IS NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'GUIDE' AND "vehicleId" IS NULL AND "driverId" IS NULL AND "guideId" IS NOT NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'EQUIPMENT' AND "vehicleId" IS NULL AND "driverId" IS NULL AND "guideId" IS NULL AND "equipmentId" IS NOT NULL)
  );

ALTER TABLE "ResourceAssignment"
  ADD CONSTRAINT "ResourceAssignment_valid_range" CHECK ("startDate" <= "endDate"),
  ADD CONSTRAINT "ResourceAssignment_matching_resource" CHECK (
    ("resourceType" = 'VEHICLE' AND "vehicleId" IS NOT NULL AND "driverId" IS NULL AND "guideId" IS NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'DRIVER' AND "vehicleId" IS NULL AND "driverId" IS NOT NULL AND "guideId" IS NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'GUIDE' AND "vehicleId" IS NULL AND "driverId" IS NULL AND "guideId" IS NOT NULL AND "equipmentId" IS NULL) OR
    ("resourceType" = 'EQUIPMENT' AND "vehicleId" IS NULL AND "driverId" IS NULL AND "guideId" IS NULL AND "equipmentId" IS NOT NULL)
  );

ALTER TABLE "VehicleMaintenance"
  ADD CONSTRAINT "VehicleMaintenance_valid_range" CHECK ("startDate" <= "endDate"),
  ADD CONSTRAINT "VehicleMaintenance_cost_nonnegative" CHECK ("cost" >= 0);
