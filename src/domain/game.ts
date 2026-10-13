import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { isSupportedElo } from './difficulty'

export type GamePhase = 'player-turn' | 'ai-thinking' | 'game-over'

export interface GameMove {
  from: string
  to: string
  promotion?: string
}

export interface GameState {
  fen: string
  history: string[]
  selectedElo: number
  phase: GamePhase
  outcome: string | null
}

export function newGame(selectedElo: number): GameState {
  if (!isSupportedElo(selectedElo)) {
    throw new Error(`Unsupported estimated Elo: ${selectedElo}`)
  }

  return toGameState(new Chess(), selectedElo, 'player-turn', [])
}

export function applyPlayerMove(
  state: GameState,
  from: string,
  to: string,
  promotion?: string,
): GameState {
  if (state.phase !== 'player-turn') {
    return state
  }

  const chess = new Chess(state.fen)
  if (chess.turn() !== 'w') {
    return state
  }

  const san = tryMove(chess, { from, to, promotion })
  if (!san) {
    return state
  }

  return toGameState(
    chess,
    state.selectedElo,
    chess.isGameOver() ? 'game-over' : 'ai-thinking',
    [...state.history, san],
  )
}

export function applyAiMove(state: GameState, move: GameMove): GameState {
  if (state.phase !== 'ai-thinking') {
    return state
  }

  const chess = new Chess(state.fen)
  const san = chess.turn() === 'b' ? tryMove(chess, move) : null
  if (!san) {
    return state
  }

  return toGameState(
    chess,
    state.selectedElo,
    chess.isGameOver() ? 'game-over' : 'player-turn',
    [...state.history, san],
  )
}

export function getLegalMoves(fen: string): GameMove[] {
  const chess = new Chess(fen)

  return chess.moves({ verbose: true }).map((move) => ({
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  }))
}

function tryMove(chess: Chess, move: GameMove): string | null {
  try {
    const appliedMove = chess.move({
      from: move.from as Square,
      to: move.to as Square,
      ...(move.promotion ? { promotion: move.promotion as PieceSymbol } : {}),
    })
    return appliedMove.san
  } catch {
    return null
  }
}

function toGameState(
  chess: Chess,
  selectedElo: number,
  phase: GamePhase,
  history: string[],
): GameState {
  return {
    fen: chess.fen(),
    history,
    selectedElo,
    phase,
    outcome: phase === 'game-over' ? describeOutcome(chess) : null,
  }
}

function describeOutcome(chess: Chess): string {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate'
  }

  if (chess.isStalemate()) {
    return 'Draw by stalemate'
  }

  if (chess.isThreefoldRepetition()) {
    return 'Draw by threefold repetition'
  }

  if (chess.isDrawByFiftyMoves()) {
    return 'Draw by fifty-move rule'
  }

  return 'Draw by insufficient material'
}
