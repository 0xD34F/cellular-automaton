function random(max, min) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min)) + min;
}

function CellField(x, y) {
    this.x_size = x;
    this.y_size = y;

    var t = this.data = new Array(x);
    for (var i = 0; i < x; i++) {
        t[i] = new Array(y);
    }

    this.fill(function() {
        return 0;
    });
}
CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            this.data[x][y] = f(x, y);
        }
    }
};
CellField.prototype.copy = function(cells) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            this.data[x][y] = cells.data[x][y];
        }
    }
};
CellField.prototype.draw = function(c, side, _x, _y, _x_size, _y_size) {
    _x = _x || 0;
    _y = _y || 0;
    _x_size = _x_size || this.x_size;
    _y_size = _y_size || this.y_size;

    for (var i = 0, x = _x; i < _x_size; i++, x++) {
        if (x === this.x_size) {
            x = 0;
        }

        for (var j = 0, y = _y; j < _y_size; j++, y++) {
            if (y === this.y_size) {
                y = 0;
            }

            c.fillStyle = this.colors[this.data[x][y]];
            c.fillRect(x * side + 1, y * side + 1, side - 1, side - 1);
        }
    }
};
CellField.prototype.colors = {
    0: '#000',
    1: '#FFF'
}

var CellularAutomaton = function(xSize, ySize, canvas) {
    var cells = new CellField(xSize, ySize),
        newCells = new CellField(xSize, ySize),
        newStatesTable = getNewStatesTable('\
function main() {\
    var s = (north & 1) + (south & 1) + (west & 1) + (east & 1) + (n_west & 1) + (s_west & 1) + (n_east & 1) + (s_east & 1);\
    return s === 3 ? 1 : (s === 2 ? center : 0);\
}\
        ');

    var intervalID = null,
        delay = 30;

    var ctx = canvas.getContext('2d'),
        cellSide = 3;

    canvas.width = ctx.width = xSize * cellSide + 1;
    canvas.height = ctx.height = ySize * cellSide + 1;
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, ctx.width, ctx.height);
    cells.draw(ctx, cellSide);

    function getNewStatesTable(code) {
var startTime = new Date();
        eval(code);

        var table = new Array(Math.pow(2, 9));

        for (var i = 0; i < table.length; i++) {
            var center = (i & (1 << 8)) >> 8,
                north  = (i & (1 << 7)) >> 7,
                south  = (i & (1 << 6)) >> 6,
                west   = (i & (1 << 5)) >> 5,
                east   = (i & (1 << 4)) >> 4,
                n_west = (i & (1 << 3)) >> 3,
                s_west = (i & (1 << 2)) >> 2,
                n_east = (i & (1 << 1)) >> 1,
                s_east =  i &  1;

            table[i] = main() & 1;
        }
console.log('table built in: ', new Date() - startTime);
        return table;
    };

    function newGeneration(n) {
        if (isNaN(n) || n < 1) {
            n = 1;
        }

        var d = cells.data,
            newD = newCells.data,
            xSize = cells.x_size,
            ySize = cells.y_size;

        for (var i = 0; i < n; i++) {
            for (var x = 0; x < xSize; x++) {
                for (var y = 0; y < ySize; y++) {
                    var xPrev = x === 0 ? xSize - 1 : x - 1,
                        xNext = x === xSize - 1 ? 0 : x + 1,
                        yPrev = y === 0 ? ySize - 1 : y - 1,
                        yNext = y === ySize - 1 ? 0 : y + 1;

                    var index = d[x][y] & 1;
                    index <<= 1; index |= d[x][yPrev] & 1;
                    index <<= 1; index |= d[x][yNext] & 1;
                    index <<= 1; index |= d[xPrev][y] & 1;
                    index <<= 1; index |= d[xNext][y] & 1;
                    index <<= 1; index |= d[xPrev][yPrev] & 1;
                    index <<= 1; index |= d[xPrev][yNext] & 1;
                    index <<= 1; index |= d[xNext][yPrev] & 1;
                    index <<= 1; index |= d[xNext][yNext] & 1;

                    newD[x][y] = newStatesTable[index];
                }
            }

            cells.copy(newCells);
        }
    }

    return {
        cells: cells,
        newGeneration: newGeneration,
        get delay() {
            return delay;
        },
        set delay(value) {
            delay = value;
        },
        get gps() {
            return Math.round(1000 / delay);
        },
        set gps(value) {
            delay = Math.round(1000 / value);
        },
        get cellSide() {
            return cellSide;
        },
        refresh: function(x, y, x_size, y_size) {
            cells.draw(ctx, cellSide, x, y, x_size, y_size);
        },
        isStarted: function() {
            return !!intervalID;
        },
        start: function() {
            if (intervalID) {
                return false;
            }

            intervalID = setInterval(function() {
var timeStart = new Date();
                newGeneration(1);
console.log('next generation got:', new Date() - timeStart);
                cells.draw(ctx, cellSide);
console.log(new Date() - timeStart);
            }, delay);

            return true;
        },
        stop: function() {
            if (!intervalID) {
                return false;
            }

            clearInterval(intervalID);
            intervalID = null;

            return true;
        }
    };
};

window.onload = function() {
    var X_SIZE = 256,
        Y_SIZE = 256;

    var cellsCanvas = document.getElementById('cells');

    var ca = CellularAutomaton(X_SIZE, Y_SIZE, cellsCanvas);

    /*ca.cells.fill(function() {
        return random(2);
    });*/

    ca.refresh();

    document.getElementById('start').onclick = function() {
        if (ca.isStarted()) {
            ca.stop();
            this.innerHTML = 'Start';
        } else {
            ca.start();
            this.innerHTML = 'Stop';
        }
    };

    cellsCanvas.onmousemove = cellsCanvas.onmousedown = function(e) {
        if (ca.isStarted() || (e.buttons !== 1 && e.buttons !== 2)) {
            return;
        }

        var x = Math.floor(e.offsetX / ca.cellSide),
            y = Math.floor(e.offsetY / ca.cellSide);

        if (e.buttons === 1) {
            ca.cells.data[x][y] = (ca.cells.data[x][y] + 1) & 3;
        } else if (e.buttons === 2) {
            ca.cells.data[x][y] = (ca.cells.data[x][y] - 1) & 3;
        }

        ca.refresh(x, y, 1, 1);
    };
    cellsCanvas.oncontextmenu = function() {
        return false;
    };
};
