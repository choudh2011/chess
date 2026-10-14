import { render, screen } from '@testing-library/react'
import App from './App'

it('renders the new game heading', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: /play chess against ai/i })).toBeVisible()
  expect(screen.getByLabelText(/play as/i)).toHaveValue('white')
  expect(screen.getByRole('heading', { name: /live game/i })).toBeVisible()
})
