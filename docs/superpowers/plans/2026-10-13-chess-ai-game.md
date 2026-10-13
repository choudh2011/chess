# Chess AI Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser chess game in which a player controls White against a locally executed AI selected from Estimated Elo 200–2200.

**Architecture:** `chess.js` owns chess legality and game-end checks. A React game controller serializes player and AI turns, passes immutable positions to an `AiMoveProvider`, and validates its returned move before committing it. The UI is a projection of controller state; engine communication occurs in a Web Worker and may never mutate UI state directly.

**Tech Stack:** React, TypeScript, Vite, chess.js, react-chessboard, Vitest, React Testing Library, Playwright, Stockfish WebAssembly in a Worker.

**Spec:** `docs/bdd/chess-ai-game-spec.md`

**Logic diagrams:** The approved class/responsibility, main-turn, and stale-AI-response Mermaid diagrams are in the `Logic diagrams` section of the spec. Keep their interfaces synchronized with Tasks 2–5.

## Global Constraints

- Labels must read **Estimated Elo**; never call them Chess.org ratings.
- Allow exactly 21 strengths: 200 through 2200 inclusive in increments of 100.
- Player is White and begins every new game.
- All player and AI moves must be validated by `chess.js` before state is committed.
- No external AI service, account, analytics, persistence, multiplayer, timer, or real rating integration.
- Use a local Worker for engine computation; cancel/ignore stale AI replies on restart.
- Do not initialize, use, or create a Git repository. Do not run `git init`, `git add`, `git commit`, or any repository command.
- Do not ship Stockfish until GPL-3.0 notices and corresponding-source obligations are reviewed for the selected package/build.

---

## File structure

| Path | Responsibility |
|---|---|
| `src/domain/difficulty.ts` | Strength list, label copy, engine/weak-provider mapping. |
| `src/domain/game.ts` | Pure game state transitions backed by `chess.js`. |
| `src/ai/types.ts` | Engine-independent AI request/response contract. |
| `src/ai/weak-provider.ts` | Reproducible legal-move selector for 200–1200. |
| `src/ai/stockfish-provider.ts` | UI-side Worker adapter for 1300–2200. |
| `src/workers/stockfish.worker.ts` | UCI protocol lifecycle; no React imports. |
| `src/hooks/useChessGame.ts` | Coordinates reducer and AI lifecycle. |
| `src/components/NewGamePanel.tsx` | Strength selection and start/restart action. |
| `src/components/ChessGame.tsx` | Board, status, input protection, outcome. |
| `src/App.tsx` | Feature composition only. |
| `src/**/*.test.ts(x)` | Unit/component tests near the code they protect. |
| `e2e/chess-game.spec.ts` | Approved user-facing acceptance scenarios. |
| `NOTICE` and `THIRD_PARTY_LICENSES.md` | Required third-party attribution before engine distribution. |

## Task 1: Scaffold the testable local application

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`
- Create: `src/App.test.tsx`

**Interfaces:**
- Produces `npm run dev`, `npm run test`, `npm run test:e2e`, and `npm run build` commands for all later tasks.

- [ ] **Step 1: Write the failing app smoke test**

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

it('renders the new game heading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /play chess against ai/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL because `App` and test configuration do not exist.

- [ ] **Step 3: Create the Vite React TypeScript project and minimal App**

```tsx
export default function App() {
  return <main><h1>Play chess against AI</h1></main>
}
```

Configure Vitest with `jsdom` and Testing Library setup. Configure Playwright to run against Vite's preview server. Add scripts: `dev`, `build`, `test`, `test:e2e`.

- [ ] **Step 4: Run checks**

Run: `npm run test -- src/App.test.tsx && npm run build`

Expected: PASS and a production build with no TypeScript errors.

- [ ] **Step 5: Record completion in this plan**

Mark Task 1 complete only after the smoke test and production build both pass.

## Task 2: Implement chess domain state and difficulty catalogue

**Files:**
- Create: `src/domain/difficulty.ts`, `src/domain/difficulty.test.ts`
- Create: `src/domain/game.ts`, `src/domain/game.test.ts`

**Interfaces:**
- Produces `ESTIMATED_ELOS: readonly number[]`, `formatOpponentLabel(elo: number): string`, and `isSupportedElo(elo: number): boolean`.
- Produces `GameState`, `newGame(elo)`, `applyPlayerMove(state, from, to, promotion?)`, and `applyAiMove(state, move)`.
- `GameState` contains `fen`, `history`, `selectedElo`, `phase: 'player-turn' | 'ai-thinking' | 'game-over'`, and `outcome`.

- [ ] **Step 1: Write failing difficulty tests**

```ts
expect(ESTIMATED_ELOS).toEqual(Array.from({ length: 21 }, (_, i) => 200 + i * 100))
expect(formatOpponentLabel(200)).toBe('AI · Estimated Elo 200')
expect(isSupportedElo(250)).toBe(false)
```

- [ ] **Step 2: Write failing game-state tests**

```ts
const game = newGame(200)
expect(game.phase).toBe('player-turn')
expect(applyPlayerMove(game, 'e2', 'e5')).toEqual(game)

const afterPlayer = applyPlayerMove(game, 'e2', 'e4')
expect(afterPlayer.phase).toBe('ai-thinking')
expect(afterPlayer.fen).not.toBe(game.fen)
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/domain/difficulty.test.ts src/domain/game.test.ts`

Expected: FAIL because domain modules are absent.

- [ ] **Step 4: Implement pure domain modules**

Use `new Chess()` to create a game and `new Chess(state.fen)` in every transition. Return the exact previous state when `chess.move()` rejects/throws. Set `ai-thinking` only after a legal White move. In `applyAiMove`, reject a non-Black or illegal move by returning the prior state. Use `isGameOver()` to set `game-over` and a user-visible outcome.

- [ ] **Step 5: Run checks and record completion**

Run: `npm run test -- src/domain/difficulty.test.ts src/domain/game.test.ts && npm run build`

Expected: PASS.

Mark Task 2 complete only after both domain test files and the production build pass.

## Task 3: Add a testable AI-provider boundary and the 200-strength vertical slice

**Files:**
- Create: `src/ai/types.ts`, `src/ai/weak-provider.ts`, `src/ai/weak-provider.test.ts`
- Create: `src/hooks/useChessGame.ts`, `src/hooks/useChessGame.test.tsx`

**Interfaces:**
- `AiMoveProvider.chooseMove(request: { fen: string; estimatedElo: number; requestId: number }): Promise<{ requestId: number; from: string; to: string; promotion?: string }>`.
- `useChessGame(provider)` returns `{ state, startGame(elo), movePlayer(from, to, promotion?), isBoardInteractive }`.
- Produces a legal black move for the first 200-strength game without Stockfish.

- [ ] **Step 1: Write failing provider test**

```ts
const move = await new WeakMoveProvider(() => 0).chooseMove({
  fen: afterWhiteE4Fen, estimatedElo: 200, requestId: 1,
})
const chess = new Chess(afterWhiteE4Fen)
expect(chess.moves({ verbose: true }).some((candidate) =>
  candidate.from === move.from && candidate.to === move.to,
)).toBe(true)
```

- [ ] **Step 2: Write failing hook test**

```tsx
act(() => result.current.startGame(200))
act(() => result.current.movePlayer('e2', 'e4'))
expect(result.current.state.phase).toBe('ai-thinking')
expect(result.current.isBoardInteractive).toBe(false)
await waitFor(() => expect(result.current.state.phase).toBe('player-turn'))
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/ai/weak-provider.test.ts src/hooks/useChessGame.test.tsx`

Expected: FAIL because the provider boundary and hook do not exist.

- [ ] **Step 4: Implement minimal provider and hook**

`WeakMoveProvider` must build legal moves from `chess.js`, choose only one, and expose an injectable random function so tests are deterministic. `useChessGame` must capture a monotonically increasing `requestId`; it must discard a resolved move if a restart generated a newer request ID. It must validate every result through `applyAiMove`.

- [ ] **Step 5: Run checks and record completion**

Run: `npm run test -- src/ai/weak-provider.test.ts src/hooks/useChessGame.test.tsx && npm run build`

Expected: PASS.

Mark Task 3 complete only after the provider, hook, and production-build checks pass.

## Task 4: Build the accessible new-game and board UI

**Files:**
- Create: `src/components/NewGamePanel.tsx`, `src/components/NewGamePanel.test.tsx`
- Create: `src/components/ChessGame.tsx`, `src/components/ChessGame.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- `NewGamePanel` accepts `{ selectedElo: number; onSelectElo(elo: number): void; onStart(): void }`.
- `ChessGame` accepts the hook output and sends square pairs to `movePlayer`.
- Board UI exposes accessible square labels and disables interaction while `isBoardInteractive` is false.

- [ ] **Step 1: Write failing selector test**

```tsx
render(<NewGamePanel selectedElo={200} onSelectElo={onSelect} onStart={onStart} />)
expect(screen.getByLabelText(/estimated elo strength/i)).toHaveValue('200')
expect(screen.getAllByRole('option')).toHaveLength(21)
expect(screen.getByText(/not a chess\.org rating/i)).toBeVisible()
```

- [ ] **Step 2: Write failing game-screen tests**

```tsx
render(<ChessGame {...gameProps} />)
expect(screen.getByText('AI · Estimated Elo 200')).toBeVisible()
expect(screen.getByText(/your turn/i)).toBeVisible()

rerender(<ChessGame {...gameProps} isBoardInteractive={false} />)
expect(screen.getByText(/ai is thinking/i)).toBeVisible()
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/components/NewGamePanel.test.tsx src/components/ChessGame.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement UI and connect App**

Render the exact 21 values from `ESTIMATED_ELOS`; do not hand-write them. Render the disclaimer next to the strength selector. Use the board component's move callback only when interactive, and route every attempted move through the hook. Display `Your turn`, `AI is thinking`, and the final result based on state.

- [ ] **Step 5: Run checks and record completion**

Run: `npm run test -- src/components/NewGamePanel.test.tsx src/components/ChessGame.test.tsx && npm run build`

Expected: PASS.

Mark Task 4 complete only after both component test files and the production build pass.

## Task 5: Add Stockfish Worker integration and licensed distribution material

**Files:**
- Create: `src/ai/stockfish-provider.ts`, `src/ai/stockfish-provider.test.ts`
- Create: `src/workers/stockfish.worker.ts`
- Create: `NOTICE`, `THIRD_PARTY_LICENSES.md`
- Modify: `src/domain/difficulty.ts`, `src/App.tsx`, build configuration as required by the selected engine package

**Interfaces:**
- `StockfishMoveProvider` implements `AiMoveProvider`.
- `createMoveProvider(estimatedElo)` returns `WeakMoveProvider` for 200–1200 and `StockfishMoveProvider` for 1300–2200.
- Worker receives `{ type: 'choose-move'; requestId; fen; estimatedElo }` and posts `{ type: 'move'; requestId; from; to; promotion? }` or `{ type: 'error'; requestId; message }`.

- [ ] **Step 1: Write failing provider protocol tests**

```ts
worker.emit(`bestmove e7e5`)
await expect(provider.chooseMove(request)).resolves.toMatchObject({
  requestId: request.requestId, from: 'e7', to: 'e5',
})

expect(worker.messages).toContain('setoption name UCI_LimitStrength value true')
expect(worker.messages).toContain('setoption name UCI_Elo value 1800')
```

- [ ] **Step 2: Write failing provider-selection tests**

```ts
expect(createMoveProvider(1200)).toBeInstanceOf(WeakMoveProvider)
expect(createMoveProvider(1300)).toBeInstanceOf(StockfishMoveProvider)
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/ai/stockfish-provider.test.ts src/domain/difficulty.test.ts`

Expected: FAIL because Worker-backed provider and factory do not exist.

- [ ] **Step 4: Implement worker lifecycle and strength mapping**

Initialize a single Worker, send `uci`, wait for `uciok`, then `isready`/`readyok` before options or search. Only send options while idle. For 1300–2200 set `UCI_LimitStrength=true`; map the visible 1300 estimate to Stockfish's supported 1320 minimum and use the selected value above that. For a new/restarted game send `stop`, increment the UI request ID, and ignore responses whose IDs no longer match. If Worker initialization/errors occur, show a recoverable AI-unavailable state; do not fabricate a move.

- [ ] **Step 5: Review licensing before copying engine artifacts**

Record the exact Stockfish build/package, version/commit, license text location, notice text, source URL, and the chosen method for offering corresponding source in `THIRD_PARTY_LICENSES.md`. Add the required copyright/license notice to `NOTICE`. Do not publish a production build until this record is reviewed.

- [ ] **Step 6: Run checks and record completion**

Run: `npm run test -- src/ai/stockfish-provider.test.ts src/domain/difficulty.test.ts && npm run build`

Expected: PASS.

Mark Task 5 complete only after the Worker protocol, provider-selection, and production-build checks pass.

## Task 6: Add acceptance tests and verify full behaviour

**Files:**
- Create: `e2e/chess-game.spec.ts`
- Modify: `src/components/ChessGame.tsx`, `src/components/NewGamePanel.tsx` only if tests reveal missing accessible labels or states

**Interfaces:**
- E2E tests exercise user-visible controls only and use a deterministic test AI provider/build mode; they must not depend on Stockfish search timing.

- [ ] **Step 1: Write failing acceptance tests for the approved scenarios**

```ts
test('lists 21 Estimated Elo strengths and starts at 200', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel(/estimated elo strength/i)).toHaveValue('200')
  await expect(page.getByRole('option')).toHaveCount(21)
  await page.getByRole('button', { name: /start new game/i }).click()
  await expect(page.getByText('AI · Estimated Elo 200')).toBeVisible()
})

test('a legal move receives one AI reply while an illegal move does not', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /start new game/i }).click()
  await moveByAccessibleSquares(page, 'e2', 'e4')
  await expect(page.getByText(/ai is thinking/i)).toBeVisible()
  await expect(page.getByText(/your turn/i)).toBeVisible()
  const fenBeforeIllegalAttempt = await page.getByTestId('position-fen').textContent()
  await moveByAccessibleSquares(page, 'e2', 'e5')
  await expect(page.getByTestId('position-fen')).toHaveText(fenBeforeIllegalAttempt ?? '')
})
```

- [ ] **Step 2: Run E2E tests to verify failure**

Run: `npm run test:e2e -- e2e/chess-game.spec.ts`

Expected: FAIL until test IDs, accessible square interactions, and deterministic test provider are present.

- [ ] **Step 3: Implement only the test-facing seams required**

Provide an explicit test-mode AI provider selected only by the E2E environment. Add accessible square labels and a `data-testid="position-fen"` diagnostic only in development/test builds. Do not expose engine protocol or hidden state to production users.

- [ ] **Step 4: Run the full verification matrix**

Run: `npm run test && npm run test:e2e && npm run build`

Expected: all unit/component tests, approved acceptance scenarios, and production build PASS.

- [ ] **Step 5: Perform manual release checks and record completion**

Check desktop and narrow mobile widths; verify that the disclaimer is visible, board input locks during AI thinking, 200 and 2200 can both start a game, AI errors are recoverable, and no Chess.org brand/rating claim remains.

Mark Task 6 complete only after manual checks and the full verification matrix pass.

## Plan self-review

- Spec coverage: Tasks 2–4 cover the five approved scenarios; Task 5 maps all 21 levels and prevents stale AI moves; Task 6 verifies acceptance behaviour end-to-end.
- Safety coverage: Task 5 records licensing obligations; Tasks 2–3 validate every move and discard stale AI work.
- Scope coverage: all non-goals remain excluded.
- Placeholder scan: no unfinished markers or undefined interfaces remain.
