# PGN Review and Player Colour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players choose White or Black, view a complete move record, export it as PGN, and import PGN for read-only step-by-step review.

**Architecture:** Extend the chess domain state with player colour, game mode, history position, and starting metadata. Keep PGN parsing/export pure in a domain module, keep AI orchestration in `useChessGame`, and add a dedicated record-panel component for browser file actions and navigation.

**Tech Stack:** React, TypeScript, chess.js, react-chessboard, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-13-pgn-review-and-player-colour-design.md`

## Global Constraints

- Keep `chess.js` as the sole authority for legal moves, PGN parsing, and reconstructed positions.
- Imported PGN is permanently read-only; do not implement resuming against the AI.
- Preserve the current game/review when a PGN import fails.
- Retain the Estimated Elo wording and the 200–2200 selector.
- Cancel or ignore stale AI replies whenever a new game or review replaces state.
- Do not create Git commits. Do not stage generated `node_modules/`, `dist/`, or test-result files.

---

### Task 1: Extend chess state for player colour and read-only navigation

**Files:**
- Modify: `src/domain/game.ts`
- Modify: `src/domain/game.test.ts`

**Interfaces:**
- Produces `PlayerColor`, `GameMode`, `newGame(elo, playerColor)`, `setReviewPly(state, ply)`, and `isPlayerTurn(state)`.
- Consumed by the game hook, the board component, the PGN module, and the record panel.

- [ ] **Step 1: Write failing domain tests for a Black player and review navigation**

```ts
import { applyAiMove, applyPlayerMove, newGame, setReviewPly } from './game'

it('starts a Black game with the AI to move first', () => {
  expect(newGame(200, 'black')).toMatchObject({
    playerColor: 'black',
    phase: 'ai-thinking',
    mode: 'play',
  })
})

it('accepts a legal White AI move then enables Black player input', () => {
  const blackGame = newGame(200, 'black')
  const afterAiMove = applyAiMove(blackGame, { from: 'e2', to: 'e4' })

  expect(afterAiMove.phase).toBe('player-turn')
  expect(applyPlayerMove(afterAiMove, 'e7', 'e5').history).toEqual(['e4', 'e5'])
})

it('replays a review at the requested ply and keeps it read-only', () => {
  const game = applyAiMove(applyPlayerMove(newGame(200), 'e2', 'e4'), { from: 'e7', to: 'e5' })
  const review = { ...game, mode: 'review' as const, phase: 'player-turn' as const }

  expect(setReviewPly(review, 0)).toMatchObject({ viewPly: 0, mode: 'review' })
  expect(setReviewPly(review, 1).history).toEqual(['e4', 'e5'])
  expect(applyPlayerMove(setReviewPly(review, 1), 'g1', 'f3')).toEqual(setReviewPly(review, 1))
})
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm run test -- src/domain/game.test.ts`  
Expected: FAIL because the player colour and review APIs do not exist.

- [ ] **Step 3: Implement the smallest domain state extension**

- Add `PlayerColor = 'white' | 'black'` and `GameMode = 'play' | 'review'`.
- Add `playerColor`, `mode`, `viewPly`, `initialFen`, and `headers` to `GameState`.
- Make `newGame(elo, playerColor = 'white')` set `phase` to `player-turn` for White and `ai-thinking` for Black.
- Make `applyPlayerMove` accept moves only in `play` mode, on `player-turn`, and when `chess.turn()` matches the selected player colour.
- Make `applyAiMove` accept the opposite side only; keep existing legal-move validation and append SAN.
- Implement `setReviewPly(state, ply)` by clamping to the history range, replaying the SAN prefix from `initialFen`, setting `mode: 'review'`, setting a non-interactive phase, and returning the resulting FEN.

- [ ] **Step 4: Run the domain test and verify it passes**

Run: `npm run test -- src/domain/game.test.ts`  
Expected: PASS.

### Task 2: Add pure PGN import and export

**Files:**
- Create: `src/domain/pgn.ts`
- Create: `src/domain/pgn.test.ts`
- Modify: `src/domain/game.ts` only if a small record-construction helper is needed

**Interfaces:**
- Consumes `GameState` and `GameState` construction helpers from Task 1.
- Produces `exportPgn(state): string` and `importPgn(text, selectedElo): GameState`.
- The UI and hook depend only on those functions, never on `FileReader` or DOM APIs.

- [ ] **Step 1: Write failing PGN tests**

```ts
import { applyAiMove, applyPlayerMove, newGame } from './game'
import { exportPgn, importPgn } from './pgn'

it('exports a portable PGN containing headers and SAN moves', () => {
  const game = applyAiMove(applyPlayerMove(newGame(200), 'e2', 'e4'), { from: 'e7', to: 'e5' })
  const pgn = exportPgn(game)

  expect(pgn).toContain('[Event "Local browser chess"]')
  expect(pgn).toContain('1. e4 e5')
})

it('imports a valid PGN as an initial-position read-only review', () => {
  const review = importPgn('[Event "Example"]\\n\\n1. e4 e5 2. Nf3 Nc6 *', 200)

  expect(review).toMatchObject({ mode: 'review', viewPly: 0, history: ['e4', 'e5', 'Nf3', 'Nc6'] })
  expect(review.fen).toContain(' w ')
})

it('rejects invalid PGN with a readable error', () => {
  expect(() => importPgn('this is not a chess game', 200)).toThrow(/PGN/i)
})
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm run test -- src/domain/pgn.test.ts`  
Expected: FAIL because `pgn.ts` does not exist.

- [ ] **Step 3: Implement PGN conversion through chess.js**

- Export by creating `Chess(state.initialFen)`, adding standard `Event`, `White`, `Black`, and `Result` headers, replaying `state.history`, then returning `chess.pgn()`.
- Import by calling `chess.loadPgn(text, { strict: false })` inside `try/catch`, reading `chess.getHeaders()` and `chess.history()`, preserving `SetUp`/`FEN` if supplied, and producing review state at ply zero.
- Reject empty input or parse failures with `new Error('Unable to import PGN: …')`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test -- src/domain/pgn.test.ts`  
Expected: PASS.

### Task 3: Orchestrate colour-dependent AI turns and review state in the hook

**Files:**
- Modify: `src/hooks/useChessGame.ts`
- Modify: `src/hooks/useChessGame.test.tsx`

**Interfaces:**
- Consumes Task 1 domain state and `AiMoveProvider`.
- Produces `startGame(elo, playerColor)`, `loadReview(review)`, `navigateReview(ply)`, and `isBoardInteractive`.
- Consumed by `App` and the visual components.

- [ ] **Step 1: Write failing hook tests**

```tsx
it('asks the AI for White’s opening move when the player selects Black', async () => {
  const provider = new WeakMoveProvider(() => 0)
  const { result } = renderHook(() => useChessGame(provider))

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
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm run test -- src/hooks/useChessGame.test.tsx`  
Expected: FAIL because colour and review controller methods do not exist.

- [ ] **Step 3: Implement the controller changes**

- Extract one `requestAiMove(state)` helper so it is used after a player move and after starting Black.
- Call `provider.stop?.()` and increment `requestId` before a new game or loaded review replaces state.
- Expose `loadReview` and `navigateReview`; neither method may call the AI.
- Set `isBoardInteractive` only when `mode === 'play'`, `phase === 'player-turn'`, and the domain reports a player turn.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test -- src/hooks/useChessGame.test.tsx`  
Expected: PASS.

### Task 4: Build the colour selector and accessible game-record panel

**Files:**
- Modify: `src/components/NewGamePanel.tsx`
- Modify: `src/components/NewGamePanel.test.tsx`
- Modify: `src/components/ChessGame.tsx`
- Modify: `src/components/ChessGame.test.tsx`
- Create: `src/components/GameRecordPanel.tsx`
- Create: `src/components/GameRecordPanel.test.tsx`

**Interfaces:**
- `NewGamePanel` receives `selectedPlayerColor` and `onSelectPlayerColor`.
- `ChessGame` uses `state.playerColor` for `boardOrientation` and disables all review input.
- `GameRecordPanel` receives `state`, `onNavigate`, `onDownload`, and `onUploadText`.

- [ ] **Step 1: Write failing component tests**

```tsx
it('lets the player choose Black before starting', async () => {
  const user = userEvent.setup()
  const onSelectPlayerColor = vi.fn()
  render(<NewGamePanel selectedElo={200} selectedPlayerColor="white" onSelectElo={vi.fn()} onSelectPlayerColor={onSelectPlayerColor} onStart={vi.fn()} />)

  await user.selectOptions(screen.getByLabelText(/play as/i), 'black')
  expect(onSelectPlayerColor).toHaveBeenCalledWith('black')
})

it('marks the selected review move and emits navigation', async () => {
  const user = userEvent.setup()
  const onNavigate = vi.fn()
  render(<GameRecordPanel state={importPgn('1. e4 e5 *', 200)} onNavigate={onNavigate} onDownload={vi.fn()} onUploadText={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: /next move/i }))
  expect(onNavigate).toHaveBeenCalledWith(1)
})
```

- [ ] **Step 2: Run component tests and verify the expected failure**

Run: `npm run test -- src/components/NewGamePanel.test.tsx src/components/ChessGame.test.tsx src/components/GameRecordPanel.test.tsx`  
Expected: FAIL because the new props/component do not exist.

- [ ] **Step 3: Implement controls and file boundary**

- Add an accessible `Play as` select with `White` and `Black` options to `NewGamePanel`.
- Set `Chessboard` `boardOrientation` from `state.playerColor`; preserve board lock in review mode.
- Render numbered white/black SAN moves in `GameRecordPanel`, with an accessible current-move marker and first/previous/next/last controls.
- Make the file input read `File.text()` and call `onUploadText`. Store and render an import error in the panel without replacing state.
- Create a Blob download with `text/plain`, a `.pgn` filename, and temporary object URL cleanup in the component/UI adapter.

- [ ] **Step 4: Run component tests and verify they pass**

Run: `npm run test -- src/components/NewGamePanel.test.tsx src/components/ChessGame.test.tsx src/components/GameRecordPanel.test.tsx`  
Expected: PASS.

### Task 5: Compose the UI, style the third column, and prove user journeys

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `e2e/chess-game.spec.ts`
- Modify: `README.md`

**Interfaces:**
- `App` owns selected Elo and selected player colour, composes the controller and record panel.
- E2E tests use visible labels and controls only.

- [ ] **Step 1: Write failing app/E2E tests**

```ts
test('a Black player sees an AI opening before receiving a turn', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/play as/i).selectOption('black')
  await page.getByRole('button', { name: /start new game/i }).click()

  await expect(page.getByText(/AI is thinking|Your turn/i)).toBeVisible()
  await expect(page.getByText(/your turn/i)).toBeVisible()
  await expect(page.getByTestId('position-fen')).toContainText(' b ')
})

test('imports a PGN as a read-only review and navigates its moves', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/upload pgn/i).setInputFiles({
    name: 'review.pgn',
    mimeType: 'application/x-chess-pgn',
    buffer: Buffer.from('1. e4 e5 *'),
  })

  await expect(page.getByText(/review mode/i)).toBeVisible()
  await page.getByRole('button', { name: /next move/i }).click()
  await expect(page.getByText(/current move: e4/i)).toBeVisible()
  await expect(page.getByLabel(/chess board/i)).toHaveAttribute('data-interactive', 'false')
})
```

- [ ] **Step 2: Run the focused tests and verify the expected failure**

Run: `npm run test -- src/App.test.tsx && npm run test:e2e -- e2e/chess-game.spec.ts`  
Expected: FAIL because the app does not compose colour selection or record controls yet.

- [ ] **Step 3: Wire and style the finished feature**

- Keep `selectedPlayerColor` in `App`, pass it to setup, and pass all controller methods to `GameRecordPanel`.
- Add the record panel as the right-most column; switch to one-column stacking below the current responsive breakpoint.
- Add concise visual states for review mode, current move, disabled navigation controls, and import errors.
- Update README with colour selection, PGN export/import, and review-only constraints.

- [ ] **Step 4: Run full verification**

Run: `npm run test && npm run build && npm run test:e2e`  
Expected: all unit/component tests, production build, and Playwright journeys PASS.

## Plan self-review

- **Spec coverage:** Tasks 1 and 3 cover player colour and AI-first Black; Tasks 2 and 4 cover PGN import/export and review-only navigation; Task 5 covers visible layout and E2E journeys.
- **Placeholders:** No TBD/TODO steps. Every task names affected files, interfaces, test commands, and expected result.
- **Type consistency:** `PlayerColor`, `GameState`, `startGame(elo, playerColor)`, `loadReview`, `navigateReview`, `exportPgn`, and `importPgn` have one canonical spelling throughout.
