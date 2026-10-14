import { ESTIMATED_ELOS } from '../domain/difficulty'
import type { PlayerColor } from '../domain/game'

interface NewGamePanelProps {
  selectedElo: number
  selectedPlayerColor: PlayerColor
  onSelectElo: (elo: number) => void
  onSelectPlayerColor: (color: PlayerColor) => void
  onStart: () => void
}

export function NewGamePanel({
  selectedElo,
  selectedPlayerColor,
  onSelectElo,
  onSelectPlayerColor,
  onStart,
}: NewGamePanelProps) {
  return (
    <section aria-labelledby="new-game-heading" className="new-game-panel">
      <h2 id="new-game-heading">New game</h2>
      <label htmlFor="estimated-elo">Estimated Elo strength</label>
      <select
        id="estimated-elo"
        value={selectedElo}
        onChange={(event) => onSelectElo(Number(event.target.value))}
      >
        {ESTIMATED_ELOS.map((elo) => <option key={elo} value={elo}>{elo}</option>)}
      </select>
      <label htmlFor="player-color">Play as</label>
      <select
        id="player-color"
        value={selectedPlayerColor}
        onChange={(event) => onSelectPlayerColor(event.target.value as PlayerColor)}
      >
        <option value="white">White</option>
        <option value="black">Black</option>
      </select>
      <p className="disclaimer">Estimated Elo only — not a Chess.org rating.</p>
      <button type="button" onClick={onStart}>Start new game</button>
    </section>
  )
}
