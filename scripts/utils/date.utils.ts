export function extractDateFromPath(filePath: string): string {
  // Regex to match exactly 4 digits, a dash, 2 digits, a dash, and 2 digits
  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const match = filePath.match(dateRegex);

  // If a match is found, return it; otherwise, return null
  return match ? match[0] : new Date().toDateString();
}

/**
 * Converts a YYYY-MM-DD string into a local Date object.
 * @param dateStr - The input string (e.g., "2026-06-09")
 * @returns A Date object set to midnight local time, or null if invalid.
 */
export function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const year = parts[0] ? parseInt(parts[0], 10) : 0;
  // Month is 0-indexed in JavaScript (0 = January, 5 = June)
  const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts[2] ? parseInt(parts[2], 10) : 0;

  const date = new Date(year, month, day);

  // Check if the date is valid (e.g., avoids 2026-02-31)
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns a new Date object representing the next day.
 * @param date - The base Date object.
 * @returns A new Date object set to tomorrow.
 */
export function getTomorrowDate(date: Date | null): Date {

  if (!date) return new Date();

  // Create a copy of the original date to avoid mutating it
  const tomorrow = new Date(date);

  // Add 1 to the current day of the month
  // JavaScript automatically handles month and year rollovers (e.g., Dec 31 -> Jan 1)
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow;
}

/**
 * Formats a Date object into a 'yyyy-MM-dd' string based on local time.
 * @param date - The Date object to format.
 * @returns The formatted date string.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();

  // getMonth() is 0-indexed, so we add 1. 
  // padStart(2, '0') ensures it is always two digits (e.g., "06" instead of "6")
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getYesterdayDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}