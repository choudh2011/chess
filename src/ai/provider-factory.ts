import type { AiMove, AiMoveProvider, AiMoveRequest } from './types'
import { StockfishMoveProvider } from './stockfish-provider'
import { WeakMoveProvider } from './weak-provider'

const STOCKFISH_ELO_FLOOR = 1300

export function createMoveProvider(estimatedElo: number): AiMoveProvider {
  return estimatedElo < STOCKFISH_ELO_FLOOR ? new WeakMoveProvider() : new StockfishMoveProvider()
}

export class DifficultyMoveProvider implements AiMoveProvider {
  private readonly weakProvider = new WeakMoveProvider()
  private readonly stockfishProvider = new StockfishMoveProvider()

  chooseMove(request: AiMoveRequest): Promise<AiMove> {
    return (request.estimatedElo < STOCKFISH_ELO_FLOOR ? this.weakProvider : this.stockfishProvider)
      .chooseMove(request)
  }

  stop(): void {
    this.stockfishProvider.stop()
  }
}
