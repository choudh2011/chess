import { applyAiMove, applyPlayerMove, newGame, setReviewPly } from './game'

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

  it('starts a Black game with the AI to move first', () => {
    expect(newGame(200, 'black')).toMatchObject({
      playerColor: 'black',
      phase: 'ai-thinking',
      mode: 'play',
    })
  })

  it('accepts a legal White AI move then enables Black player input', () => {
    const blackGame = newGame(200, 'black')
    const afterAiMove = applyAiMove(blackGame, { from: 'e2', to: 'e4' })

    expect(afterAiMove.phase).toBe('player-turn')
    expect(applyPlayerMove(afterAiMove, 'e7', 'e5').history).toEqual(['e4', 'e5'])
  })

  it('replays a review at the requested ply and keeps it read-only', () => {
    const game = applyAiMove(applyPlayerMove(newGame(200), 'e2', 'e4'), { from: 'e7', to: 'e5' })
    const review = { ...game, mode: 'review' as const, phase: 'player-turn' as const }

    expect(setReviewPly(review, 0)).toMatchObject({ viewPly: 0, mode: 'review' })
    expect(setReviewPly(review, 1).history).toEqual(['e4', 'e5'])
    expect(applyPlayerMove(setReviewPly(review, 1), 'g1', 'f3')).toEqual(setReviewPly(review, 1))
  })
})
