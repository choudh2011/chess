import type { AiMove, AiMoveProvider, AiMoveRequest } from './types'

interface EngineWorker {
  postMessage: (message: string) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent<string>) => void) => void
}

type WorkerFactory = () => EngineWorker

export function getStockfishWorkerUrl(baseUrl: string): string {
  return `${baseUrl}stockfish-19-lite-single.js`
}

interface PendingMove {
  requestId: number
  resolve: (move: AiMove) => void
  reject: (reason: Error) => void
}

export class StockfishMoveProvider implements AiMoveProvider {
  private worker: EngineWorker | undefined
  private ready: Promise<void> | undefined
  private resolveReady: (() => void) | undefined
  private pending: PendingMove | undefined

  constructor(
    private readonly workerFactory: WorkerFactory = () => new Worker(getStockfishWorkerUrl(import.meta.env.BASE_URL)),
  ) {}

  async chooseMove(request: AiMoveRequest): Promise<AiMove> {
    const worker = this.ensureWorker()
    await this.ready

    if (this.pending) {
      throw new Error('Stockfish is already choosing a move')
    }

    return new Promise<AiMove>((resolve, reject) => {
      this.pending = { requestId: request.requestId, resolve, reject }
      worker.postMessage('setoption name UCI_LimitStrength value true')
      // Stockfish's UCI strength control starts at 1320. The visible 1300 label
      // remains an estimated, product-level difficulty rather than an engine claim.
      worker.postMessage(`setoption name UCI_Elo value ${Math.max(1320, request.estimatedElo)}`)
      worker.postMessage('ucinewgame')
      worker.postMessage(`position fen ${request.fen}`)
      worker.postMessage('go movetime 300')
    })
  }

  stop(): void {
    this.worker?.postMessage('stop')
    if (this.pending) {
      this.pending.reject(new Error('Stockfish move cancelled'))
      this.pending = undefined
    }
  }

  private ensureWorker(): EngineWorker {
    if (this.worker) {
      return this.worker
    }

    const worker = this.workerFactory()
    this.worker = worker
    this.ready = new Promise<void>((resolve) => {
      this.resolveReady = resolve
    })
    worker.addEventListener('message', (event) => this.handleEngineLine(event.data))
    worker.postMessage('uci')

    return worker
  }

  private handleEngineLine(line: string): void {
    if (line === 'uciok') {
      this.worker?.postMessage('isready')
      return
    }

    if (line === 'readyok') {
      this.resolveReady?.()
      this.resolveReady = undefined
      return
    }

    if (!line.startsWith('bestmove ')) {
      return
    }

    const pending = this.pending
    this.pending = undefined
    if (!pending) {
      return
    }

    const moveToken = line.split(/\s+/)[1]
    if (!moveToken || moveToken === '(none)' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(moveToken)) {
      pending.reject(new Error(`Stockfish returned an invalid best move: ${line}`))
      return
    }

    pending.resolve({
      requestId: pending.requestId,
      from: moveToken.slice(0, 2),
      to: moveToken.slice(2, 4),
      ...(moveToken.length === 5 ? { promotion: moveToken[4] } : {}),
    })
  }
}
