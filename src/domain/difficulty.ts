export const ESTIMATED_ELOS = Array.from(
  { length: 21 },
  (_, index) => 200 + index * 100,
) as readonly number[]

export function isSupportedElo(elo: number): boolean {
  return ESTIMATED_ELOS.includes(elo)
}

export function formatOpponentLabel(elo: number): string {
  return `AI · Estimated Elo ${elo}`
}
