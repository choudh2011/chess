import { useCallback, useRef, useState } from 'react'
import type { AiMoveProvider } from '../ai/types'
import {
  applyAiMove,
  applyPlayerMove,
  isPlayerTurn,
  newGame,
  setReviewPly,
  type GameState,
  type PlayerColor,
} from '../domain/game'

export interface ChessGameController {
  state: GameState
  startGame: (elo: number, playerColor?: PlayerColor) => void
  movePlayer: (from: string, to: string, promotion?: string) => void
  loadReview: (review: GameState) => void
  navigateReview: (ply: number) => void
  isBoardInteractive: boolean
}

export function useChessGame(provider: AiMoveProvider): ChessGameController {
  const [state, setState] = useState<GameState>(() => newGame(200))
  const stateRef = useRef(state)
  const requestId = useRef(0)

  const replaceState = useCallback((nextState: GameState) => {
    stateRef.current = nextState
    setState(nextState)
  }, [])

  const requestAiMove = useCallback((game: GameState) => {
    if (game.phase !== 'ai-thinking') {
      return
    }

    const activeRequestId = requestId.current + 1
    requestId.current = activeRequestId

    void provider.chooseMove({
      fen: game.fen,
      estimatedElo: game.selectedElo,
      requestId: activeRequestId,
    }).then((move) => {
      if (move.requestId !== requestId.current) {
        return
      }

      replaceState(applyAiMove(stateRef.current, move))
    }).catch(() => {
      // Keep the valid position intact. The user can start a new game.
    })
  }, [provider, replaceState])

  const startGame = useCallback((elo: number, playerColor: PlayerColor = 'white') => {
    requestId.current += 1
    provider.stop?.()
    const nextState = newGame(elo, playerColor)
    replaceState(nextState)
    requestAiMove(nextState)
  }, [provider, replaceState, requestAiMove])

  const movePlayer = useCallback((from: string, to: string, promotion?: string) => {
    const afterPlayerMove = applyPlayerMove(stateRef.current, from, to, promotion)
    if (afterPlayerMove === stateRef.current) {
      return
    }

    replaceState(afterPlayerMove)
    requestAiMove(afterPlayerMove)
  }, [replaceState, requestAiMove])

  const loadReview = useCallback((review: GameState) => {
    requestId.current += 1
    provider.stop?.()
    replaceState(setReviewPly(review, 0))
  }, [provider, replaceState])

  const navigateReview = useCallback((ply: number) => {
    if (stateRef.current.mode !== 'review' && stateRef.current.phase !== 'game-over') {
      return
    }

    replaceState(setReviewPly(stateRef.current, ply))
  }, [replaceState])

  return {
    state,
    startGame,
    movePlayer,
    loadReview,
    navigateReview,
    isBoardInteractive: isPlayerTurn(state),
  }
}
