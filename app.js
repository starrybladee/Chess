// Шахматные константы
const PieceType = {
    PAWN: 'p',
    ROOK: 'r',
    KNIGHT: 'n',
    BISHOP: 'b',
    QUEEN: 'q',
    KING: 'k'
};

const Color = {
    WHITE: 'w',
    BLACK: 'b'
};

// Символы Unicode для фигур
const PieceSymbols = {
    [Color.WHITE]: {
        [PieceType.KING]: '♔',
        [PieceType.QUEEN]: '♕',
        [PieceType.ROOK]: '♖',
        [PieceType.BISHOP]: '♗',
        [PieceType.KNIGHT]: '♘',
        [PieceType.PAWN]: '♙'
    },
    [Color.BLACK]: {
        [PieceType.KING]: '♚',
        [PieceType.QUEEN]: '♛',
        [PieceType.ROOK]: '♜',
        [PieceType.BISHOP]: '♝',
        [PieceType.KNIGHT]: '♞',
        [PieceType.PAWN]: '♟'
    }
};

// Игровое состояние
let gameState = {
    board: [],
    selectedPiece: null,
    possibleMoves: [],
    currentPlayer: Color.WHITE,
    gameOver: false,
    check: false,
    moveHistory: []
};

// Инициализация доски
function initializeBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Расстановка пешек
    for (let i = 0; i < 8; i++) {
        board[1][i] = { type: PieceType.PAWN, color: Color.BLACK };
        board[6][i] = { type: PieceType.PAWN, color: Color.WHITE };
    }
    
    // Расстановка фигур
    const piecesOrder = [
        PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
        PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
    ];
    
    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: piecesOrder[i], color: Color.BLACK };
        board[7][i] = { type: piecesOrder[i], color: Color.WHITE };
    }
    
    return board;
}

// Отрисовка доски
function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            const piece = gameState.board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                pieceElement.dataset.type = piece.type;
                pieceElement.dataset.color = piece.color;
                pieceElement.textContent = PieceSymbols[piece.color][piece.type];
                
                square.appendChild(pieceElement);
            }
            
            // Показать возможные ходы
            if (gameState.possibleMoves.some(move => move.row === row && move.col === col)) {
                const moveIndicator = document.createElement('div');
                moveIndicator.className = gameState.board[row][col] ? 'possible-capture' : 'possible-move';
                square.appendChild(moveIndicator);
            }
            
            // Выделить выбранную фигуру
            if (gameState.selectedPiece && 
                gameState.selectedPiece.row === row && 
                gameState.selectedPiece.col === col) {
                const pieceElement = square.querySelector('.piece');
                if (pieceElement) {
                    pieceElement.classList.add('selected');
                }
            }
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            chessboard.appendChild(square);
        }
    }
    
    updateStatus();
}

// Обновление статуса игры
function updateStatus() {
    const statusElement = document.getElementById('status');
    const undoBtn = document.getElementById('undoBtn');
    
    undoBtn.disabled = gameState.moveHistory.length === 0;
    
    if (gameState.gameOver) {
        statusElement.innerHTML = 'Игра окончена!';
    } else {
        let statusText = `Сейчас ходят: <span class="${gameState.currentPlayer === Color.WHITE ? 'white-text' : 'black-text'}">${
            gameState.currentPlayer === Color.WHITE ? 'белые' : 'черные'
        }</span>`;
        
        if (gameState.check) {
            statusText += ` <span class="check-indicator">(Шах!)</span>`;
        }
        
        statusElement.innerHTML = statusText;
    }
}

// Обработка клика по клетке
function handleSquareClick(row, col) {
    if (gameState.gameOver) return;
    
    const piece = gameState.board[row][col];
    
    // Если фигура выбрана и это ход текущего игрока
    if (piece && piece.color === gameState.currentPlayer) {
        gameState.selectedPiece = { row, col };
        gameState.possibleMoves = getPossibleMoves(row, col, piece);
        renderBoard();
        return;
    }
    
    // Если есть выбранная фигура и это возможный ход
    if (gameState.selectedPiece) {
        const isMoveValid = gameState.possibleMoves.some(
            move => move.row === row && move.col === col
        );
        
        if (isMoveValid) {
            makeMove(gameState.selectedPiece.row, gameState.selectedPiece.col, row, col);
        }
    }
}

// Получение возможных ходов (упрощенная версия)
function getPossibleMoves(row, col, piece) {
    const moves = [];
    
    switch (piece.type) {
        case PieceType.PAWN:
            const direction = piece.color === Color.WHITE ? -1 : 1;
            // Ход на 1 вперед
            if (isInBounds(row + direction, col) && !gameState.board[row + direction][col]) {
                moves.push({ row: row + direction, col });
                // Ход на 2 вперед с начальной позиции
                const startRow = piece.color === Color.WHITE ? 6 : 1;
                if (row === startRow && !gameState.board[row + 2 * direction][col]) {
                    moves.push({ row: row + 2 * direction, col });
                }
            }
            // Взятие по диагонали
            for (const dc of [-1, 1]) {
                const newCol = col + dc;
                if (isInBounds(row + direction, newCol) {
                    const targetPiece = gameState.board[row + direction][newCol];
                    if (targetPiece && targetPiece.color !== piece.color) {
                        moves.push({ row: row + direction, col: newCol });
                    }
                }
            }
            break;
            
        case PieceType.ROOK:
            addStraightMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.KNIGHT:
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                const newRow = row + dr;
                const newCol = col + dc;
                if (isInBounds(newRow, newCol)) {
                    const targetPiece = gameState.board[newRow][newCol];
                    if (!targetPiece || targetPiece.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;
            
        case PieceType.BISHOP:
            addDiagonalMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.QUEEN:
            addStraightMoves(row, col, piece.color, moves);
            addDiagonalMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.KING:
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (isInBounds(newRow, newCol)) {
                        const targetPiece = gameState.board[newRow][newCol];
                        if (!targetPiece || targetPiece.color !== piece.color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    }
                }
            }
            break;
    }
    
    return moves;
}

// Вспомогательные функции для ходов
function addStraightMoves(row, col, color, moves) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isInBounds(newRow, newCol)) break;
            
            const targetPiece = gameState.board[newRow][newCol];
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }
}

function addDiagonalMoves(row, col, color, moves) {
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isInBounds(newRow, newCol)) break;
            
            const targetPiece = gameState.board[newRow][newCol];
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }
}

function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Выполнение хода
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = gameState.board[fromRow][fromCol];
    
    // Сохраняем информацию о ходе
    const moveRecord = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: piece,
        captured: gameState.board[toRow][toCol]
    };
    
    // Выполняем ход
    gameState.board[fromRow][fromCol] = null;
    gameState.board[toRow][toCol] = piece;
    
    // Проверка на превращение пешки
    if (piece.type === PieceType.PAWN && (toRow === 0 || toRow === 7)) {
        gameState.board[toRow][toCol].type = PieceType.QUEEN;
    }
    
    // Смена игрока
    gameState.currentPlayer = gameState.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    
    // Сохраняем ход в истории
    gameState.moveHistory.push(moveRecord);
    
    renderBoard();
}

// Отмена хода
function undoMove() {
    if (gameState.moveHistory.length === 0) return;
    
    const lastMove = gameState.moveHistory.pop();
    
    // Восстанавливаем доску
    gameState.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    gameState.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
    
    // Возвращаем предыдущего игрока
    gameState.currentPlayer = lastMove.piece.color;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    
    renderBoard();
}

// Новая игра
function newGame() {
    gameState = {
        board: initializeBoard(),
        selectedPiece: null,
        possibleMoves: [],
        currentPlayer: Color.WHITE,
        gameOver: false,
        check: false,
        moveHistory: []
    };
    renderBoard();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram Web App
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }
    
    // Инициализация игры
    newGame();
    
    // Назначение обработчиков кнопок
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    
    console.log("Шахматы загружены!");
});
