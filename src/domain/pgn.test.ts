import { applyAiMove, applyPlayerMove, newGame } from './game'
import { exportPgn, importPgn } from './pgn'

describe('PGN records', () => {
  it('exports a portable PGN containing headers and SAN moves', () => {
    const game = applyAiMove(applyPlayerMove(newGame(200), 'e2', 'e4'), { from: 'e7', to: 'e5' })
    const pgn = exportPgn(game)

    expect(pgn).toContain('[Event "Local browser chess"]')
    expect(pgn).toContain('1. e4 e5')
  })

  it('imports a valid PGN as an initial-position read-only review', () => {
    const review = importPgn('[Event "Example"]\n\n1. e4 e5 2. Nf3 Nc6 *', 200)

    expect(review).toMatchObject({
      mode: 'review',
      phase: 'review',
      viewPly: 0,
      history: ['e4', 'e5', 'Nf3', 'Nc6'],
    })
    expect(review.fen).toContain(' w ')
  })

  it('rejects invalid PGN with a readable error', () => {
    expect(() => importPgn('this is not a chess game', 200)).toThrow(/PGN/i)
  })
})
