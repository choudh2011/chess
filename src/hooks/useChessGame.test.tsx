import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
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
})
