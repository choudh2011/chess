import { Chess } from 'chess.js'
import { createReviewGame, type GameState } from './game'

const STANDARD_INITIAL_FEN = new Chess().fen()

export function exportPgn(state: GameState): string {
  const chess = new Chess(state.initialFen)

  for (const [name, value] of Object.entries({
    ...state.headers,
    Event: state.headers.Event || 'Local browser chess',
    Result: state.headers.Result || '*',
  })) {
    chess.setHeader(name, value)
  }

  for (const san of state.history) {
    chess.move(san)
  }

  return chess.pgn()
}

export function importPgn(text: string, selectedElo: number): GameState {
  if (!text.trim()) {
    throw new Error('Unable to import PGN: the file is empty.')
  }

  try {
    const chess = new Chess()
    chess.loadPgn(text, { strict: false })
    const headers = chess.getHeaders()
    const initialFen = headers.FEN || STANDARD_INITIAL_FEN

    return createReviewGame(selectedElo, chess.history(), initialFen, headers)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown parse error'
    throw new Error(`Unable to import PGN: ${detail}`)
  }
}
