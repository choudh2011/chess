import { useMemo, useState } from 'react'
import { DifficultyMoveProvider } from './ai/provider-factory'
import { ChessGame } from './components/ChessGame'
import { GameRecordPanel } from './components/GameRecordPanel'
import { NewGamePanel } from './components/NewGamePanel'
import { exportPgn, importPgn } from './domain/pgn'
import type { PlayerColor } from './domain/game'
import { useChessGame } from './hooks/useChessGame'

export default function App() {
  const [selectedElo, setSelectedElo] = useState(200)
  const [selectedPlayerColor, setSelectedPlayerColor] = useState<PlayerColor>('white')
  const provider = useMemo(() => new DifficultyMoveProvider(), [])
  const game = useChessGame(provider)

  const downloadPgn = () => {
    const file = new Blob([exportPgn(game.state)], { type: 'application/x-chess-pgn;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'chess-ai-game.pgn'
    link.click()
    URL.revokeObjectURL(url)
  }

  const uploadPgn = (text: string) => {
    game.loadReview(importPgn(text, selectedElo))
  }

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Local browser chess</p>
        <h1>Play chess against AI</h1>
        <p className="intro">Choose an estimated strength and colour, then play against a local AI.</p>
      </header>
      <div className="game-layout">
        <NewGamePanel
          selectedElo={selectedElo}
          selectedPlayerColor={selectedPlayerColor}
          onSelectElo={setSelectedElo}
          onSelectPlayerColor={setSelectedPlayerColor}
          onStart={() => game.startGame(selectedElo, selectedPlayerColor)}
        />
        <ChessGame
          state={game.state}
          isBoardInteractive={game.isBoardInteractive}
          onMove={game.movePlayer}
        />
        <GameRecordPanel
          state={game.state}
          onNavigate={game.navigateReview}
          onDownload={downloadPgn}
          onUploadText={uploadPgn}
        />
      </div>
    </main>
  )
}
