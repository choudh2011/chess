import { applyPlayerMove, newGame } from './game'

describe('game state', () => {
  it('starts a selected game with White to move', () => {
    expect(newGame(200)).toMatchObject({ selectedElo: 200, phase: 'player-turn' })
  })

  it('rejects an illegal player move without changing the game', () => {
    const game = newGame(200)

    expect(applyPlayerMove(game, 'e2', 'e5')).toEqual(game)
  })

  it('moves to AI thinking after a legal White move', () => {
    const game = newGame(200)
    const afterPlayerMove = applyPlayerMove(game, 'e2', 'e4')

    expect(afterPlayerMove.phase).toBe('ai-thinking')
    expect(afterPlayerMove.fen).not.toBe(game.fen)
  })
})
