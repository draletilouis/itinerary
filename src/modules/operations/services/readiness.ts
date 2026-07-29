import type {
  BookingStatus,
  IncidentSeverity,
  IncidentStatus,
  OperationalTaskStatus,
  ResourceAssignmentStatus,
  ResourceType,
} from "@prisma/client";

type ReadinessInput = {
  bookingStatus: BookingStatus | null;
  acceptedItineraryVersionId: string | null;
  travellerCount: number;
  tourStartDate: Date;
  tourEndDate: Date;
  assignments: Array<{
    resourceType: ResourceType;
    status: ResourceAssignmentStatus;
    startDate: Date;
    endDate: Date;
  }>;
  tasks: Array<{ mandatory: boolean; status: OperationalTaskStatus }>;
  incidents: Array<{ severity: IncidentSeverity; status: IncidentStatus }>;
};

export type ReadinessResult = {
  ready: boolean;
  score: number;
  checks: Array<{ key: string; label: string; passed: boolean; detail: string }>;
  blockers: string[];
};

function coversTour(
  entry: { startDate: Date; endDate: Date },
  input: Pick<ReadinessInput, "tourStartDate" | "tourEndDate">,
) {
  return entry.startDate <= input.tourStartDate && entry.endDate >= input.tourEndDate;
}

export function calculateOperationalReadiness(input: ReadinessInput): ReadinessResult {
  const confirmedTypes = new Set(
    input.assignments
      .filter(
        (entry) =>
          entry.status === "CONFIRMED" && coversTour(entry, input),
      )
      .map((entry) => entry.resourceType),
  );
  const incompleteMandatoryTasks = input.tasks.filter(
    (task) =>
      task.mandatory && !["COMPLETED", "WAIVED"].includes(task.status),
  ).length;
  const seriousIncidents = input.incidents.filter(
    (incident) =>
      ["HIGH", "CRITICAL"].includes(incident.severity) &&
      !["RESOLVED", "CLOSED"].includes(incident.status),
  ).length;
  const bookingReady =
    input.bookingStatus !== null &&
    !["PROVISIONAL", "AWAITING_DEPOSIT", "CANCELLED", "REFUNDED"].includes(
      input.bookingStatus,
    );

  const checks = [
    {
      key: "booking",
      label: "Booking financially confirmed",
      passed: bookingReady,
      detail: input.bookingStatus
        ? `Booking status: ${input.bookingStatus.toLowerCase().replaceAll("_", " ")}.`
        : "No booking exists.",
    },
    {
      key: "itinerary",
      label: "Accepted itinerary frozen",
      passed: Boolean(input.acceptedItineraryVersionId),
      detail: input.acceptedItineraryVersionId
        ? "Accepted itinerary version is linked."
        : "No accepted itinerary version is linked.",
    },
    {
      key: "travellers",
      label: "Travellers assigned",
      passed: input.travellerCount > 0,
      detail: `${input.travellerCount} traveller${input.travellerCount === 1 ? "" : "s"} assigned.`,
    },
    ...(["VEHICLE", "DRIVER", "GUIDE"] as const).map((resourceType) => ({
      key: resourceType.toLowerCase(),
      label: `${resourceType[0]}${resourceType.slice(1).toLowerCase()} confirmed for full tour`,
      passed: confirmedTypes.has(resourceType),
      detail: confirmedTypes.has(resourceType)
        ? "Confirmed assignment covers the full tour."
        : "No confirmed full-tour assignment.",
    })),
    {
      key: "tasks",
      label: "Mandatory operational tasks complete",
      passed: incompleteMandatoryTasks === 0,
      detail: `${incompleteMandatoryTasks} mandatory task${incompleteMandatoryTasks === 1 ? "" : "s"} incomplete.`,
    },
    {
      key: "incidents",
      label: "No serious open incident",
      passed: seriousIncidents === 0,
      detail: `${seriousIncidents} high or critical incident${seriousIncidents === 1 ? "" : "s"} open.`,
    },
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    ready: passed === checks.length,
    score: Math.round((passed / checks.length) * 100),
    checks,
    blockers: checks.filter((check) => !check.passed).map((check) => check.label),
  };
}
