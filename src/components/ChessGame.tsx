import { Chessboard } from 'react-chessboard'
import { formatOpponentLabel } from '../domain/difficulty'
import type { GameState } from '../domain/game'

interface ChessGameProps {
  state: GameState
  isBoardInteractive: boolean
  onMove: (from: string, to: string, promotion?: string) => void
}

export function ChessGame({ state, isBoardInteractive, onMove }: ChessGameProps) {
  const status = state.phase === 'player-turn'
    ? 'Your turn'
    : state.phase === 'ai-thinking'
      ? 'AI is thinking'
      : state.phase === 'review'
        ? 'Review mode'
      : state.outcome ?? 'Game over'

  return (
    <section className="game-panel" aria-live="polite">
      <div className="game-heading">
        <div>
          <p className="eyebrow">Opponent</p>
          <h2>{formatOpponentLabel(state.selectedElo)}</h2>
        </div>
        <p className="game-status">{status}</p>
      </div>
      <div
        aria-label="Chess board"
        className="chessboard-shell"
        data-interactive={String(isBoardInteractive)}
        data-orientation={state.playerColor}
      >
        <Chessboard
          options={{
            id: 'player-versus-ai-board',
            position: state.fen,
            boardOrientation: state.playerColor,
            allowDragging: isBoardInteractive,
            showNotation: true,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!isBoardInteractive || !sourceSquare || !targetSquare) {
                return false
              }

              onMove(sourceSquare, targetSquare, 'q')
              return true
            },
          }}
        />
      </div>
      <output data-testid="position-fen" className="visually-hidden">{state.fen}</output>
    </section>
  )
}
