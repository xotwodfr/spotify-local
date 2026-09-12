export function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatFullDuration(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return "";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} sec`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 1) return `${minutes} min`;
  return `${hours} hr ${rest} min`;
}

export function formatCount(count?: number, singular = "item"): string {
  if (typeof count !== "number" || !Number.isFinite(count)) return "0";
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}