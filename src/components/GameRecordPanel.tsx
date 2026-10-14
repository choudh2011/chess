import { useState } from 'react'
import type { GameState } from '../domain/game'

interface GameRecordPanelProps {
  state: GameState
  onNavigate: (ply: number) => void
  onDownload: () => void
  onUploadText: (text: string) => void | Promise<void>
}

export function GameRecordPanel({ state, onNavigate, onDownload, onUploadText }: GameRecordPanelProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const moves = groupMoves(state.history)
  const canReview = state.mode === 'review' || state.phase === 'game-over'

  const uploadFile = async (file: File | undefined) => {
    if (!file) {
      return
    }

    try {
      await onUploadText(await file.text())
      setImportError(null)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import PGN.')
    }
  }

  return (
    <aside className="record-panel" aria-labelledby="game-record-heading">
      <div className="record-heading">
        <div>
          <p className="eyebrow">Game record</p>
          <h2 id="game-record-heading">{state.mode === 'review' ? 'Review mode' : 'Live game'}</h2>
        </div>
        <p className="ply-status">Move {state.viewPly} of {state.history.length}</p>
      </div>

      <ol className="move-list" aria-label="Recorded moves">
        {moves.length === 0 ? <li className="empty-record">No moves yet.</li> : moves.map((move) => (
          <li key={move.moveNumber} className="move-row">
            <span className="move-number">{move.moveNumber}.</span>
            <Move san={move.white} ply={move.whitePly} currentPly={state.viewPly} />
            <Move san={move.black} ply={move.blackPly} currentPly={state.viewPly} />
          </li>
        ))}
      </ol>

      {canReview ? (
        <div className="record-controls" aria-label="Review navigation">
          <button type="button" onClick={() => onNavigate(0)} disabled={state.viewPly === 0}>First move</button>
          <button type="button" onClick={() => onNavigate(state.viewPly - 1)} disabled={state.viewPly === 0}>Previous move</button>
          <button type="button" onClick={() => onNavigate(state.viewPly + 1)} disabled={state.viewPly === state.history.length}>Next move</button>
          <button type="button" onClick={() => onNavigate(state.history.length)} disabled={state.viewPly === state.history.length}>Last move</button>
        </div>
      ) : null}

      <div className="record-file-actions">
        <button type="button" onClick={onDownload}>Download PGN</button>
        <label className="upload-control" htmlFor="upload-pgn">Upload PGN</label>
        <input
          id="upload-pgn"
          aria-label="Upload PGN"
          type="file"
          accept=".pgn,application/x-chess-pgn,text/plain"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
        />
      </div>

      {importError ? <p className="import-error" role="alert">{importError}</p> : null}
      {state.mode === 'review' ? <p className="review-note">Imported records are read-only.</p> : null}
    </aside>
  )
}

function Move({ san, ply, currentPly }: { san?: string, ply?: number, currentPly: number }) {
  if (!san || !ply) {
    return <span aria-hidden="true" />
  }

  return <span aria-current={ply === currentPly ? 'step' : undefined}>{san}</span>
}

function groupMoves(history: string[]) {
  const rows: Array<{ moveNumber: number, white?: string, whitePly?: number, black?: string, blackPly?: number }> = []

  for (let index = 0; index < history.length; index += 2) {
    rows.push({
      moveNumber: index / 2 + 1,
      white: history[index],
      whitePly: index + 1,
      black: history[index + 1],
      blackPly: index + 2,
    })
  }

  return rows
}
