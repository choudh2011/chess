# Chess AI Game — Approved BDD Specification

## Product outcome

Players practise standard chess in a browser against a local AI labelled with one of 21 **Estimated Elo** strengths: 200, 300, …, 2200. The labels are product estimates, not Chess.org ratings and not a guarantee of a human Elo equivalence.

## Scope

- A player starts a standard chess game as White.
- The player chooses an Estimated Elo strength before a new game.
- Legal player moves are followed by one legal AI Black move.
- Illegal moves leave position and turn unchanged.
- Player input is disabled while the AI is choosing a move.
- The first implementation increment proves the 200-strength full turn; the delivered application expands to all approved strengths and standard game-over states.

## Approved acceptance scenarios

```gherkin
Feature: Play a first move against an AI opponent
  To practise chess at an appropriate challenge level
  As a player
  I want to start a game against an AI with an estimated Elo strength

  Rule: Players choose from supported estimated Elo strengths
    Scenario: Available strengths are shown in 100-point increments
      Given the player is on the new-game screen
      When the player opens the AI strength selector
      Then the available strengths are 200 through 2200 in increments of 100
      And the screen identifies them as estimated Elo strengths
      And the screen does not describe them as Chess.org ratings

  Rule: A new game starts with the selected strength and standard chess setup
    Scenario: Player starts a 200-strength game
      Given the player selected estimated Elo 200
      When the player starts a new game
      Then a standard chess position is shown
      And the player controls White
      And it is White's turn
      And the opponent is labelled "AI · Estimated Elo 200"

  Rule: A legal player move is followed by a legal AI move
    Scenario: Player opens with a legal pawn move
      Given a new estimated Elo 200 game is in progress
      And it is White's turn
      When the player moves the pawn from e2 to e4
      Then the board shows the pawn on e4
      And the AI makes one legal move for Black
      And it becomes White's turn

  Rule: An illegal move does not change game state
    Scenario: Player attempts an illegal pawn move
      Given a new estimated Elo 200 game is in progress
      And it is White's turn
      When the player attempts to move the pawn from e2 to e5
      Then the board position is unchanged
      And the AI does not make a move
      And it remains White's turn

  Rule: Players cannot move during the AI turn
    Scenario: Player attempts to move while the AI is thinking
      Given a new estimated Elo 200 game is in progress
      And the player has made a legal White move
      And the AI is choosing its Black move
      When the player attempts another White move
      Then the board position is unchanged
      And the game remains in the AI turn
```

## Technical decisions

- React and TypeScript render the local browser UI.
- `chess.js` is the authoritative legal-rules engine. No UI or AI move is trusted without validation by a `Chess` instance.
- The game controller owns FEN, history, turn/phase, configured strength, and AI request identity.
- AI executes behind an `AiMoveProvider` interface. A deterministic weak provider supports the first vertical slice; a Web Worker-backed Stockfish provider is used for engine-backed strengths.
- Stockfish's current UCI Elo floor is 1320. Strengths 200–1200 therefore use a calibrated fallible-move selector; 1300–2200 use `UCI_LimitStrength` + `UCI_Elo`. The visible 1300 product level maps to Stockfish 1320 internally; the label remains an estimate, not an engine or Chess.org rating.
- The application is local-only: no account, external AI API, rating service, multiplayer, persistence, or timer.
- This project does not use Git or any source-code repository workflow.
- Any Stockfish distribution must include the required GPL-3.0 notices and complete corresponding-source offer/material appropriate to the chosen distribution method before publication.

## Logic diagrams

### Class and responsibility diagram

```mermaid
classDiagram
  class App {
    +render()
  }
  class NewGamePanel {
    +selectedElo: number
    +onSelectElo(elo)
    +onStart()
  }
  class ChessGame {
    +render(state)
    +requestPlayerMove(from, to)
  }
  class UseChessGame {
    +state: GameState
    +startGame(elo)
    +movePlayer(from, to, promotion)
    +isBoardInteractive: boolean
  }
  class GameState {
    +fen: string
    +history: Move[]
    +selectedElo: number
    +phase: player-turn|ai-thinking|game-over
    +outcome: string
  }
  class ChessRules {
    +move(move)
    +moves()
    +isGameOver()
  }
  class AiMoveProvider {
    <<interface>>
    +chooseMove(request) Promise~AiMove~
  }
  class WeakMoveProvider {
    +chooseMove(request) Promise~AiMove~
  }
  class StockfishMoveProvider {
    +chooseMove(request) Promise~AiMove~
    +stop()
  }
  class StockfishWorker {
    +postMessage(command)
    +onmessage
  }

  App *-- NewGamePanel
  App *-- ChessGame
  App --> UseChessGame
  ChessGame --> UseChessGame : move requests
  UseChessGame --> GameState : reads and replaces
  UseChessGame --> ChessRules : validates every move
  UseChessGame --> AiMoveProvider : asks for Black move
  AiMoveProvider <|.. WeakMoveProvider
  AiMoveProvider <|.. StockfishMoveProvider
  StockfishMoveProvider --> StockfishWorker : UCI commands
```

Plain meaning: the UI never decides whether a move is legal. `UseChessGame` asks `ChessRules` first; it is also the only layer allowed to apply an AI move. The AI provider can be replaced without changing chess rules or screen components.

### Main turn sequence

```mermaid
sequenceDiagram
  actor Player
  participant Board as ChessGame
  participant Controller as UseChessGame
  participant Rules as chess.js
  participant AI as AiMoveProvider

  Player->>Board: move e2 to e4
  Board->>Controller: movePlayer(e2, e4)
  Controller->>Rules: validate and apply White move
  alt move is illegal
    Rules-->>Controller: rejected
    Controller-->>Board: unchanged board, White turn
  else move is legal
    Rules-->>Controller: updated FEN
    Controller-->>Board: AI thinking, board locked
    Controller->>AI: chooseMove(FEN, Elo, requestId)
    AI-->>Controller: candidate Black move
    Controller->>Rules: validate and apply Black move
    alt AI move is valid
      Rules-->>Controller: updated FEN
      Controller-->>Board: White turn, board unlocked
    else AI move is invalid or missing
      Rules-->>Controller: rejected
      Controller-->>Board: AI unavailable, board remains unchanged
    end
  end
```

Plain meaning: a legal White move is the only event that starts AI thinking. A failed player move cannot cause an AI reply. A failed AI move never corrupts the chess position.

### Restart and stale-AI-response sequence

```mermaid
sequenceDiagram
  actor Player
  participant Setup as NewGamePanel
  participant Controller as UseChessGame
  participant AI as AiMoveProvider

  Note over Controller,AI: AI request 7 is running
  Player->>Setup: choose 1800 and start new game
  Setup->>Controller: startGame(1800)
  Controller->>AI: stop request 7 when supported
  Controller->>Controller: increment requestId and reset chess state
  Controller-->>Setup: new board, White turn, AI 1800
  AI-->>Controller: late result for request 7
  Controller->>Controller: compare late requestId with current requestId
  Controller-->>AI: discard late result, do not change board
```

Plain meaning: restarting a game always wins over a slow AI response. The request ID prevents an old move from being played in the new game.

## Non-goals for this plan

- Player colour selection, timers, hints, analysis bar, saved games, online play, user accounts, leaderboard, or branded Chess.org/Chess.com integration.
