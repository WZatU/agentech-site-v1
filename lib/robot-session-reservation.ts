export type RobotSessionReservationCandidate = {
  id: number;
  created_at: string;
};

export function selectRobotSessionReservationWinner<
  T extends RobotSessionReservationCandidate,
>(sessions: T[]): T | null {
  return (
    [...sessions].sort((left, right) => {
      const leftCreatedAt = Date.parse(left.created_at);
      const rightCreatedAt = Date.parse(right.created_at);
      const leftTime = Number.isFinite(leftCreatedAt)
        ? leftCreatedAt
        : Number.POSITIVE_INFINITY;
      const rightTime = Number.isFinite(rightCreatedAt)
        ? rightCreatedAt
        : Number.POSITIVE_INFINITY;

      return leftTime - rightTime || left.id - right.id;
    })[0] ?? null
  );
}

export function isExclusiveRobotSessionReservation<
  T extends RobotSessionReservationCandidate,
>(sessions: T[], reservationId: number) {
  return sessions.length === 1 && sessions[0]?.id === reservationId;
}
