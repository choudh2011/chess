import { Chess } from 'chess.js'
import { WeakMoveProvider } from './weak-provider'

describe('WeakMoveProvider', () => {
  it('returns a legal move for the current side', async () => {
    const chess = new Chess()
    chess.move('e4')
    const provider = new WeakMoveProvider(() => 0)

    const move = await provider.chooseMove({
      fen: chess.fen(),
      estimatedElo: 200,
      requestId: 1,
    })

    expect(chess.moves({ verbose: true }).some((candidate) =>
      candidate.from === move.from && candidate.to === move.to,
    )).toBe(true)
  })
})
