import { createMoveProvider } from './provider-factory'
import { StockfishMoveProvider } from './stockfish-provider'
import { WeakMoveProvider } from './weak-provider'

describe('createMoveProvider', () => {
  it('uses the weak provider below the Stockfish Elo floor', () => {
    expect(createMoveProvider(1200)).toBeInstanceOf(WeakMoveProvider)
  })

  it('uses Stockfish at and above the engine-backed range', () => {
    expect(createMoveProvider(1300)).toBeInstanceOf(StockfishMoveProvider)
  })
})
