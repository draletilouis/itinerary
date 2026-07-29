export function roomsRequired(totalGuests: number, guestsPerRoom: number) {
  if (!Number.isInteger(totalGuests) || totalGuests < 1) {
    throw new Error("Total guests must be a positive whole number.");
  }
  if (!Number.isInteger(guestsPerRoom) || guestsPerRoom < 1) {
    throw new Error("Guests per room must be a positive whole number.");
  }
  return Math.ceil(totalGuests / guestsPerRoom);
}
