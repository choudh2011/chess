import { render, screen } from '@testing-library/react'
import App from './App'

it('renders the new game heading', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: /play chess against ai/i })).toBeVisible()
})
