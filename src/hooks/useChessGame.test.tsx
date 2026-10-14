import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { importPgn } from '../domain/pgn'
import { WeakMoveProvider } from '../ai/weak-provider'
import { useChessGame } from './useChessGame'

describe('useChessGame', () => {
  it('locks the board during an AI turn and unlocks it after one legal reply', async () => {
    const { result } = renderHook(() => useChessGame(new WeakMoveProvider(() => 0)), {
      wrapper: StrictMode,
    })

    act(() => result.current.startGame(200))
    act(() => result.current.movePlayer('e2', 'e4'))

    expect(result.current.state.phase).toBe('ai-thinking')
    expect(result.current.isBoardInteractive).toBe(false)

    await waitFor(() => expect(result.current.state.phase).toBe('player-turn'))
    expect(result.current.isBoardInteractive).toBe(true)
    expect(result.current.state.history).toHaveLength(2)
  })

  it('asks the AI for White’s opening move when the player selects Black', async () => {
    const { result } = renderHook(() => useChessGame(new WeakMoveProvider(() => 0)), {
      wrapper: StrictMode,
    })

    act(() => result.current.startGame(200, 'black'))

    expect(result.current.state.phase).toBe('ai-thinking')
    await waitFor(() => expect(result.current.state.phase).toBe('player-turn'))
    expect(result.current.state.history).toHaveLength(1)
    expect(result.current.state.playerColor).toBe('black')
  })

  it('locks board input after loading a review and allows navigation only', () => {
    const { result } = renderHook(() => useChessGame(new WeakMoveProvider(() => 0)))
    const review = importPgn('1. e4 e5 *', 200)

    act(() => result.current.loadReview(review))
    expect(result.current.isBoardInteractive).toBe(false)
    act(() => result.current.navigateReview(1))
    expect(result.current.state.viewPly).toBe(1)
  })

  it('allows a finished live game to enter read-only review without importing PGN', async () => {
    const blackMoves = [
      { from: 'e7', to: 'e5' },
      { from: 'd8', to: 'h4' },
    ]
    const provider = {
      chooseMove: async ({ requestId }: { requestId: number }) => ({ ...blackMoves.shift()!, requestId }),
    }
    const { result } = renderHook(() => useChessGame(provider))

    act(() => result.current.movePlayer('f2', 'f3'))
    await waitFor(() => expect(result.current.state.phase).toBe('player-turn'))
    act(() => result.current.movePlayer('g2', 'g4'))
    await waitFor(() => expect(result.current.state.phase).toBe('game-over'))

    act(() => result.current.navigateReview(2))
    expect(result.current.state).toMatchObject({ mode: 'review', phase: 'review', viewPly: 2 })
    expect(result.current.isBoardInteractive).toBe(false)
  })
})
