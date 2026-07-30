"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { addItineraryItemAction } from "@/modules/itineraries/actions/itineraries";

type ItemType =
  | "ACTIVITY"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "MEAL"
  | "NOTE"
  | "OTHER";

type ActivityOption = {
  id: string;
  name: string;
  destinationId: string;
  category: string;
  durationMinutes: number | null;
};

type AccommodationOption = {
  id: string;
  name: string;
  destinationId: string;
  type: string;
  roomTypes: { id: string; name: string; maximumOccupancy: number }[];
};

const input = "mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm";
const area = "mt-2 min-h-20 w-full rounded-lg border bg-white p-3 text-sm";

export function ItineraryItemForm({
  itineraryId,
  versionId,
  dayId,
  destinationId,
  destinationName,
  activities,
  accommodations,
}: {
  itineraryId: string;
  versionId: string;
  dayId: string;
  destinationId: string | null;
  destinationName: string | null;
  activities: ActivityOption[];
  accommodations: AccommodationOption[];
}) {
  const [type, setType] = useState<ItemType>("ACTIVITY");
  const [activityId, setActivityId] = useState("");
  const [accommodationId, setAccommodationId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [guestsPerRoom, setGuestsPerRoom] = useState("2");

  const dayActivities = useMemo(
    () =>
      destinationId
        ? activities.filter((item) => item.destinationId === destinationId)
        : [],
    [activities, destinationId],
  );
  const dayAccommodations = useMemo(
    () =>
      destinationId
        ? accommodations.filter((item) => item.destinationId === destinationId)
        : [],
    [accommodations, destinationId],
  );
  const selectedActivity = dayActivities.find((item) => item.id === activityId);
  const selectedAccommodation = dayAccommodations.find(
    (item) => item.id === accommodationId,
  );
  const selectedRoomType = selectedAccommodation?.roomTypes.find((item) => item.id === roomTypeId);
  const catalogueTitle =
    type === "ACTIVITY"
      ? selectedActivity?.name ?? ""
      : type === "ACCOMMODATION"
        ? selectedAccommodation?.name ?? ""
        : "";
  const needsCatalogue =
    (type === "ACTIVITY" && !selectedActivity) ||
    (type === "ACCOMMODATION" && (!selectedAccommodation || !selectedRoomType));
  const showBothTimes = ["ACTIVITY", "TRANSPORT", "OTHER"].includes(type);
  const showStartTime = !["NOTE"].includes(type);

  function changeType(nextType: ItemType) {
    setType(nextType);
    setActivityId("");
    setAccommodationId("");
  }

  return (
    <details className="rounded-lg bg-[#f9fafb] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#011478]">
        <Plus className="mr-2 inline size-4" /> Add itinerary item
      </summary>
      <form action={addItineraryItemAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="itineraryId" value={itineraryId} />
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dayId" value={dayId} />

        <label className="text-xs font-medium sm:col-span-2">
          What are you adding?
          <select
            className={input}
            name="type"
            value={type}
            onChange={(event) => changeType(event.target.value as ItemType)}
          >
            <option value="ACTIVITY">Activity</option>
            <option value="ACCOMMODATION">Accommodation / overnight</option>
            <option value="TRANSPORT">Transport</option>
            <option value="MEAL">Meal</option>
            <option value="NOTE">Customer note</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        {type === "ACTIVITY" ? (
          <label className="text-xs font-medium sm:col-span-2">
            Activity in {destinationName ?? "this day’s destination"}
            <select
              className={input}
              name="activityId"
              value={activityId}
              onChange={(event) => setActivityId(event.target.value)}
              required
              disabled={!dayActivities.length}
            >
              <option value="">
                {destinationId
                  ? dayActivities.length
                    ? "Select activity"
                    : "No activities configured for this destination"
                  : "Set the day’s destination first"}
              </option>
              {dayActivities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.category}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] leading-4 text-[#6b7280]">
              Only activities catalogued under this day’s destination are shown.
            </span>
          </label>
        ) : null}

        {type === "ACCOMMODATION" ? (
          <label className="text-xs font-medium sm:col-span-2">
            Accommodation in {destinationName ?? "this day’s destination"}
            <select
              className={input}
              name="accommodationId"
              value={accommodationId}
              onChange={(event) => {
                setAccommodationId(event.target.value);
                setRoomTypeId("");
              }}
              required
              disabled={!dayAccommodations.length}
            >
              <option value="">
                {destinationId
                  ? dayAccommodations.length
                    ? "Select accommodation"
                    : "No accommodation configured for this destination"
                  : "Set the day’s destination first"}
              </option>
              {dayAccommodations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.type}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] leading-4 text-[#6b7280]">
              Only properties catalogued under this day’s destination are shown.
            </span>
          </label>
        ) : null}

        {type === "ACCOMMODATION" && selectedAccommodation ? (
          <div className="grid gap-4 rounded-lg border bg-white p-4 sm:col-span-2 sm:grid-cols-2">
            <label className="text-xs font-medium">
              Room type
              <select
                className={input}
                name="roomTypeId"
                value={roomTypeId}
                onChange={(event) => {
                  const nextRoomTypeId = event.target.value;
                  setRoomTypeId(nextRoomTypeId);
                  const room = selectedAccommodation.roomTypes.find((item) => item.id === nextRoomTypeId);
                  setGuestsPerRoom(String(Math.min(2, room?.maximumOccupancy ?? 2)));
                }}
                required
              >
                <option value="">Select room type</option>
                {selectedAccommodation.roomTypes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} · up to {room.maximumOccupancy} guests
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              People in each room
              <select
                className={input}
                name="guestsPerRoom"
                value={guestsPerRoom}
                onChange={(event) => setGuestsPerRoom(event.target.value)}
                required
                disabled={!selectedRoomType}
              >
                {Array.from({ length: selectedRoomType?.maximumOccupancy ?? 0 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count} {count === 1 ? "person" : "people"} per room</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-[#6b7280]">
                Costing will calculate how many rooms the tour group needs.
              </span>
            </label>
          </div>
        ) : null}
        {["ACTIVITY", "ACCOMMODATION"].includes(type) ? (
          <input type="hidden" name="title" value={catalogueTitle} />
        ) : (
          <label className="text-xs font-medium sm:col-span-2">
            {type === "MEAL"
              ? "Meal name"
              : type === "TRANSPORT"
                ? "Transport description"
                : type === "NOTE"
                  ? "Note title"
                  : "Title"}
            <input
              className={input}
              name="title"
              required
              placeholder={
                type === "MEAL"
                  ? "e.g. Lunch"
                  : type === "TRANSPORT"
                    ? "e.g. Transfer to Bwindi"
                    : ""
              }
            />
          </label>
        )}

        {showStartTime ? (
          <label className="text-xs font-medium">
            {type === "ACCOMMODATION"
              ? "Check-in time"
              : type === "MEAL"
                ? "Serving time"
                : type === "TRANSPORT"
                  ? "Departure time"
                  : "Start time"}
            <input className={input} name="startTime" type="time" />
          </label>
        ) : null}
        {showBothTimes ? (
          <label className="text-xs font-medium">
            {type === "TRANSPORT" ? "Arrival time" : "End time"}
            <input className={input} name="endTime" type="time" />
          </label>
        ) : null}

        <details className="rounded-lg border bg-white sm:col-span-2">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#011478]">
            Add customer-facing description
          </summary>
          <div className="border-t p-4">
            <textarea
              className={area}
              name="clientDescription"
              placeholder="Optional description shown in the itinerary"
            />
          </div>
        </details>

        <div className="sm:col-span-2">
          <button
            className="h-10 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
            disabled={needsCatalogue}
          >
            Add item
          </button>
        </div>
      </form>
    </details>
  );
}
