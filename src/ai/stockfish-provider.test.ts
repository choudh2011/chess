import { getStockfishWorkerUrl, StockfishMoveProvider } from './stockfish-provider'

class FakeWorker {
  messages: string[] = []
  private listener: ((event: MessageEvent<string>) => void) | undefined

  postMessage(message: string) {
    this.messages.push(message)
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<string>) => void) {
    this.listener = listener
  }

  emit(message: string) {
    this.listener?.({ data: message } as MessageEvent<string>)
  }
}

describe('StockfishMoveProvider', () => {
  it('resolves the engine within a GitHub Pages project path', () => {
    expect(getStockfishWorkerUrl('/chess/')).toBe('/chess/stockfish-19-lite-single.js')
  })

  it('configures a ready engine at the selected Elo and parses its best move', async () => {
    const worker = new FakeWorker()
    const provider = new StockfishMoveProvider(() => worker)
    const result = provider.chooseMove({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      estimatedElo: 1800,
      requestId: 4,
    })

    expect(worker.messages).toEqual(['uci'])
    worker.emit('uciok')
    expect(worker.messages).toContain('isready')
    worker.emit('readyok')
    await Promise.resolve()

    expect(worker.messages).toContain('setoption name UCI_LimitStrength value true')
    expect(worker.messages).toContain('setoption name UCI_Elo value 1800')
    expect(worker.messages).toContain('position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
    expect(worker.messages).toContain('go movetime 300')

    worker.emit('bestmove e7e5')
    await expect(result).resolves.toMatchObject({ requestId: 4, from: 'e7', to: 'e5' })
  })

  it('uses Stockfish’s supported floor for the estimated 1300 level', async () => {
    const worker = new FakeWorker()
    const provider = new StockfishMoveProvider(() => worker)
    const result = provider.chooseMove({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      estimatedElo: 1300,
      requestId: 5,
    })

    worker.emit('uciok')
    worker.emit('readyok')
    await Promise.resolve()

    expect(worker.messages).toContain('setoption name UCI_Elo value 1320')
    worker.emit('bestmove e7e5')
    await expect(result).resolves.toMatchObject({ requestId: 5, from: 'e7', to: 'e5' })
  })
})
