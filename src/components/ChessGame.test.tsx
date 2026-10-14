import { render, screen } from '@testing-library/react'
import { newGame } from '../domain/game'
import { ChessGame } from './ChessGame'

describe('ChessGame', () => {
  it('shows the opponent label and player turn', () => {
    render(<ChessGame state={newGame(200)} isBoardInteractive onMove={vi.fn()} />)

    expect(screen.getByText('AI · Estimated Elo 200')).toBeVisible()
    expect(screen.getByText(/your turn/i)).toBeVisible()
  })

  it('shows AI thinking and locks the board interaction', () => {
    const state = { ...newGame(200), phase: 'ai-thinking' as const }

    render(<ChessGame state={state} isBoardInteractive={false} onMove={vi.fn()} />)

    expect(screen.getByText(/ai is thinking/i)).toBeVisible()
    expect(screen.getByLabelText(/chess board/i)).toHaveAttribute('data-interactive', 'false')
  })

  it('orients the board for Black and labels read-only review mode', () => {
    const state = { ...newGame(200, 'black'), mode: 'review' as const, phase: 'review' as const }

    render(<ChessGame state={state} isBoardInteractive={false} onMove={vi.fn()} />)

    expect(screen.getByText(/review mode/i)).toBeVisible()
    expect(screen.getByLabelText(/chess board/i)).toHaveAttribute('data-orientation', 'black')
  })
})
