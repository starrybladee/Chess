// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

const pieceImages = {
  'wk': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  'wq': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  // ... добавьте аналогично для всех фигур
};
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

// Игровое состояние
let gameState = {
    board: [],
    selectedPiece: null,
    possibleMoves: [],
    currentPlayer: Color.WHITE,
    gameOver: false,
    check: false,
    moveHistory: [],
    enPassantTarget: null,
    castlingRights: {
        [Color.WHITE]: { kingside: true, queenside: true },
        [Color.BLACK]: { kingside: true, queenside: true }
    },
    kingPositions: {
        [Color.WHITE]: { row: 7, col: 4 },
        [Color.BLACK]: { row: 0, col: 4 }
    }
};

// Инициализация доски
function initializeBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Расстановка пешек
    for (let i = 0; i < 8; i++) {
        board[1][i] = { type: PieceType.PAWN, color: Color.BLACK, hasMoved: false };
        board[6][i] = { type: PieceType.PAWN, color: Color.WHITE, hasMoved: false };
    }
    
    // Расстановка фигур
    const piecesOrder = [
        PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
        PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
    ];
    
    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: piecesOrder[i], color: Color.BLACK, hasMoved: false };
        board[7][i] = { type: piecesOrder[i], color: Color.WHITE, hasMoved: false };
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
                pieceElement.style.backgroundImage = `url('pieces/${piece.color}${piece.type}.png')`;
                square.appendChild(pieceElement);
            }
            
            // Показать возможные ходы
            const moveInfo = gameState.possibleMoves.find(m => m.row === row && m.col === col);
            if (moveInfo) {
                if (gameState.board[row][col]) {
                    const captureIndicator = document.createElement('div');
                    captureIndicator.className = 'possible-capture';
                    square.appendChild(captureIndicator);
                } else {
                    const moveIndicator = document.createElement('div');
                    moveIndicator.className = 'possible-move';
                    square.appendChild(moveIndicator);
                }
            }
            
            // Выделить выбранную фигуру
            if (gameState.selectedPiece && gameState.selectedPiece.row === row && gameState.selectedPiece.col === col) {
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
        filterLegalMoves();
        renderBoard();
        return;
    }
    
    // Если есть выбранная фигура и это возможный ход
    if (gameState.selectedPiece) {
        const moveInfo = gameState.possibleMoves.find(
            m => m.row === row && m.col === col
        );
        
        if (moveInfo) {
            makeMove(
                gameState.selectedPiece.row, 
                gameState.selectedPiece.col, 
                row, 
                col,
                moveInfo.specialMove
            );
        }
    }
}

// Получение возможных ходов
function getPossibleMoves(row, col, piece) {
    const moves = [];
    
    switch (piece.type) {
        case PieceType.PAWN:
            getPawnMoves(row, col, piece, moves);
            break;
            
        case PieceType.ROOK:
            getStraightMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.KNIGHT:
            getKnightMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.BISHOP:
            getDiagonalMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.QUEEN:
            getStraightMoves(row, col, piece.color, moves);
            getDiagonalMoves(row, col, piece.color, moves);
            break;
            
        case PieceType.KING:
            getKingMoves(row, col, piece.color, moves);
            break;
    }
    
    return moves;
}

// Ходы пешки
function getPawnMoves(row, col, piece, moves) {
    const direction = piece.color === Color.WHITE ? -1 : 1;
    const startRow = piece.color === Color.WHITE ? 6 : 1;
    
    // Ход на 1 вперед
    if (isInBounds(row + direction, col) && !gameState.board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        
        // Ход на 2 вперед с начальной позиции
        if (row === startRow && !gameState.board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col, enPassantable: true });
        }
    }
    
    // Взятие по диагонали
    for (const dc of [-1, 1]) {
        const newCol = col + dc;
        if (isInBounds(row + direction, newCol)) {
            // Обычное взятие
            if (gameState.board[row + direction][newCol] && 
                gameState.board[row + direction][newCol].color !== piece.color) {
                moves.push({ row: row + direction, col: newCol });
            }
            
            // Взятие на проходе
            if (gameState.enPassantTarget && 
                gameState.enPassantTarget.row === row && 
                gameState.enPassantTarget.col === newCol) {
                moves.push({ 
                    row: row + direction, 
                    col: newCol, 
                    specialMove: 'enPassant' 
                });
            }
        }
    }
}

// Ходы коня
function getKnightMoves(row, col, color, moves) {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isInBounds(newRow, newCol)) {
            if (!gameState.board[newRow][newCol] || gameState.board[newRow][newCol].color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
}

// Ходы короля
function getKingMoves(row, col, color, moves) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = row + dr;
            const newCol = col + dc;
            if (isInBounds(newRow, newCol)) {
                if (!gameState.board[newRow][newCol] || gameState.board[newRow][newCol].color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    }
    
    // Рокировка
    if (!gameState.board[row][col].hasMoved && !isInCheck(color)) {
        // Короткая рокировка (kingside)
        if (gameState.castlingRights[color].kingside && 
            !gameState.board[row][5] && 
            !gameState.board[row][6] && 
            gameState.board[row][7]?.type === PieceType.ROOK && 
            !gameState.board[row][7].hasMoved) {
            
            // Проверяем, что король не проходит через битое поле
            if (!isSquareUnderAttack(row, 5, color) && !isSquareUnderAttack(row, 6, color)) {
                moves.push({ 
                    row: row, 
                    col: 6, 
                    specialMove: 'castling', 
                    rookFrom: { row, col: 7 }, 
                    rookTo: { row, col: 5 } 
                });
            }
        }
        
        // Длинная рокировка (queenside)
        if (gameState.castlingRights[color].queenside && 
            !gameState.board[row][3] && 
            !gameState.board[row][2] && 
            !gameState.board[row][1] && 
            gameState.board[row][0]?.type === PieceType.ROOK && 
            !gameState.board[row][0].hasMoved) {
            
            // Проверяем, что король не проходит через битое поле
            if (!isSquareUnderAttack(row, 3, color) && !isSquareUnderAttack(row, 2, color)) {
                moves.push({ 
                    row: row, 
                    col: 2, 
                    specialMove: 'castling', 
                    rookFrom: { row, col: 0 }, 
                    rookTo: { row, col: 3 } 
                });
            }
        }
    }
}

// Прямые ходы (ладья, ферзь)
function getStraightMoves(row, col, color, moves) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isInBounds(newRow, newCol)) break;
            
            if (!gameState.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (gameState.board[newRow][newCol].color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }
}

// Диагональные ходы (слон, ферзь)
function getDiagonalMoves(row, col, color, moves) {
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newRow = row + dr * i;
            const newCol = col + dc * i;
            if (!isInBounds(newRow, newCol)) break;
            
            if (!gameState.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (gameState.board[newRow][newCol].color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }
    }
}

// Проверка на нахождение в пределах доски
function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Фильтрация легальных ходов (убираем ходы, оставляющие короля под шахом)
function filterLegalMoves() {
    if (!gameState.selectedPiece) return;
    
    const { row, col } = gameState.selectedPiece;
    const piece = gameState.board[row][col];
    const color = piece.color;
    
    gameState.possibleMoves = gameState.possibleMoves.filter(move => {
        // Создаем временное состояние доски для проверки
        const tempBoard = JSON.parse(JSON.stringify(gameState.board));
        const tempEnPassant = gameState.enPassantTarget;
        const tempCastling = JSON.parse(JSON.stringify(gameState.castlingRights));
        
        // Выполняем временный ход
        performMove(tempBoard, row, col, move.row, move.col, move.specialMove, color);
        
        // Проверяем, остался ли король под шахом
        const kingPos = move.specialMove === 'castling' ? 
            { row: move.row, col: move.col } : 
            (piece.type === PieceType.KING ? 
                { row: move.row, col: move.col } : 
                gameState.kingPositions[color]);
        
        const inCheckAfterMove = isSquareUnderAttack(kingPos.row, kingPos.col, color, tempBoard);
        
        return !inCheckAfterMove;
    });
}

// Проверка, находится ли клетка под атакой
function isSquareUnderAttack(row, col, defenderColor, customBoard = null) {
    const board = customBoard || gameState.board;
    const attackerColor = defenderColor === Color.WHITE ? Color.BLACK : Color.WHITE;
    
    // Проверка атаки пешками
    const pawnDirection = attackerColor === Color.WHITE ? -1 : 1;
    for (const dc of [-1, 1]) {
        const attackRow = row - pawnDirection;
        const attackCol = col + dc;
        if (isInBounds(attackRow, attackCol)) {
            const piece = board[attackRow][attackCol];
            if (piece && piece.color === attackerColor && piece.type === PieceType.PAWN) {
                return true;
            }
        }
    }
    
    // Проверка атаки конями
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const attackRow = row + dr;
        const attackCol = col + dc;
        if (isInBounds(attackRow, attackCol)) {
            const piece = board[attackRow][attackCol];
            if (piece && piece.color === attackerColor && piece.type === PieceType.KNIGHT) {
                return true;
            }
        }
    }
    
    // Проверка атаки по прямым линиям (ладьи, ферзи)
    const straightDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirections) {
        for (let i = 1; i < 8; i++) {
            const attackRow = row + dr * i;
            const attackCol = col + dc * i;
            if (!isInBounds(attackRow, attackCol)) break;
            
            const piece = board[attackRow][attackCol];
            if (piece) {
                if (piece.color === attackerColor && 
                    (piece.type === PieceType.ROOK || piece.type === PieceType.QUEEN)) {
                    return true;
                }
                break;
            }
        }
    }
    
    // Проверка атаки по диагоналям (слоны, ферзи)
    const diagonalDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagonalDirections) {
        for (let i = 1; i < 8; i++) {
            const attackRow = row + dr * i;
            const attackCol = col + dc * i;
            if (!isInBounds(attackRow, attackCol)) break;
            
            const piece = board[attackRow][attackCol];
            if (piece) {
                if (piece.color === attackerColor && 
                    (piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN)) {
                    return true;
                }
                break;
            }
        }
    }
    
    // Проверка атаки королем
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const attackRow = row + dr;
            const attackCol = col + dc;
            if (isInBounds(attackRow, attackCol)) {
                const piece = board[attackRow][attackCol];
                if (piece && piece.color === attackerColor && piece.type === PieceType.KING) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Проверка на шах
function isInCheck(color) {
    const kingPos = gameState.kingPositions[color];
    return isSquareUnderAttack(kingPos.row, kingPos.col, color);
}

// Проверка на мат или пат
function checkGameEnd(color) {
    // Проверяем все возможные ходы для текущего игрока
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === color) {
                const moves = getPossibleMoves(row, col, piece);
                const legalMoves = moves.filter(move => {
                    // Создаем временное состояние доски для проверки
                    const tempBoard = JSON.parse(JSON.stringify(gameState.board));
                    
                    // Выполняем временный ход
                    performMove(tempBoard, row, col, move.row, move.col, move.specialMove, color);
                    
                    // Проверяем, остался ли король под шахом
                    const kingPos = move.specialMove === 'castling' ? 
                        { row: move.row, col: move.col } : 
                        (piece.type === PieceType.KING ? 
                            { row: move.row, col: move.col } : 
                            gameState.kingPositions[color]);
                    
                    return !isSquareUnderAttack(kingPos.row, kingPos.col, color, tempBoard);
                });
                
                if (legalMoves.length > 0) {
                    // Есть хотя бы один легальный ход - игра продолжается
                    return false;
                }
            }
        }
    }
    
    // Нет легальных ходов - игра окончена
    gameState.gameOver = true;
    gameState.check = isInCheck(color);
    return true;
}

// Выполнение хода
function makeMove(fromRow, fromCol, toRow, toCol, specialMove = null) {
    const piece = gameState.board[fromRow][fromCol];
    const moveRecord = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: { ...piece },
        captured: gameState.board[toRow][toCol],
        specialMove,
        enPassantTarget: gameState.enPassantTarget,
        castlingRights: JSON.parse(JSON.stringify(gameState.castlingRights))),
        check: false,
        gameOver: false
    };
    
    // Выполняем ход на основной доске
    performMove(gameState.board, fromRow, fromCol, toRow, toCol, specialMove, piece.color);
    
    // Обновляем позицию короля, если двигали короля
    if (piece.type === PieceType.KING) {
        gameState.kingPositions[piece.color] = { row: toRow, col: toCol };
    }
    
    // Обновляем права на рокировку
    updateCastlingRights(fromRow, fromCol, toRow, toCol, piece);
    
    // Проверяем, был ли это ход пешкой на 2 клетки (для взятия на проходе)
    if (specialMove === 'enPassant') {
        // Удаляем пешку, которая берется на проходе
        const capturedPawnRow = piece.color === Color.WHITE ? toRow + 1 : toRow - 1;
        moveRecord.captured = { ...gameState.board[capturedPawnRow][toCol] };
        gameState.board[capturedPawnRow][toCol] = null;
    } else if (piece.type === PieceType.PAWN && Math.abs(fromRow - toRow) === 2) {
        // Устанавливаем цель для взятия на проходе
        gameState.enPassantTarget = { 
            row: fromRow + (toRow - fromRow) / 2, 
            col: fromCol 
        };
    } else {
        gameState.enPassantTarget = null;
    }
    
    // Превращение пешки
    if (piece.type === PieceType.PAWN && (toRow === 0 || toRow === 7)) {
        // В этой версии всегда превращаем в ферзя
        gameState.board[toRow][toCol].type = PieceType.QUEEN;
        moveRecord.promotedTo = PieceType.QUEEN;
    }
    
    // Смена игрока
    gameState.currentPlayer = gameState.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    
    // Проверка на шах
    gameState.check = isInCheck(gameState.currentPlayer);
    moveRecord.check = gameState.check;
    
    // Проверка на конец игры
    const gameEnded = checkGameEnd(gameState.currentPlayer);
    moveRecord.gameOver = gameEnded;
    
    // Сохраняем ход в истории
    gameState.moveHistory.push(moveRecord);
    
    renderBoard();
}

// Вспомогательная функция для выполнения хода
function performMove(board, fromRow, fromCol, toRow, toCol, specialMove, color) {
    const piece = board[fromRow][fromCol];
    
    // Обычный ход
    board[fromRow][fromCol] = null;
    board[toRow][toCol] = piece;
    piece.hasMoved = true;
    
    // Специальные ходы
    if (specialMove === 'castling') {
        // Рокировка - перемещаем ладью
        const rookFromCol = toCol > fromCol ? 7 : 0;
        const rookToCol = toCol > fromCol ? 5 : 3;
        const rook = board[fromRow][rookFromCol];
        board[fromRow][rookFromCol] = null;
        board[fromRow][rookToCol] = rook;
        rook.hasMoved = true;
    } else if (specialMove === 'enPassant') {
        // Взятие на проходе - удаляем пешку противника
        const capturedPawnRow = color === Color.WHITE ? toRow + 1 : toRow - 1;
        board[capturedPawnRow][toCol] = null;
    }
}

// Обновление прав на рокировку
function updateCastlingRights(fromRow, fromCol, toRow, toCol, piece) {
    // Если двигали короля
    if (piece.type === PieceType.KING) {
        gameState.castlingRights[piece.color].kingside = false;
        gameState.castlingRights[piece.color].queenside = false;
    }
    
    // Если двигали ладью
    if (piece.type === PieceType.ROOK) {
        if (fromCol === 0) { // Ладья на queenside
            gameState.castlingRights[piece.color].queenside = false;
        } else if (fromCol === 7) { // Ладья на kingside
            gameState.castlingRights[piece.color].kingside = false;
        }
    }
    
    // Если взяли ладью
    const capturedPiece = gameState.board[toRow][toCol];
    if (capturedPiece?.type === PieceType.ROOK) {
        if (toCol === 0) { // Ладья на queenside
            gameState.castlingRights[capturedPiece.color].queenside = false;
        } else if (toCol === 7) { // Ладья на kingside
            gameState.castlingRights[capturedPiece.color].kingside = false;
        }
    }
}

// Отмена хода
function undoMove() {
    if (gameState.moveHistory.length === 0) return;
    
    const lastMove = gameState.moveHistory.pop();
    
    // Восстанавливаем доску
    gameState.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    gameState.board[lastMove.to.row][lastMove.to.col] = lastMove.captured || null;
    
    // Восстанавливаем специальные ходы
    if (lastMove.specialMove === 'castling') {
        // Возвращаем ладью на место
        const rook = gameState.board[lastMove.to.row][lastMove.rookTo.col];
        gameState.board[lastMove.to.row][lastMove.rookTo.col] = null;
        gameState.board[lastMove.rookFrom.row][lastMove.rookFrom.col] = rook;
        rook.hasMoved = false;
    } else if (lastMove.specialMove === 'enPassant') {
        // Возвращаем пешку, взятую на проходе
        const capturedPawnRow = lastMove.piece.color === Color.WHITE ? lastMove.to.row + 1 : lastMove.to.row - 1;
        gameState.board[capturedPawnRow][lastMove.to.col] = lastMove.captured;
    }
    
    // Восстанавливаем превращение пешки
    if (lastMove.promotedTo) {
        gameState.board[lastMove.from.row][lastMove.from.col].type = PieceType.PAWN;
    }
    
    // Восстанавливаем позицию короля
    if (lastMove.piece.type === PieceType.KING) {
        gameState.kingPositions[lastMove.piece.color] = { 
            row: lastMove.from.row, 
            col: lastMove.from.col 
        };
    }
    
    // Восстанавливаем состояние игры
    gameState.currentPlayer = lastMove.piece.color;
    gameState.enPassantTarget = lastMove.enPassantTarget;
    gameState.castlingRights = lastMove.castlingRights;
    gameState.check = false;
    gameState.gameOver = false;
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
        moveHistory: [],
        enPassantTarget: null,
        castlingRights: {
            [Color.WHITE]: { kingside: true, queenside: true },
            [Color.BLACK]: { kingside: true, queenside: true }
        },
        kingPositions: {
            [Color.WHITE]: { row: 7, col: 4 },
            [Color.BLACK]: { row: 0, col: 4 }
        }
    };
    renderBoard();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    newGame();
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    
    // Если нужно взаимодействие с Telegram
    if (tg.initDataUnsafe?.user) {
        console.log('Пользователь Telegram:', tg.initDataUnsafe.user);
    }
});
