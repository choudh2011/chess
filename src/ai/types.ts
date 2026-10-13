export interface AiMoveRequest {
  fen: string
  estimatedElo: number
  requestId: number
}

export interface AiMove {
  requestId: number
  from: string
  to: string
  promotion?: string
}

export interface AiMoveProvider {
  chooseMove(request: AiMoveRequest): Promise<AiMove>
  stop?(): void
}
