import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { newGame } from '../domain/game'
import { setReviewPly } from '../domain/game'
import { importPgn } from '../domain/pgn'
import { GameRecordPanel } from './GameRecordPanel'

describe('GameRecordPanel', () => {
  it('shows ordered moves and asks to navigate to the next ply', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    const state = importPgn('1. e4 e5 2. Nf3 Nc6 *', 200)

    render(
      <GameRecordPanel
        state={state}
        onNavigate={onNavigate}
        onDownload={vi.fn()}
        onUploadText={vi.fn()}
      />,
    )

    expect(screen.getByText('1.')).toBeVisible()
    expect(screen.getByText('e4')).toBeVisible()
    expect(screen.getByText('e5')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /next move/i }))
    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it('keeps review navigation out of a live game record', () => {
    render(
      <GameRecordPanel
        state={newGame(200)}
        onNavigate={vi.fn()}
        onDownload={vi.fn()}
        onUploadText={vi.fn()}
      />,
    )

    expect(screen.getByText(/move 0 of 0/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: /next move/i })).not.toBeInTheDocument()
  })

  it('shows review navigation for a game that has ended locally', () => {
    const imported = importPgn('1. e4 e5 *', 200)
    const state = { ...setReviewPly(imported, 2), mode: 'play' as const, phase: 'game-over' as const }

    render(
      <GameRecordPanel
        state={state}
        onNavigate={vi.fn()}
        onDownload={vi.fn()}
        onUploadText={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /previous move/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next move/i })).toBeDisabled()
  })
})
