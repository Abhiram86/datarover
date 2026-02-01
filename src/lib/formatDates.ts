export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "Unknown";

  // If backend already gives a Date object
  if (value instanceof Date) {
    return value.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Convert to string just in case
  const str = String(value);

  // "2026-01-30 00:00:00+00" -> "2026-01-30T00:00:00+00:00"
  const iso = str.replace(" ", "T").replace(/\+00$/, "+00:00");

  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
