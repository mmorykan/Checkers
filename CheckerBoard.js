// CheckerBoard Class
// Jonah Beers and Mark Morykan

/**
 * Represents the whole checkerboard as a 2D array.
 */
class CheckerBoard {

    constructor() {
        // Checker colors
        this.PLAYER_1 = [0.7, 0.0, 0.0, 1.0]; // red
        this.PLAYER_2 = [0.0, 0.7, 0.7, 1.0]; // dark cyan
        this.PLAYER_1_HIGHLIGHT = [0.8, 0.3, 0.3, 1.0]; // lighter red
        this.PLAYER_2_HIGHLIGHT = [0.0, 1.0, 1.0, 1.0]; // cyan
        this.POTENTIAL_PIECE = [1.0, 1.0, 0.6, 1.0]; // yellow
        
        this.currentPlayerUI = document.getElementById('current-turn'); // HTML Element above the canvas
        this.isPlayer1Turn = true; // player 1's turn - true, player 2's turn - false
        this.currentPiece = null; // current checker selected
        this.forcedJump = false;
        this.potentialJumpPieces = new Set(); // current player's checkers that have a jump move
        this.potentialPieceLocations = [];  // All locations where a piece can move
        this.checkerboard = this.initCheckerBoard();

        this.player1Pieces = 12; // pieces remaining for player 1
        this.player2Pieces = 12; // pieces remaining for player 2
    }

    /**
     * Creates the 2d array CheckerBoard and fills it with Checker objects.
     */
    initCheckerBoard() {
        let board = new Array(8);
        for (let i = 0; i < board.length; i++) {
            let arr = new Array(8);
            for (let j = 0; j < arr.length; j++) {            
                if (i === 3 || i === 4) { continue; }
                let color = this.PLAYER_2;
                let opponentColor = this.PLAYER_1;
                let highlightColor = this.PLAYER_2_HIGHLIGHT;
                if (i > 4) { 
                    color = this.PLAYER_1; 
                    opponentColor = this.PLAYER_2;
                    highlightColor = this.PLAYER_1_HIGHLIGHT
                }
                if ((i % 2 === 0) !== (j % 2 === 0)) arr[j] = new Checker(color, opponentColor, highlightColor, false); 
            }
            board[i] = arr;
        }
        return board;
    }

    get board() {
        return this.checkerboard;
    }

    getChecker(x, y) {
        return this.board[x][y];
    }

    insertChecker(checker, x, y) {
        this.board[x][y] = checker;
    }

    removeChecker(x, y) {
        this.board[x][y] = null;
    }

    /**
     * Moves the selected checker to the drop spot. Removes the checker in between the 
     * selected checker and the drop spot. Updates the player's remaining pieces as well 
     * as new king pieces. Removes all potential drop locations.
     * @param {Number} x value of the drop spot 
     * @param {Number} y value of the drop spot
     */
    move(x, y) {
        let [rowIndex, colIndex] = [this.currentPiece.rowIndex, this.currentPiece.colIndex]; // rowIndex and colIndex set in selectPiece event handler
        if (Math.abs(x - rowIndex) === 2) {  // True if a jump move
            this.removeChecker((x+rowIndex)/2, (y+colIndex)/2); // Remove the checker in between the select spot and the drop spot
            this.currentPiece.color === this.PLAYER_1 ? this.player2Pieces-- : this.player1Pieces--; // Update total amount of each player's pieces
        }

        // Remove old checker and insert new checker
        this.updatePlayerKings(x);
        this.removeChecker(rowIndex, colIndex);
        this.insertChecker(this.currentPiece, x, y);

        // Delete the potential piece from the potential piece array
        this.potentialPieceLocations = this.potentialPieceLocations.filter(([i, j]) => !(i === x && j === y));
        this.removePotentialMoves();
    }

    removePotentialMoves() {
        // Remove all potential piece locations from the board
        this.potentialPieceLocations.forEach(([x, y]) => { this.removeChecker(x, y) });
        this.resetPotentialPieceLocations();
    }
    
    resetPotentialPieceLocations() {
        this.potentialPieceLocations = [];
    }

    /**
     * Returns potential spots for checker, depending on its color and if it's a king. 
     */
    getPotentialPieceInfo(x, y) {
        let player_1_potential_spots = [[-1, -1], [-1, 1]]; // upper left, upper right
        let player_2_potential_spots = [[1, -1], [1, 1]]; // lower left, lower right
        let opponentColor = this.isPlayer1Turn ? this.PLAYER_2 : this.PLAYER_1;
        let potentialSpots = this.getChecker(x, y).isKing ? player_1_potential_spots.concat(player_2_potential_spots) : 
            (this.isPlayer1Turn ? player_1_potential_spots : player_2_potential_spots);

        return [potentialSpots, opponentColor];
    }


    /**
     * Inserts potential checkers into the potential move spots on the CheckerBoard.
     */
    findPotentialMoves(x, y) {
        this.resetPotentialPieceLocations();
        let moves = this.getPotentialMoveLocations(x, y, this.isPotentialJumpPieces());  // A list of potential move locations
        let checker = this.getChecker(x, y);
        for (let [i, j] of moves) {  
            this.insertChecker(new Checker(this.POTENTIAL_PIECE, null, null, checker.isKing), i, j);
            this.potentialPieceLocations.push([i, j]);
        }
    }


    /**
     * Returns all Potential Move Locations.
     */
    getPotentialMoveLocations(x, y, forceJump) {
        let [potentialSpots, opponentColor] = this.getPotentialPieceInfo(x, y);
        let moves = []
        for (let [i, j] of potentialSpots) { 
            if (this.checkSingleMoveBounds(x, y, i, j)) {
                let checker = this.getChecker(x+i, y+j);
                if (!checker) {
                    if (!forceJump) {
                        moves.push([x+i, y+j]);
                    }
                } else if (checker.color === opponentColor && this.checkJumpMoveBounds(x, y, i, j) && !this.getChecker(x+i*2, y+j*2)) {
                    moves.push([x+i*2, y+j*2]);
                }
            }
        }
        return moves;
    }

    /**
     * Store all Checker objects that can jump into a set.
     */
    storePotentialJumpMoves() {
        this.clearPotentialJumpPieces();
        let currentColor = this.isPlayer1Turn ? this.PLAYER_1 : this.PLAYER_2;
        
        for (let x = 0; x < this.board.length; x++) {
            for (let y = 0; y < this.board[x].length; y++) {
                let checker = this.getChecker(x, y);
                if (checker && checker.color === currentColor) {
                    let moves = this.getPotentialMoveLocations(x, y, true);
                    if (moves.length > 0) {
                        this.potentialJumpPieces.add(checker);
                    }
                }
            }
        }
    }

    /**
     * Updates the HTML to display the current player's turn.
     */
    setCurrentTurnUI() {
        let htmlTurnText = "Player 1's turn";
        let styleColor = "red";
        if (!this.isPlayer1Turn) {
            styleColor = "darkcyan";
            htmlTurnText = "Player 2's turn";
        }
        this.currentPlayerUI.innerHTML = htmlTurnText;
        this.currentPlayerUI.style.color = styleColor;
    }

    updatePlayerKings(x) {
        if (this.currentPiece.color === this.PLAYER_1 && x === 0 || this.currentPiece.color === this.PLAYER_2 && x === 7) {
            this.currentPiece.isKing = true;
        }
    }

    clearPotentialJumpPieces() {
        this.potentialJumpPieces.clear();
    }

    clearCurrentPiece() {
        this.currentPiece = null;
    }

    switchTurns() {
        this.isPlayer1Turn = !this.isPlayer1Turn;
        this.storePotentialJumpMoves(); 
        this.setCurrentTurnUI();
    }

    doubleJumpExists() {
        return this.forcedJump;
    }

    isPotentialJumpPieces() {
        return this.potentialJumpPieces.size > 0;
    }

    isPotentialJumpPiece(piece) {
        return this.potentialJumpPieces.has(piece);
    }

    isCorrectPlayerChecker(piece) {
        return (this.isPlayer1Turn && piece.color === this.PLAYER_1) || (!this.isPlayer1Turn && piece.color === this.PLAYER_2)
    }

    checkSingleMoveBounds(x, y, i, j) {
        return x + i >= 0 && x + i <= 7 && y + j >= 0 && y + j <= 7;
    }

    checkJumpMoveBounds(x, y, i, j) {
        return x+i*2 >= 0 && x+i*2 <= 7 && y+j*2 >= 0 && y+j*2 <= 7;
    }

    /**
     * Checks the number of checkers player 1 and player 2 has. Sets an alert
     * to pop up with the winner if someone won and returns true, else returns false.
     */
    isGameover() {
        if (this.player1Pieces === 0 || this.player2Pieces === 0) {
            let message = this.player2Pieces === 0 ? 'Player 1 won!' : 'Player 2 won!';
            this.currentPlayerUI.innerHTML = message;
            this.currentPlayerUI.style.color = "grey";
            return true;
        }
        return false;
    }

}
