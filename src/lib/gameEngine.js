// src/lib/gameEngine.js

export const DEFAULT_GRID_SIZE = 10
export const ALL_ROWS = 'ABCDEFGHIJKL'.split('') // up to 12 rows

export const SHIPS_CONFIG = [
  { id: 'carrier',    name: 'Porte-avions', size: 5 },
  { id: 'battleship', name: 'Cuirassé',     size: 4 },
  { id: 'cruiser',    name: 'Croiseur',     size: 3 },
  { id: 'submarine',  name: 'Sous-marin',   size: 3 },
  { id: 'destroyer',  name: 'Destroyer',    size: 2 },
]

// Ships config for the educational 6×5 grid
export const LEARN_SHIPS_CONFIG = [
  { id: 'cruiser',   name: 'Croiseur',  size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
  { id: 'patrol',    name: 'Patrouille',size: 2 },
]

export const LEARN_COLS = 6  // verbs
export const LEARN_ROWS = 5  // pronouns

// Ships available per square grid size
export function getShipsForSize(gridSize) {
  if (gridSize <= 8) return SHIPS_CONFIG.filter(s => s.id !== 'carrier')
  return SHIPS_CONFIG
}

// ── Board factory — supports rectangular grids ────────────────────
// rows = number of rows (height), cols = number of columns (width)
// For square grids: pass gridSize for both
export function createEmptyBoard(rows = DEFAULT_GRID_SIZE, cols = rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

export function getShipCells(r, c, size, orientation) {
  const cells = []
  for (let i = 0; i < size; i++)
    cells.push(orientation === 'H' ? { r, c: c + i } : { r: r + i, c })
  return cells
}

export function isValidPlacement(cells, placedShips, rows = DEFAULT_GRID_SIZE, cols = rows) {
  for (const { r, c } of cells) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false
    for (const ship of placedShips)
      for (const sc of ship.cells)
        if (sc.r === r && sc.c === c) return false // overlap only, no adjacency gap required
  }
  return true
}

export function placeShipsRandomly(rows = DEFAULT_GRID_SIZE, cols = rows, shipsConfig = null) {
  const ships = []
  const config = shipsConfig || getShipsForSize(Math.min(rows, cols))
  for (const cfg of config) {
    let placed = false, tries = 0
    while (!placed && tries++ < 2000) {
      const ori = Math.random() < 0.5 ? 'H' : 'V'
      const r   = Math.floor(Math.random() * rows)
      const c   = Math.floor(Math.random() * cols)
      const cells = getShipCells(r, c, cfg.size, ori)
      if (isValidPlacement(cells, ships, rows, cols)) {
        ships.push({ ...cfg, cells, sunk: false, hits: 0 })
        placed = true
      }
    }
  }
  return ships
}

export function boardFromShips(ships, rows = DEFAULT_GRID_SIZE, cols = rows) {
  const board = createEmptyBoard(rows, cols)
  ships.forEach(s => s.cells.forEach(({ r, c }) => { board[r][c] = 'ship' }))
  return board
}

export function processShot(r, c, ships) {
  const updated = ships.map(s => ({ ...s, cells: s.cells.map(x => ({ ...x })) }))
  for (const ship of updated) {
    if (ship.sunk) continue
    if (ship.cells.some(sc => sc.r === r && sc.c === c)) {
      ship.hits = (ship.hits || 0) + 1
      if (ship.hits >= ship.size) {
        ship.sunk = true
        return { result: 'sunk', sunkShip: ship, updatedShips: updated }
      }
      return { result: 'hit', sunkShip: null, updatedShips: updated }
    }
  }
  return { result: 'miss', sunkShip: null, updatedShips: updated }
}

export function aiPickCell(board, aiState, difficulty, rows = DEFAULT_GRID_SIZE, cols = rows) {
  if (difficulty === 'easy')
    return { cell: randomUntouched(board, false, rows, cols), newAiState: aiState }

  if (aiState.huntTargets?.length > 0) {
    const [next, ...rest] = aiState.huntTargets
    if (!board[next.r]?.[next.c])
      return { cell: next, newAiState: { ...aiState, huntTargets: rest } }
    return aiPickCell(board, { ...aiState, huntTargets: rest }, difficulty, rows, cols)
  }

  const chain = aiState.hitChain || []
  if (chain.length > 0) {
    const last = chain[chain.length - 1]
    if (chain.length >= 2) {
      const prev = chain[chain.length - 2]
      const dr = last.r - prev.r, dc = last.c - prev.c
      const nr = last.r + dr, nc = last.c + dc
      if (inBounds(nr, nc, rows, cols) && !board[nr]?.[nc])
        return { cell: { r: nr, c: nc }, newAiState: aiState }
      const first = chain[0]
      const nr2 = first.r - dr, nc2 = first.c - dc
      if (inBounds(nr2, nc2, rows, cols) && !board[nr2]?.[nc2])
        return { cell: { r: nr2, c: nc2 }, newAiState: aiState }
    }
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = last.r + dr, nc = last.c + dc
      if (inBounds(nr, nc, rows, cols) && !board[nr]?.[nc])
        return { cell: { r: nr, c: nc }, newAiState: aiState }
    }
    return { cell: randomUntouched(board, difficulty === 'hard', rows, cols), newAiState: { hitChain: [], huntTargets: [] } }
  }
  return { cell: randomUntouched(board, difficulty === 'hard', rows, cols), newAiState: aiState }
}

function inBounds(r, c, rows, cols) { return r >= 0 && r < rows && c >= 0 && c < cols }

function randomUntouched(board, parity, rows, cols) {
  const avail = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!board[r]?.[c] && (!parity || (r + c) % 2 === 0)) avail.push({ r, c })
  if (!avail.length)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (!board[r]?.[c]) avail.push({ r, c })
  return avail[Math.floor(Math.random() * avail.length)]
}

export function coordLabel(r, c) { return ALL_ROWS[r] + (c + 1) }
export function allSunk(ships) { return ships.every(s => s.sunk) }
