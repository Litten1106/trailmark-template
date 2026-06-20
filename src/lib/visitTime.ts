/** Format visit window from planned arrival + duration. */
export function formatVisitWindow(
  plannedAt?: string,
  durationMin?: number,
): string | null {
  if (plannedAt && durationMin != null) {
    const [h, m] = plannedAt.split(':').map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      const endTotal = h * 60 + m + durationMin;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${plannedAt} – ${pad(endH)}:${pad(endM)}`;
    }
  }
  if (plannedAt) return plannedAt;
  if (durationMin != null) return `约 ${durationMin} 分钟`;
  return null;
}

/** Tab label e.g. "09.23 周二" from YYYY-MM-DD. */
export function formatDayTabLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const weekday = d.toLocaleDateString('zh-CN', { weekday: 'short' });
  return `${mm}.${dd} ${weekday}`;
}
