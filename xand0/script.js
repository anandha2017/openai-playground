// Noughts and Crosses Game Logic

// DOM Elements
const boardEl = document.getElementById('board');
const modeInputs = document.querySelectorAll('input[name="mode"]');
const difficultySelect = document.getElementById('difficulty');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawEl = document.getElementById('scoreDraw');
const newGameBtn = document.getElementById('newGame');
const resetScoresBtn = document.getElementById('resetScores');

let board = Array(9).fill('');
let currentPlayer = 'X';
let scores = { X: 0, O: 0, Draw: 0 };
let gameOver = false;

// Win combinations
const wins = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

// Initialize
function init() {
  modeInputs.forEach(input =>
    input.addEventListener('change', onModeChange)
  );
  difficultySelect.addEventListener('change', resetBoard);
  newGameBtn.addEventListener('click', resetBoard);
  resetScoresBtn.addEventListener('click', resetScores);
  renderBoard();
  updateScoreboard();
}
init();

function renderBoard() {
  boardEl.innerHTML = '';
  board.forEach((cell, idx) => {
    const cellEl = document.createElement('div');
    cellEl.classList.add('cell');
    if (cell === 'X') cellEl.classList.add('x');
    else if (cell === 'O') cellEl.classList.add('o');
    cellEl.dataset.index = idx;
    const inner = document.createElement('div');
    inner.classList.add('cell-inner');
    inner.textContent = cell;
    cellEl.appendChild(inner);
    cellEl.addEventListener('click', onCellClick);
    boardEl.appendChild(cellEl);
  });
}

// Handle cell clicks
function onCellClick(e) {
  const idx = e.target.dataset.index;
  if (gameOver || board[idx] !== '') return;
  playMove(idx, currentPlayer);
  if (!gameOver && getMode() === 'single-player') {
    setTimeout(() => {
      aiTurn();
    }, 200);
  }
}

// Place a move and check result
function playMove(idx, player) {
  board[idx] = player;
  renderBoard();
  const result = checkResult();
  if (result) endGame(result);
  else currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

// AI makes its move
function aiTurn() {
  if (gameOver) return;
  const diff = difficultySelect.value;
  let idx;
  if (diff === 'easy') idx = randomMove();
  else if (diff === 'medium') {
    idx = Math.random() < 0.5 ? bestMove() : randomMove();
  } else {
    idx = bestMove();
  }
  playMove(idx, 'O');
}

// Choose a random empty cell
function randomMove() {
  const empties = board
    .map((v,i) => (v === '' ? i : null))
    .filter(i => i !== null);
  return empties[Math.floor(Math.random() * empties.length)];
}

// Minimax to find best move
function bestMove() {
  let bestScore = -Infinity;
  let move = null;
  board.forEach((cell, idx) => {
    if (cell === '') {
      board[idx] = 'O';
      const score = minimax(board, 0, false);
      board[idx] = '';
      if (score > bestScore) {
        bestScore = score;
        move = idx;
      }
    }
  });
  return move;
}

function minimax(bd, depth, isMaximizing) {
  const result = checkResultStatic(bd);
  if (result !== null) {
    const scoresMap = { X: -1, O: 1, Draw: 0 };
    return scoresMap[result];
  }
  if (isMaximizing) {
    let best = -Infinity;
    bd.forEach((cell, i) => {
      if (cell === '') {
        bd[i] = 'O';
        best = Math.max(best, minimax(bd, depth + 1, false));
        bd[i] = '';
      }
    });
    return best;
  } else {
    let best = Infinity;
    bd.forEach((cell,i) => {
      if (cell === '') {
        bd[i] = 'X';
        best = Math.min(best, minimax(bd, depth + 1, true));
        bd[i] = '';
      }
    });
    return best;
  }
}

// Check for win or draw on current board
function checkResult() {
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (!board.includes('')) return 'Draw';
  return null;
}

// Static check for minimax
function checkResultStatic(bd) {
  for (const [a,b,c] of wins) {
    if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
      return bd[a];
    }
  }
  if (!bd.includes('')) return 'Draw';
  return null;
}

// Handle end of game
function endGame(result) {
  gameOver = true;
  if (result === 'Draw') scores.Draw++;
  else scores[result]++;
  updateScoreboard();
}

// Update displayed scores
function updateScoreboard() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.Draw;
}

// Reset the board only
function resetBoard() {
  board.fill('');
  currentPlayer = 'X';
  gameOver = false;
  renderBoard();
}

// Reset scores and board
function resetScores() {
  scores = { X: 0, O: 0, Draw: 0 };
  updateScoreboard();
  resetBoard();
}

// Get selected mode
function getMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

// Handle mode change (enable/disable difficulty)
function onModeChange() {
  if (getMode() === 'single-player') {
    difficultySelect.disabled = false;
  } else {
    difficultySelect.disabled = true;
  }
  resetBoard();
}
