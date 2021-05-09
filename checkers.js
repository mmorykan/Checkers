// Checkers Project
// Jonah Beers and Mark Morykan

// Global WebGL context variable
let gl;

// Drawing Sizes
const SQUARE_SZ = 2/8;
const PIECE_RADIUS = SQUARE_SZ/2 * 0.8; // make the radius a little smaller than a square so it fits inside
const NUM_SIDES = 64; // circle "sides"
let PIECE_CLICK_COORD_RADIUS; // radius of a checker in click coordinates

// // Basic Colors
const WHITE = [1.0, 1.0, 1.0, 1.0];
const BLACK = [0.0, 0.0, 0.0, 1.0];

// // Square Colors
const DARK_SQUARE = [0.82, 0.55, 0.28, 1.0];
const LIGHT_SQUARE = [1.0, 0.89, 0.67, 1.0];

// Once the document is fully loaded run this init function.
window.addEventListener('load', function init() {
    // Get the HTML5 canvas object from it's ID
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) { window.alert('Could not find #webgl-canvas'); return; }

    // Get the WebGL context (save into a global variable)
    gl = canvas.getContext('webgl2');
    if (!gl) { window.alert("WebGL isn't available"); return; }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height); // this is the region of the canvas we want to draw on (all of it)
    gl.clearColor(...LIGHT_SQUARE); // setup the background color

    // Initialize the WebGL program, buffers, and events
    gl.program = initProgram();
    initBuffers();
    initEvents();

    gl.game = new CheckerBoard();  // Generates the 2D array as the board
    gl.game.setCurrentTurnUI();  // Set the current turn indicator
    PIECE_CLICK_COORD_RADIUS =  (canvas.width * SQUARE_SZ / 2) / 2 * 0.8; // Calculate radius of checker in click coordinates

    // Render the static scene
    render();
});


/**
 * Initializes the WebGL program.
 */
function initProgram() {
    // Compile shaders
    // Vertex Shader
    let vert_shader = compileShader(gl, gl.VERTEX_SHADER,
        `#version 300 es
        precision mediump float;

        in vec4 aPosition;
        uniform vec4 uTransformation;

        in vec4 aColor;
        out vec4 vColor;
        
        void main() {
            gl_Position = aPosition + uTransformation;  // Translate piece when user drags checker
            vColor = aColor;
        }`
    );
    // Fragment Shader
    let frag_shader = compileShader(gl, gl.FRAGMENT_SHADER,
        `#version 300 es
        precision mediump float;

        uniform vec4 uColor;
        in vec4 vColor;
        out vec4 fragColor;

        void main() {
            fragColor = vColor * uColor;  // Set color of piece
        }`
    );

    // Link the shaders into a program and use them with the WebGL context
    let program = linkProgram(gl, vert_shader, frag_shader);
    gl.useProgram(program);
    
    // Get the attribute indices
    program.aPosition = gl.getAttribLocation(program, 'aPosition'); // Get the vertex shader attribute "aPosition"
    program.aColor = gl.getAttribLocation(program, 'aColor');

    // Get the uniform indices
    program.uTransformation = gl.getUniformLocation(program, 'uTransformation'); // Get the fragment shafer uniform "uTransformation"
    program.uColor = gl.getUniformLocation(program, 'uColor'); // Get the fragment shader uniform "uColor"
    
    return program;
}


/**
 * Initialize the data buffers.
 */
function initBuffers() {
    // The vertices for the square
    let squareCoords = [
        0, 0, 
        0, SQUARE_SZ, 
        SQUARE_SZ, 0, 
        SQUARE_SZ, SQUARE_SZ,
    ];

    let checkerCoords = [];
    circle(0, 0, PIECE_RADIUS + 0.006, NUM_SIDES, checkerCoords);  // Border around the checkers
    circle(0, 0, PIECE_RADIUS, NUM_SIDES, checkerCoords);  // The actual checkers 

    let coords = squareCoords.concat(checkerCoords);
    
    // Colors for single dark square, black checker border, and default checker
    let colors = [DARK_SQUARE, DARK_SQUARE, DARK_SQUARE, DARK_SQUARE,];
    for (let i = 0; i < NUM_SIDES + 2; i++) colors.push(BLACK);
    for (let i = 0; i < NUM_SIDES + 2; i++) colors.push(WHITE);
    colors = colors.flat();

    // Create and bind VAO
    gl.vao = gl.createVertexArray();
    gl.bindVertexArray(gl.vao);

    // Load the vertex data into the GPU and associate with shader
    let posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(coords), gl.STATIC_DRAW);
    gl.vertexAttribPointer(gl.program.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.program.aPosition);

    // Load the color data into the GPU and associate with shader
    let colorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(gl.program.aColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.program.aColor);

    // Cleanup
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}


/**
 * Initialize event handlers.
 */
function initEvents() {
    gl.canvas.addEventListener('mousedown', selectPiece);
}


/**
 * Stores a circle's coordinates in the coords array.
 */
function circle(cx, cy, r, n, coords) {
    // The angle between subsequent vertices
    let theta = 2*Math.PI/n;

    // Push the center vertex (all triangles share this one)
    coords.push(cx, cy);

    // Push the first coordinate around the circle
    coords.push(cx+r, cy);

    // Loop over each of the triangles we have to create
    for (let i = 1; i <= n; ++i) {
        // Push the next coordinate
        coords.push(cx+Math.cos(i*theta)*r, cy+Math.sin(i*theta)*r);
    }
}


/**
 * Draws all the dark squares for the CheckerBoard.
 */
function drawCheckerBoard() {
    for (let i = 0.75, j, row_index = 0; i >= -1; i -= 0.25, row_index++) { // loop over each row
        if (row_index % 2 === 0) j = -0.75; 
        else j = -1;
        for (let k = 0; j < 1; j += 0.5, k++) { // loop over columns
            gl.uniform4f(gl.program.uTransformation, j, i, 0, 0);
            gl.uniform4f(gl.program.uColor, 1.0, 1.0, 1.0, 1.0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }
}


/**
 * Draws every checker in the CheckerBoard array.
 */
function drawCheckers() {
    let currentPiece = gl.game.currentPiece;
    for (let i = 0; i < gl.game.board.length; i++) {
        for (let j = 0; j < gl.game.board[i].length; j++) {
            let checker = gl.game.getChecker(i, j);
            if (checker) {
                let xMultiplier = j - 4;
                let yMultiplier = 4 - i; 
                if (checker !== currentPiece) {
                    drawChecker(checker, xMultiplier, yMultiplier, SQUARE_SZ/2);
                    if (checker.isKing) drawChecker(checker, xMultiplier, yMultiplier, 0.105);
                }
            }
        }
    }
    // Draws the current piece on top to be able to drag piece over other pieces
    if (currentPiece) {
        drawChecker(currentPiece, currentPiece.x, currentPiece.y, 0);
        if (currentPiece.isKing) drawChecker(currentPiece, currentPiece.x, currentPiece.y, SQUARE_SZ/2 - 0.105);
    }
}

/**
 * Draws a checker.
 */
function drawChecker(checker, xMultiplier, yMultiplier, offset) {
    // Sets x and y multiplier to ensure piece is centered in square
    let x = SQUARE_SZ*xMultiplier + SQUARE_SZ/2;
    let y = SQUARE_SZ*yMultiplier - offset;
    
    // Resets multipliers if pieces is being dragged by the user
    if (checker === gl.game.currentPiece) {
        x = xMultiplier;
        y = yMultiplier + offset;
    }

    // Draw checker border
    gl.uniform4f(gl.program.uTransformation, x, y, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 4, NUM_SIDES + 2);
       
    // Draw checker
    gl.uniform4f(gl.program.uTransformation, x, y, 0, 0);
    gl.uniform4fv(gl.program.uColor, checker === gl.game.currentPiece ? checker.highlightColor : checker.color);
    gl.drawArrays(gl.TRIANGLE_FAN, NUM_SIDES + 6, NUM_SIDES + 2);
}


/**
 * Render the scene. 
 */
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(gl.vao);

    drawCheckerBoard();
    drawCheckers();

    gl.bindVertexArray(null);
}


/**
 * Event handler that gets the position of the clicked piece, finds its 
 * potential moves and adds event listeners mousemove and mouseup.
 */
function selectPiece(e) {
    // Get the CheckerBoard array indices and checker object of the clicked location on the board
    let [colIndex, rowIndex, piece] = getPiece(e.offsetX, e.offsetY);
    
    // Return if user did not click on a checker or if user clicked on other player's checker
    if (!piece || !gl.game.isCorrectPlayerChecker(piece)) return;

    if (gl.game.doubleJumpExists()) {  // Multi-jump exists
        // Return if they did not click on the checker that has a multi-jump
        if (piece === gl.game.currentPiece) {  
            gl.game.currentPiece.rowIndex = rowIndex;
            gl.game.currentPiece.colIndex = colIndex;
            setCurrentPieceCoords(e.offsetX, e.offsetY);

            gl.canvas.addEventListener('mousemove', movePiece);
            window.addEventListener('mouseup', dropPiece);
            render();
        }
        return;
    }
    // Keep track of piece and its CheckerBoard array indices as a global currentPiece
    gl.game.currentPiece = piece;
    gl.game.currentPiece.rowIndex = rowIndex;
    gl.game.currentPiece.colIndex = colIndex;

    // Set Click Coordinates of the current piece in order to constantly render during drag
    setCurrentPieceCoords(e.offsetX, e.offsetY);
    gl.game.findPotentialMoves(rowIndex, colIndex);

    // Add event listeners for when user moves and drops the checker, and render the scene
    gl.canvas.addEventListener('mousemove', movePiece);
    window.addEventListener('mouseup', dropPiece);
    render();
}


/**
 * Constantly resets coordinates as user drags checker and renders the scene.
 */
function movePiece(e) {
    setCurrentPieceCoords(e.offsetX, e.offsetY);
    render();
}


/**
 * Get the CheckerBoard array indices and Checker object of the drop location.
 * Move the current piece to the new position if drop location is a potential move.
 * Return if the current piece just jumped and can jump again (multi-jump).
 */
function dropPiece(e) {
    // Get the CheckerBoard array indices and Checker object of the drop spot
    let [colIndex, rowIndex, piece] = getPiece(e.offsetX, e.offsetY);

    if (piece && piece.color === gl.game.POTENTIAL_PIECE) {  // Dropped piece on a potential spot
        gl.game.move(rowIndex, colIndex);

        if (gl.game.isPotentialJumpPiece(gl.game.currentPiece)) {  // If the current piece just jumped
            gl.game.findPotentialMoves(rowIndex, colIndex);  // Populates potential piece locations array with jump locations
            if (gl.game.potentialPieceLocations.length > 0) {  // If there are potential jump locations, forcing a jump move
                // Sets current piece location to the CheckerBoard array indices converted to Clip Space
                gl.game.currentPiece.x = SQUARE_SZ*(colIndex - 4) + SQUARE_SZ/2;
                gl.game.currentPiece.y = SQUARE_SZ*(4 - rowIndex) - SQUARE_SZ/2;
                gl.game.forcedJump = true;
                cleanup();
                return;
            }
            gl.game.forcedJump = false;
        }
        gl.game.switchTurns();  // Switch turns and update the current player indicator above the canvas
    } else {  // Drop piece anywhere other than potential spot
        if (gl.game.doubleJumpExists()) {  // Keep current piece and its potential moves if it can jump again
            gl.game.currentPiece.x = SQUARE_SZ*(gl.game.currentPiece.colIndex - 4) + SQUARE_SZ/2;
            gl.game.currentPiece.y = SQUARE_SZ*(4 - gl.game.currentPiece.rowIndex) - SQUARE_SZ/2;
            cleanup();
            return;
        }       
    }
    
    // Cleanup for next turn and render
    gl.game.clearCurrentPiece();
    gl.game.removePotentialMoves();
    cleanup();
}


/**
 * Remove mousemove/mouseup event listeners, render scene, and check if game is over.
 */
function cleanup() {
    gl.canvas.removeEventListener('mousemove', movePiece);
    window.removeEventListener('mouseup', dropPiece);
    render();
    if (gl.game.isGameover()) gl.canvas.removeEventListener('mousedown', selectPiece);
}


/**
 * Forces the dragged piece to stay inside the canvas and sets the 
 * piece's coordinates to Clip Coordinates.
 */
function setCurrentPieceCoords(offsetX, offsetY) {
    let [x, y, w, h] = [offsetX, offsetY, gl.canvas.offsetWidth, gl.canvas.offsetHeight];
    if (x + PIECE_CLICK_COORD_RADIUS > w) {
        x = w - PIECE_CLICK_COORD_RADIUS;
    } else if (x - PIECE_CLICK_COORD_RADIUS < 0) { 
        x = PIECE_CLICK_COORD_RADIUS;
    }
    if (y + PIECE_CLICK_COORD_RADIUS > h)  {
        y = h - PIECE_CLICK_COORD_RADIUS;
    } else if (y - PIECE_CLICK_COORD_RADIUS < 0) {
        y = PIECE_CLICK_COORD_RADIUS;
    }
    [x, y] = [(2 * x) / w - 1, 1 - (2 * y) / h];
    gl.game.currentPiece.x = x;
    gl.game.currentPiece.y = y;
}


/**
 * Returns the CheckerBoard array indices and Checker object given Click Coordinates.
 */
function getPiece(offsetX, offsetY) {
    let colIndex = Math.floor(offsetX / 50);
    let rowIndex = Math.floor(offsetY / 50);
    
    // Checks boundaries if you click on corner of canvas where the x and y values may possibly be 8 or 0
    let piece = (rowIndex < 8 && rowIndex >= 0) ? gl.game.getChecker(rowIndex, colIndex) : null;
    return [colIndex, rowIndex, piece];
}

