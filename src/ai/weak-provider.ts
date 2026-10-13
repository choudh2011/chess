import { getLegalMoves } from '../domain/game'
import type { AiMove, AiMoveProvider, AiMoveRequest } from './types'

export class WeakMoveProvider implements AiMoveProvider {
  constructor(private readonly random: () => number = Math.random) {}

  async chooseMove(request: AiMoveRequest): Promise<AiMove> {
    const legalMoves = getLegalMoves(request.fen)
    if (legalMoves.length === 0) {
      throw new Error('No legal AI move is available')
    }

    const move = legalMoves[Math.min(legalMoves.length - 1, Math.floor(this.random() * legalMoves.length))]

    return { ...move, requestId: request.requestId }
  }
}
