"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ResourceType } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { assignResourcesBulkAction } from "@/modules/resources/actions/resources";
import {
  initialBulkResourceAssignmentState,
  type BulkResourceAssignmentRow,
} from "@/modules/resources/types";

const resourceTypes: ResourceType[] = [
  "VEHICLE",
  "DRIVER",
  "GUIDE",
  "EQUIPMENT",
];
const input =
  "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

type TourOption = {
  id: string;
  reference: string;
  name: string;
  startDate: string;
  endDate: string;
};

type ResourceOption = {
  id: string;
  type: ResourceType;
  label: string;
};

function newRow(
  id: string,
  resourceType: ResourceType,
  startDate = "",
  endDate = "",
): BulkResourceAssignmentRow {
  return {
    id,
    resourceType,
    resourceId: "",
    startDate,
    endDate,
    notes: "",
    conflictOverrideReason: "",
  };
}

function initialRows() {
  return [
    newRow("resource-row-vehicle", "VEHICLE"),
    newRow("resource-row-driver", "DRIVER"),
    newRow("resource-row-guide", "GUIDE"),
  ];
}

export function BulkResourceAssignmentForm({
  tours,
  resources,
  initialTourId = "",
}: {
  tours: readonly TourOption[];
  resources: readonly ResourceOption[];
  initialTourId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    assignResourcesBulkAction,
    initialBulkResourceAssignmentState,
  );
  const initialTour = tours.find((entry) => entry.id === initialTourId);
  const [tourId, setTourId] = useState(initialTour?.id ?? "");
  const [rows, setRows] = useState<BulkResourceAssignmentRow[]>(() =>
    initialRows().map((row) => ({
      ...row,
      startDate: initialTour?.startDate ?? "",
      endDate: initialTour?.endDate ?? "",
    })),
  );
  const lastSuccess = useRef<string | undefined>(undefined);
  const nextRowId = useRef(0);

  const resourcesByType = useMemo(
    () =>
      Object.fromEntries(
        resourceTypes.map((type) => [
          type,
          resources.filter((resource) => resource.type === type),
        ]),
      ) as Record<ResourceType, ResourceOption[]>,
    [resources],
  );

  useEffect(() => {
    if (
      state.status !== "success" ||
      !state.submissionId ||
      state.submissionId === lastSuccess.current
    ) {
      return;
    }
    lastSuccess.current = state.submissionId;
    setRows((current) =>
      current.map((row) => ({
        ...row,
        resourceId: "",
        notes: "",
        conflictOverrideReason: "",
      })),
    );
  }, [state]);

  function updateRow(
    id: string,
    update:
      | Partial<BulkResourceAssignmentRow>
      | ((row: BulkResourceAssignmentRow) => Partial<BulkResourceAssignmentRow>),
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              ...(typeof update === "function" ? update(row) : update),
            }
          : row,
      ),
    );
  }

  function selectTour(nextTourId: string) {
    setTourId(nextTourId);
    const tour = tours.find((entry) => entry.id === nextTourId);
    if (!tour) return;
    setRows((current) =>
      current.map((row) => ({
        ...row,
        startDate: tour.startDate,
        endDate: tour.endDate,
      })),
    );
  }

  function addRow() {
    const tour = tours.find((entry) => entry.id === tourId);
    const nextType =
      resourceTypes.find(
        (type) => !rows.some((row) => row.resourceType === type),
      ) ?? "EQUIPMENT";
    nextRowId.current += 1;
    setRows((current) => [
      ...current,
      newRow(
        `resource-row-extra-${nextRowId.current}`,
        nextType,
        tour?.startDate,
        tour?.endDate,
      ),
    ]);
  }

  return (
    <details open className="rounded-xl border bg-white">
      <summary className="cursor-pointer px-5 py-4">
        <span className="text-sm font-semibold">Assign resources to tour</span>
        <span className="ml-2 text-xs text-[#6b7280]">
          Select the tour once, then add its full team and equipment.
        </span>
      </summary>

      <form action={formAction} className="space-y-5 border-t p-5">
        <input
          type="hidden"
          name="assignmentBatch"
          value={JSON.stringify(rows)}
        />

        <label className="block max-w-3xl text-xs font-medium">
          Tour
          <select
            className={input}
            name="tourId"
            required
            value={tourId}
            onChange={(event) => selectTour(event.target.value)}
          >
            <option value="" disabled>
              Select tour
            </option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.reference}  -  {tour.name}  -  {tour.startDate}-{tour.endDate}
              </option>
            ))}
          </select>
        </label>

        {state.message ? (
          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {state.status === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        ) : null}

        <div className="space-y-4">
          {rows.map((row, index) => {
            const rowErrors = state.rowErrors[row.id] ?? [];
            const availableResources = resourcesByType[row.resourceType];
            return (
              <article
                id={row.id}
                key={row.id}
                className={`rounded-xl border p-4 ${
                  rowErrors.length ? "border-red-300 bg-red-50/40" : "bg-[#f9fafb]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Resource {index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) =>
                        current.filter((entry) => entry.id !== row.id),
                      )
                    }
                    disabled={rows.length === 1}
                    className="flex h-9 items-center gap-1 rounded-lg border bg-white px-3 text-xs font-semibold text-red-700 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </button>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-xs font-medium">
                    Resource type
                    <select
                      className={input}
                      value={row.resourceType}
                      onChange={(event) =>
                        updateRow(row.id, {
                          resourceType: event.target.value as ResourceType,
                          resourceId: "",
                        })
                      }
                    >
                      {resourceTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-medium">
                    Resource
                    <select
                      className={input}
                      required
                      value={row.resourceId}
                      onChange={(event) =>
                        updateRow(row.id, { resourceId: event.target.value })
                      }
                    >
                      <option value="" disabled>
                        {availableResources.length
                          ? `Select ${row.resourceType.toLowerCase()}`
                          : `No active ${row.resourceType.toLowerCase()} available`}
                      </option>
                      {availableResources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-medium">
                    From
                    <input
                      className={input}
                      type="date"
                      required
                      value={row.startDate}
                      onChange={(event) =>
                        updateRow(row.id, { startDate: event.target.value })
                      }
                    />
                  </label>

                  <label className="text-xs font-medium">
                    To
                    <input
                      className={input}
                      type="date"
                      required
                      value={row.endDate}
                      onChange={(event) =>
                        updateRow(row.id, { endDate: event.target.value })
                      }
                    />
                  </label>
                </div>

                <details className="mt-3 rounded-lg border bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#011478]">
                    Notes and conflict override
                  </summary>
                  <div className="grid gap-3 border-t p-3 md:grid-cols-2">
                    <label className="text-xs font-medium">
                      Assignment notes
                      <input
                        className={input}
                        value={row.notes}
                        onChange={(event) =>
                          updateRow(row.id, { notes: event.target.value })
                        }
                      />
                    </label>
                    <label className="text-xs font-medium">
                      Conflict override reason
                      <input
                        className={input}
                        value={row.conflictOverrideReason}
                        placeholder="Only when an identified conflict is approved"
                        onChange={(event) =>
                          updateRow(row.id, {
                            conflictOverrideReason: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </details>

                {rowErrors.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-red-700">
                    {rowErrors.map((error) => (
                      <li key={error}>* {error}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addRow}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold text-[#011478]"
          >
            <Plus className="size-4" /> Add another resource
          </button>
          <button
            disabled={pending || !tourId || !rows.length}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {pending
              ? "Checking resources..."
              : `Check and assign ${rows.length} resource${rows.length === 1 ? "" : "s"}`}
          </button>
        </div>

        <p className="text-xs leading-5 text-[#6b7280]">
          All rows are checked together. If any row fails, no assignments are
          saved. Successful assignments begin as provisional and can be confirmed
          in the table below.
        </p>
      </form>
    </details>
  );
}
