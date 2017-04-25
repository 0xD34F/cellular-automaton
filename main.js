function random(max, min) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min)) + min;
}

function shiftArray(array, shift) {
    var from = 0,
        val = array[from];
        group = 1;

    for (var i = 0; i < array.length; i++) {
        var to = ((from + shift) + array.length) % array.length;
        if (to === from) {
            break;
        }

        var t = array[to];
        array[to] = val;
        from = to;
        val = t;

        if (from < group) {
            from = group++;
            val = array[from];
        }
    }
}

function CellField(x, y, viewOptions) {
    this.x_size = x;
    this.y_size = y;
    this.mode = 'edit';
    this.view = viewOptions instanceof Object ? viewOptions : {};

    var t = this.data = new Array(x);
    for (var i = 0; i < x; i++) {
        t[i] = new Array(y);
    }

    this.fill(function() {
        return 0;
    });

    if (this.view.canvas) {
        var that = this;

        var lastModified = [];
        this.view.canvas.onmouseup = function() {
            lastModified = [];
        };
        this.view.canvas.onmousedown = this.view.canvas.onmousemove = function(e) {
            if (that.mode !== 'edit' || (e.buttons !== 1 && e.buttons !== 2)) {
                return;
            }

            var _b = that.view.border,
                _t = Math.round(_b / 2),
                x = Math.floor((e.offsetX - _t) / (that.view.cell_side + _b)),
                y = Math.floor((e.offsetY - _t) / (that.view.cell_side + _b));

            if ((lastModified[0] === x && lastModified[1] === y) ||
                (x >= that.x_size || y >= that.y_size || x < 0 || y < 0)) {
                return;
            }

            if (e.buttons === 1) {
                that.data[x][y] = (that.data[x][y] + 1) & 3;
            } else if (e.buttons === 2) {
                that.data[x][y] = (that.data[x][y] - 1) & 3;
            }

            that.draw(x, y, 1, 1);
            lastModified = [ x, y ];
        };
        this.view.canvas.oncontextmenu = function() {
            return false;
        };
    }

    if (!isNaN(this.view.cell_side)) {
        this.resizeView(this.view.cell_side);
    }
}
CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            this.data[x][y] = f(x, y);
        }
    }
};
CellField.prototype.shift = function(_x, _y) {
    _x = _x || 0;
    _y = _y || 0;

    shiftArray(this.data, _x);
    for (var i = 0; i < this.x_size; i++) {
        shiftArray(this.data[i], _y);
    }
};
CellField.prototype.copy = function(cells, _x, _y) {
    _x = _x || 0;
    _y = _y || 0;

    for (var i = 0, x = _x; i < cells.x_size; i++, x++) {
        if (x === this.x_size) {
            x = 0;
        }

        for (var j = 0, y = _y; j < cells.y_size; j++, y++) {
            if (y === this.y_size) {
                y = 0;
            }

            this.data[x][y] = cells.data[i][j];
        }
    }
};
CellField.prototype.draw = function(_x, _y, _x_size, _y_size) {
    _x = _x || 0;
    _y = _y || 0;
    _x_size = _x_size || this.x_size;
    _y_size = _y_size || this.y_size;

    var border = this.view.border,
        side = this.view.cell_side,
        sideFull = side + border,
        c = this.view.context;

    for (var i = 0, x = _x; i < _x_size; i++, x++) {
        if (x === this.x_size) {
            x = 0;
        }

        for (var j = 0, y = _y; j < _y_size; j++, y++) {
            if (y === this.y_size) {
                y = 0;
            }

            c.fillStyle = this.colors[this.data[x][y]];
            c.fillRect(x * sideFull + border, y * sideFull + border, side, side);
        }
    }
};
CellField.prototype.drawGrouped = function() {
    var numStates = 4,
        border = this.view.border,
        side = this.view.cell_side,
        sideFull = side + border,
        c = this.view.context;

    var g = [];
    for (var i = 0; i < numStates; i++) {
        g.push([]);
    }

    var d = this.data;
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            g[d[x][y]].push(x, y);
        }
    }

    for (var state = 0; state < numStates; state++) {
        c.fillStyle = this.colors[state];

        for (var n = g[state], i = 0; i < n.length; i += 2) {
            c.fillRect(n[i] * sideFull + border, n[i + 1] * sideFull + border, side, side);
        }
    }
};
CellField.prototype.resizeView = function(cell_side, border) {
    if (!this.view.canvas || isNaN(cell_side) || cell_side < 1) {
        return;
    }

    var c = this.view.context = this.view.canvas.getContext('2d');

    var s = this.view.cell_side = cell_side,
        b = this.view.border = (arguments.length === 1 ? this.view.border : border) || 0;

    this.view.canvas.width  = c.width  = this.x_size * (s + b) + b;
    this.view.canvas.height = c.height = this.y_size * (s + b) + b;

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    this.draw();
};
CellField.prototype.colors = {
    background: '#888',
    0: '#000',
    1: '#FFF',
    2: '#444',
    3: '#CCC'
};

var CellularAutomaton = function(xSize, ySize, canvas) {
    var cells = new CellField(xSize, ySize, {
            canvas: canvas,
            cell_side: 3
        }),
        newCells = new CellField(xSize, ySize),
        newStatesTable = getNewStatesTable('\
function main() {\
    var s = (center & 1) + (north & 1) + (south & 1) + (west & 1) + (east & 1),\
        p0 = (s === 0 || s === 5 ? 0 : 1) ^ ((center & 2) >> 1),\
        p1 = center & 1;\
\
    return p0 | (p1 << 1);\
}\
        ');
        /*newStatesTable = getNewStatesTable('\
function main() {\
    var s = (north & 1) + (south & 1) + (west & 1) + (east & 1) + (n_west & 1) + (s_west & 1) + (n_east & 1) + (s_east & 1),\
        p0 = s === 3 ? 1 : (s === 2 ? center : 0),\
        p1 = !!center;\
\
    return p0 | (p1 << 1);\
}\
        ');*/
        /*newStatesTable = getNewStatesTable('\
function ready() {\
    return center & 3 === 0 ? 1 : 0;\
}\
\
function stimulus() {\
    var s = (north & 1) + (south & 1) + (west & 1) + (east & 1) + (n_west & 1) + (s_west & 1) + (n_east & 1) + (s_east & 1);\
    return s === 2 ? 1 : 0;\
}\
\
function main() {\
    return (stimulus() & ready()) | ((center & 1) << 1);\
}\
        ');*/
        /*newStatesTable = getNewStatesTable('\
function main() {\
    var s = (center & 1) + (north & 1) + (south & 1) + (west & 1) + (east & 1) + (n_west & 1) + (s_west & 1) + (n_east & 1) + (s_east & 1);\
    return s === 4 || s > 5 ? 1 : 0;\
}\
        ');*/
        /*newStatesTable = getNewStatesTable('\
function main() {\
    var s = (north & 1) + (south & 1) + (west & 1) + (east & 1) + (n_west & 1) + (s_west & 1) + (n_east & 1) + (s_east & 1);\
    return s === 3 ? 1 : (s === 2 ? center : 0);\
}\
        ');*/

    var intervalID = null,
        delay = 30;

    function getNewStatesTable(code) {
var startTime = new Date();
        eval(code);

        var table = new Array(Math.pow(2, 18));

        for (var i = 0; i < table.length; i++) {
            var center = (i & (3 << 16)) >> 16,
                north  = (i & (3 << 14)) >> 14,
                south  = (i & (3 << 12)) >> 12,
                west   = (i & (3 << 10)) >> 10,
                east   = (i & (3 <<  8)) >>  8,
                n_west = (i & (3 <<  6)) >>  6,
                s_west = (i & (3 <<  4)) >>  4,
                n_east = (i & (3 <<  2)) >>  2,
                s_east =  i &  3;

            table[i] = main() & 3;
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

                    var index = d[x][y] & 3;
                    index <<= 2; index |= d[x][yPrev] & 3;
                    index <<= 2; index |= d[x][yNext] & 3;
                    index <<= 2; index |= d[xPrev][y] & 3;
                    index <<= 2; index |= d[xNext][y] & 3;
                    index <<= 2; index |= d[xPrev][yPrev] & 3;
                    index <<= 2; index |= d[xPrev][yNext] & 3;
                    index <<= 2; index |= d[xNext][yPrev] & 3;
                    index <<= 2; index |= d[xNext][yNext] & 3;

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
        refresh: function(x, y, x_size, y_size) {
            cells.draw(x, y, x_size, y_size);
        },
        isStarted: function() {
            return !!intervalID;
        },
        start: function() {
            if (intervalID) {
                return false;
            }

            cells.mode = '';
            intervalID = setInterval(function() {
var timeStart = new Date();
                newGeneration(1);
console.log('next generation got:', new Date() - timeStart);
                cells.drawGrouped();
console.log(new Date() - timeStart);
            }, delay);

            /*var drawIntervalID = setInterval(function() {
                cells.drawGrouped();
                if (!intervalID) {
                    clearInterval(drawIntervalID);
                }
            }, 100);
            requestAnimationFrame(function drawCellField() {
                cells.drawGrouped();
                if (intervalID) {
                    requestAnimationFrame(drawCellField);
                }
            });*/

            return true;
        },
        stop: function() {
            if (!intervalID) {
                return false;
            }

            cells.mode = 'edit';
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

    var ca = window.ca = CellularAutomaton(X_SIZE, Y_SIZE, cellsCanvas);

    /*ca.cells.fill(function() {
        return random(2);
    });*/

    document.getElementById('start').onclick = function() {
        if (ca.isStarted()) {
            ca.stop();
            this.innerHTML = 'Start';
        } else {
            ca.start();
            this.innerHTML = 'Stop';
        }
    };
};
