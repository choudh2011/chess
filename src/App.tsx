import { useMemo, useState } from 'react'
import { DifficultyMoveProvider } from './ai/provider-factory'
import { ChessGame } from './components/ChessGame'
import { NewGamePanel } from './components/NewGamePanel'
import { useChessGame } from './hooks/useChessGame'

export default function App() {
  const [selectedElo, setSelectedElo] = useState(200)
  const provider = useMemo(() => new DifficultyMoveProvider(), [])
  const game = useChessGame(provider)

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Local browser chess</p>
        <h1>Play chess against AI</h1>
        <p className="intro">Choose an estimated strength, then make the first move as White.</p>
      </header>
      <div className="game-layout">
        <NewGamePanel
          selectedElo={selectedElo}
          onSelectElo={setSelectedElo}
          onStart={() => game.startGame(selectedElo)}
        />
        <ChessGame
          state={game.state}
          isBoardInteractive={game.isBoardInteractive}
          onMove={game.movePlayer}
        />
      </div>
    </main>
  )
}
