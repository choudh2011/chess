import { expect, test, type Page } from '@playwright/test'

async function dragPiece(page: Page, from: string, to: string) {
  const source = await page.locator(`#player-versus-ai-board-piece-wP-${from}`).boundingBox()
  const target = await page.locator(`[data-square="${to}"]`).boundingBox()

  if (!source || !target) {
    throw new Error(`Unable to drag a White pawn from ${from} to ${to}`)
  }

  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 })
  await page.mouse.up()
}

test('lists the approved Estimated Elo strengths and starts a 200 game', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByLabel(/estimated elo strength/i)).toHaveValue('200')
  await expect(page.getByRole('option')).toHaveCount(21)
  await expect(page.getByText(/not a chess\.org rating/i)).toBeVisible()

  await page.getByRole('button', { name: /start new game/i }).click()
  await expect(page.getByText('AI · Estimated Elo 200')).toBeVisible()
  await expect(page.getByText(/your turn/i)).toBeVisible()
})

test('a legal move receives an AI reply and an illegal move leaves the board unchanged', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /start new game/i }).click()

  await dragPiece(page, 'e2', 'e4')
  await expect(page.getByText(/your turn/i)).toBeVisible()
  await expect(page.getByTestId('position-fen')).not.toContainText(' w KQkq - 0 1')

  await page.getByRole('button', { name: /start new game/i }).click()
  const fenBeforeIllegalMove = await page.getByTestId('position-fen').textContent()
  await dragPiece(page, 'e2', 'e5')
  await expect(page.getByTestId('position-fen')).toHaveText(fenBeforeIllegalMove ?? '')
})

test('an engine-backed strength returns a legal AI reply', async ({ page }) => {
  test.setTimeout(20_000)
  await page.goto('/')
  await page.getByLabel(/estimated elo strength/i).selectOption('1300')
  await page.getByRole('button', { name: /start new game/i }).click()

  await dragPiece(page, 'e2', 'e4')
  await expect(page.getByText('AI · Estimated Elo 1300')).toBeVisible()
  await expect(page.getByText(/your turn/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('position-fen')).not.toContainText(' w KQkq - 0 1')
})
