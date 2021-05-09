// Checker Class
// Jonah Beers and Mark Morykan

class Checker {
    
    constructor(color, opponentColor, highlightColor, isKing) {
        this._color = color;  // Array containing Checker's color
        this._opponentColor = opponentColor;  // Array containing opponent's color
        this._highlightColor = highlightColor;  // Array containing color when checker is highlighted
        this._isKing = isKing;  // Checker is king - true, not king - false
    }

    get color() {
        return this._color;
    }

    get opponentColor() {
        return this._opponentColor;
    }

    get highlightColor() {
        return this._highlightColor;
    }

    get isKing() {
        return this._isKing;
    }

    set isKing(isKing) {
        this._isKing = isKing;
    } 

}