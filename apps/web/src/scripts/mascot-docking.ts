type Position = { x: number; y: number };

export type MascotDockingCurve = { bend: number };

/** Pick once per trip, never once per frame, so input cannot jitter the route. */
export function createMascotDockingCurve(previous?: MascotDockingCurve): MascotDockingCurve {
  let bend = (0.09 + Math.random() * 0.07) * (Math.random() < 0.5 ? -1 : 1);
  if (previous !== undefined && Math.abs(bend - previous.bend) < 0.035) {
    bend = -bend;
  }
  return { bend };
}

/** A quadratic arc with zero endpoint velocity/acceleration and a faster middle. */
export function getMascotDockingPosition(
  start: Position,
  end: Position,
  progress: number,
  curve: MascotDockingCurve,
): Position {
  const bounded = Math.min(1, Math.max(0, progress));
  const eased = bounded ** 3 * (bounded * (bounded * 6 - 15) + 10);
  const x = end.x - start.x;
  const y = end.y - start.y;
  const arc = 4 * eased * (1 - eased) * curve.bend;
  return {
    x: start.x + x * eased - y * arc,
    y: start.y + y * eased + x * arc,
  };
}
