import type { ResourceType } from "@prisma/client";

export type BulkResourceAssignmentRow = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  startDate: string;
  endDate: string;
  notes: string;
  conflictOverrideReason: string;
};

export type BulkResourceAssignmentState = {
  status: "idle" | "success" | "error";
  message: string;
  rowErrors: Record<string, string[]>;
  submissionId?: string;
};

export const initialBulkResourceAssignmentState: BulkResourceAssignmentState = {
  status: "idle",
  message: "",
  rowErrors: {},
};
