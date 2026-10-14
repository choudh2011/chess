import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewGamePanel } from './NewGamePanel'

describe('NewGamePanel', () => {
  it('shows exactly 21 strengths and the estimated-Elo disclaimer', async () => {
    const user = userEvent.setup()
    const onSelectElo = vi.fn()
    const onSelectPlayerColor = vi.fn()
    const onStart = vi.fn()

    render(
      <NewGamePanel
        selectedElo={200}
        selectedPlayerColor="white"
        onSelectElo={onSelectElo}
        onSelectPlayerColor={onSelectPlayerColor}
        onStart={onStart}
      />,
    )

    const eloSelector = screen.getByLabelText(/estimated elo strength/i)
    expect(eloSelector).toHaveValue('200')
    expect(within(eloSelector).getAllByRole('option')).toHaveLength(21)
    expect(screen.getByText(/not a chess\.org rating/i)).toBeVisible()

    await user.selectOptions(eloSelector, '1800')
    expect(onSelectElo).toHaveBeenCalledWith(1800)

    await user.selectOptions(screen.getByLabelText(/play as/i), 'black')
    expect(onSelectPlayerColor).toHaveBeenCalledWith('black')
  })
})
