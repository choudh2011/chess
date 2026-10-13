import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewGamePanel } from './NewGamePanel'

describe('NewGamePanel', () => {
  it('shows exactly 21 strengths and the estimated-Elo disclaimer', async () => {
    const user = userEvent.setup()
    const onSelectElo = vi.fn()
    const onStart = vi.fn()

    render(<NewGamePanel selectedElo={200} onSelectElo={onSelectElo} onStart={onStart} />)

    expect(screen.getByLabelText(/estimated elo strength/i)).toHaveValue('200')
    expect(screen.getAllByRole('option')).toHaveLength(21)
    expect(screen.getByText(/not a chess\.org rating/i)).toBeVisible()

    await user.selectOptions(screen.getByLabelText(/estimated elo strength/i), '1800')
    expect(onSelectElo).toHaveBeenCalledWith(1800)
  })
})
