
const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const hint = document.getElementById("hint");
const gameMode = document.getElementById("gameMode");
const difficulty = document.getElementById("difficulty");
const difficultyBox = document.getElementById("difficultyBox");
const restartButton = document.getElementById("restart");
const resetScoresButton = document.getElementById("resetScores");

const scoreXText = document.getElementById("scoreX");
const scoreOText = document.getElementById("scoreO");
const scoreDrawText = document.getElementById("scoreDraw");
const playerXName = document.getElementById("playerXName");
const playerOName = document.getElementById("playerOName");

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;

let scores = {
    X: 0,
    O: 0,
    draw: 0
};

// Check whether a player has won.
function getWinner(state) {
    for (const condition of winningConditions) {
        const [a, b, c] = condition;

        if (
            state[a] !== "" &&
            state[a] === state[b] &&
            state[a] === state[c]
        ) {
            return {
                winner: state[a],
                cells: condition
            };
        }
    }

    return null;
}

// Check whether the board is full.
function isDraw(state) {
    return !getWinner(state) && !state.includes("");
}

// Update the scoreboard.
function updateScores() {
    scoreXText.textContent = scores.X;
    scoreOText.textContent = scores.O;
    scoreDrawText.textContent = scores.draw;
}

// Update player names based on the selected mode.
function updateMode() {
    const isAI = gameMode.value === "ai";

    difficultyBox.hidden = !isAI;

    playerXName.textContent = "PLAYER X";
    playerOName.textContent = isAI ? "COMPUTER O" : "PLAYER O";

    hint.textContent = isAI
        ? "You are X. Can you beat the computer?"
        : "Get three in a row to win!";

    startNewRound();
}

// Update the turn message.
function updateStatus() {
    if (!gameActive) return;

    const isComputerTurn =
        gameMode.value === "ai" && currentPlayer === "O";

    statusText.innerHTML =
        `<span class="turn-dot"></span> ${
            isComputerTurn
                ? "Computer is thinking..."
                : `Player ${currentPlayer}'s turn`
        }`;
}

// Display the board.
function renderBoard() {
    cells.forEach((cell, index) => {
        cell.textContent = board[index];
        cell.classList.toggle("x", board[index] === "X");
        cell.classList.toggle("o", board[index] === "O");

        cell.disabled =
            !gameActive ||
            board[index] !== "" ||
            (gameMode.value === "ai" && currentPlayer === "O");

        cell.setAttribute(
            "aria-label",
            `Cell ${index + 1}${board[index] ? ": " + board[index] : ", empty"}`
        );
    });
}

// Finish a round when someone wins or the game draws.
function finishRound() {
    const result = getWinner(board);

    if (result) {
        gameActive = false;
        scores[result.winner]++;

        result.cells.forEach(index => {
            cells[index].classList.add("winner");
        });

        statusText.innerHTML =
            `<span class="turn-dot"></span> ${
                result.winner === "O" && gameMode.value === "ai"
                    ? "Computer wins!"
                    : `Player ${result.winner} wins!`
            }`;

        hint.textContent = "Great game! Start a new round to play again.";

        updateScores();
        renderBoard();
        return true;
    }

    if (isDraw(board)) {
        gameActive = false;
        scores.draw++;

        statusText.innerHTML =
            '<span class="turn-dot"></span> It is a draw!';

        hint.textContent = "Well played! Try another round.";

        updateScores();
        renderBoard();
        return true;
    }

    return false;
}

// Place a mark and switch turns.
function makeMove(index) {
    if (!gameActive || board[index] !== "") return;

    board[index] = currentPlayer;
    renderBoard();

    if (finishRound()) return;

    currentPlayer = currentPlayer === "X" ? "O" : "X";

    updateStatus();
    renderBoard();

    if (gameMode.value === "ai" && currentPlayer === "O") {
        computerMove();
    }
}

// Get all empty cell positions.
function getEmptyCells(state) {
    return state
        .map((value, index) => value === "" ? index : -1)
        .filter(index => index !== -1);
}

// Choose a random available move.
function randomMove(state) {
    const empty = getEmptyCells(state);
    return empty[Math.floor(Math.random() * empty.length)];
}

// Find an immediate winning or blocking move.
function findTacticalMove(state, player) {
    for (const index of getEmptyCells(state)) {
        state[index] = player;

        const wins = getWinner(state) !== null;

        state[index] = "";

        if (wins) return index;
    }

    return null;
}

// Minimax: evaluate possible moves for both players.
function minimax(state, isMaximizing, depth) {
    const result = getWinner(state);

    if (result) {
        if (result.winner === "O") return 10 - depth;
        return depth - 10;
    }

    if (isDraw(state)) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;

        for (const index of getEmptyCells(state)) {
            state[index] = "O";

            const score = minimax(state, false, depth + 1);

            state[index] = "";
            bestScore = Math.max(bestScore, score);
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const index of getEmptyCells(state)) {
        state[index] = "X";

        const score = minimax(state, true, depth + 1);

        state[index] = "";
        bestScore = Math.min(bestScore, score);
    }

    return bestScore;
}

// Select the computer's move according to difficulty.
function getComputerMove() {
    const level = difficulty.value;
    const empty = getEmptyCells(board);

    if (level === "easy") {
        return randomMove(board);
    }

    if (level === "medium") {
        // Win if possible; otherwise block an X win.
        const win = findTacticalMove(board, "O");
        if (win !== null) return win;

        const block = findTacticalMove(board, "X");
        if (block !== null) return block;

        // Prefer the center, then a random move.
        if (board[4] === "") return 4;

        return randomMove(board);
    }

    // Unbeatable difficulty uses Minimax.
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const index of empty) {
        board[index] = "O";

        const score = minimax(board, false, 0);

        board[index] = "";

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [index];
        } else if (score === bestScore) {
            bestMoves.push(index);
        }
    }

    // Randomize equally good moves.
    return bestMoves[
        Math.floor(Math.random() * bestMoves.length)
    ];
}

// Make the computer's move.
function computerMove() {
    if (!gameActive || currentPlayer !== "O") return;

    const index = getComputerMove();

    if (index === undefined) return;

    makeMove(index);
}

// Start a fresh round without clearing the scores.
function startNewRound() {
    board = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    gameActive = true;

    cells.forEach(cell => {
        cell.classList.remove("winner");
    });

    updateStatus();
    renderBoard();
}

// Reset all scores and start a new round.
function resetScores() {
    scores = {
        X: 0,
        O: 0,
        draw: 0
    };

    updateScores();
    startNewRound();
}

// Event listeners.
cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        if (gameMode.value === "ai" && currentPlayer === "O") {
            return;
        }

        makeMove(index);
    });
});

gameMode.addEventListener("change", updateMode);
difficulty.addEventListener("change", startNewRound);
restartButton.addEventListener("click", startNewRound);
resetScoresButton.addEventListener("click", resetScores);

// Initialize the game.
updateScores();
updateMode();
