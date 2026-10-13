import { useCallback, useRef, useState } from 'react'
import type { AiMoveProvider } from '../ai/types'
import { applyAiMove, applyPlayerMove, newGame, type GameState } from '../domain/game'

export interface ChessGameController {
  state: GameState
  startGame: (elo: number) => void
  movePlayer: (from: string, to: string, promotion?: string) => void
  isBoardInteractive: boolean
}

export function useChessGame(provider: AiMoveProvider): ChessGameController {
  const [state, setState] = useState<GameState>(() => newGame(200))
  const stateRef = useRef(state)
  const requestId = useRef(0)

  const startGame = useCallback((elo: number) => {
    requestId.current += 1
    provider.stop?.()
    const nextState = newGame(elo)
    stateRef.current = nextState
    setState(nextState)
  }, [provider])

  const movePlayer = useCallback((from: string, to: string, promotion?: string) => {
    const afterPlayerMove = applyPlayerMove(stateRef.current, from, to, promotion)
    if (afterPlayerMove === stateRef.current) {
      return
    }

    stateRef.current = afterPlayerMove
    setState(afterPlayerMove)

    if (afterPlayerMove.phase !== 'ai-thinking') {
      return
    }

    const activeRequestId = requestId.current + 1
    requestId.current = activeRequestId

    void provider.chooseMove({
      fen: afterPlayerMove.fen,
      estimatedElo: afterPlayerMove.selectedElo,
      requestId: activeRequestId,
    }).then((move) => {
      if (move.requestId !== requestId.current) {
        return
      }

      const afterAiMove = applyAiMove(stateRef.current, move)
      stateRef.current = afterAiMove
      setState(afterAiMove)
    }).catch(() => {
      // Keep the valid player position intact. A later UI task adds recovery messaging.
    })
  }, [provider])

  return {
    state,
    startGame,
    movePlayer,
    isBoardInteractive: state.phase === 'player-turn',
  }
}
