import { ESTIMATED_ELOS } from '../domain/difficulty'

interface NewGamePanelProps {
  selectedElo: number
  onSelectElo: (elo: number) => void
  onStart: () => void
}

export function NewGamePanel({ selectedElo, onSelectElo, onStart }: NewGamePanelProps) {
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
      <p className="disclaimer">Estimated Elo only — not a Chess.org rating.</p>
      <button type="button" onClick={onStart}>Start new game</button>
    </section>
  )
}
