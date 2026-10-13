import { ESTIMATED_ELOS, formatOpponentLabel, isSupportedElo } from './difficulty'

describe('Estimated Elo catalogue', () => {
  it('contains exactly 200 through 2200 in 100-point increments', () => {
    expect(ESTIMATED_ELOS).toEqual(Array.from({ length: 21 }, (_, index) => 200 + index * 100))
  })

  it('labels the AI as an estimated Elo strength', () => {
    expect(formatOpponentLabel(200)).toBe('AI · Estimated Elo 200')
  })

  it('rejects unsupported values', () => {
    expect(isSupportedElo(250)).toBe(false)
  })
})
