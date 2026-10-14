import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { isSupportedElo } from './difficulty'

export type GamePhase = 'player-turn' | 'ai-thinking' | 'game-over' | 'review'
export type PlayerColor = 'white' | 'black'
export type GameMode = 'play' | 'review'

export interface GameMove {
  from: string
  to: string
  promotion?: string
}

export interface GameState {
  fen: string
  history: string[]
  selectedElo: number
  playerColor: PlayerColor
  mode: GameMode
  viewPly: number
  initialFen: string
  headers: Record<string, string>
  phase: GamePhase
  outcome: string | null
}

export function newGame(selectedElo: number, playerColor: PlayerColor = 'white'): GameState {
  if (!isSupportedElo(selectedElo)) {
    throw new Error(`Unsupported estimated Elo: ${selectedElo}`)
  }

  const chess = new Chess()
  return toGameState(
    chess,
    selectedElo,
    playerColor === 'white' ? 'player-turn' : 'ai-thinking',
    [],
    playerColor,
    'play',
    chess.fen(),
    {
      Event: 'Local browser chess',
      White: playerColor === 'white' ? 'Player' : 'AI',
      Black: playerColor === 'black' ? 'Player' : 'AI',
      Result: '*',
    },
  )
}

export function createReviewGame(
  selectedElo: number,
  history: string[],
  initialFen: string,
  headers: Record<string, string>,
): GameState {
  if (!isSupportedElo(selectedElo)) {
    throw new Error(`Unsupported estimated Elo: ${selectedElo}`)
  }

  return toGameState(
    new Chess(initialFen),
    selectedElo,
    'review',
    history,
    'white',
    'review',
    initialFen,
    headers,
    0,
  )
}

export function applyPlayerMove(
  state: GameState,
  from: string,
  to: string,
  promotion?: string,
): GameState {
  if (!isPlayerTurn(state)) {
    return state
  }

  const chess = new Chess(state.fen)
  if (chess.turn() !== toChessColor(state.playerColor)) {
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
    state.playerColor,
    'play',
    state.initialFen,
    state.headers,
  )
}

export function applyAiMove(state: GameState, move: GameMove): GameState {
  if (state.mode !== 'play' || state.phase !== 'ai-thinking') {
    return state
  }

  const chess = new Chess(state.fen)
  const san = chess.turn() === oppositeChessColor(state.playerColor) ? tryMove(chess, move) : null
  if (!san) {
    return state
  }

  return toGameState(
    chess,
    state.selectedElo,
    chess.isGameOver() ? 'game-over' : 'player-turn',
    [...state.history, san],
    state.playerColor,
    'play',
    state.initialFen,
    state.headers,
  )
}

export function setReviewPly(state: GameState, requestedPly: number): GameState {
  const viewPly = Math.max(0, Math.min(state.history.length, requestedPly))
  const chess = new Chess(state.initialFen)

  for (const san of state.history.slice(0, viewPly)) {
    chess.move(san)
  }

  return toGameState(
    chess,
    state.selectedElo,
    'review',
    state.history,
    state.playerColor,
    'review',
    state.initialFen,
    state.headers,
    viewPly,
  )
}

export function isPlayerTurn(state: GameState): boolean {
  return state.mode === 'play' && state.phase === 'player-turn'
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
  playerColor: PlayerColor,
  mode: GameMode,
  initialFen: string,
  headers: Record<string, string>,
  viewPly: number = history.length,
): GameState {
  return {
    fen: chess.fen(),
    history,
    selectedElo,
    playerColor,
    mode,
    viewPly,
    initialFen,
    headers,
    phase,
    outcome: phase === 'game-over' ? describeOutcome(chess) : null,
  }
}

function toChessColor(playerColor: PlayerColor): 'w' | 'b' {
  return playerColor === 'white' ? 'w' : 'b'
}

function oppositeChessColor(playerColor: PlayerColor): 'w' | 'b' {
  return playerColor === 'white' ? 'b' : 'w'
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
