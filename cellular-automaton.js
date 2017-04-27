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
    var o = Object.create(CellField.prototype);

    o.xSize = x;
    o.ySize = y;
    o.mode = 'edit';
    o.view = viewOptions instanceof Object ? viewOptions : {};

    var t = o.data = new Array(x);
    for (var i = 0; i < x; i++) {
        t[i] = new Array(y);
    }

    o.fill(function() {
        return 0;
    });

    if (o.view.wrapper instanceof HTMLElement) {
        if (o.view.width) {
            o.view.wrapper.style.width = o.view.width + 'px';
        }
        if (o.view.height) {
            o.view.wrapper.style.height = o.view.height + 'px';
        }

        var canvas = document.createElement('canvas');
        o.view.wrapper.appendChild(canvas);
        o.view.canvas = canvas;
    }

    if (o.view.canvas) {
        var that = o;

        var lastCoord = [];
        o.view.canvas.onmouseup = function() {
            lastCoord = [];
        };
        o.view.canvas.onmousedown = o.view.canvas.onmousemove = function(e) {
            if (e.buttons !== 1 && e.buttons !== 2) {
                return;
            }

            var _b = that.view.border,
                _t = Math.round(_b / 2),
                x = Math.floor((e.offsetX - _t) / (that.view.cellSide + _b)),
                y = Math.floor((e.offsetY - _t) / (that.view.cellSide + _b));

            if (lastCoord[0] === x && lastCoord[1] === y) {
                return;
            }

            if (that.mode in that.userActions) {
                if (that.userActions[that.mode].call(that, e, x, y, lastCoord[0], lastCoord[1]) !== false) {
                    lastCoord = [ x, y ];
                }
            }
        };
        o.view.canvas.oncontextmenu = function() {
            return false;
        };
    }

    if (!isNaN(o.view.cellSide)) {
        o.resizeView(o.view.cellSide);
    }

    return o;
}
CellField.prototype.userActions = {
    edit: function(e, x, y, prevX, prevY) {
        if (x >= this.xSize || y >= this.ySize || x < 0 || y < 0) {
            return false;
        }

        if (this.brush instanceof CellField) {
            x = (x - Math.floor(this.brush.xSize / 2) + this.xSize) % this.xSize;
            y = (y - Math.floor(this.brush.ySize / 2) + this.ySize) % this.ySize;

            this.copy(this.brush, x, y, {
                skipZeros: true,
                setZeros: e.buttons === 2
            });
            this.draw(x, y, this.brush.xSize, this.brush.ySize);
        } else {
            if (e.buttons === 1) {
                this.data[x][y] = (this.data[x][y] + 1) & 3;
            } else if (e.buttons === 2) {
                this.data[x][y] = (this.data[x][y] - 1) & 3;
            }

            this.draw(x, y, 1, 1);
        }
    },
    shift: function(e, x, y, prevX, prevY) {
        this.shift(x - prevX, y - prevY);
        this.draw();
    }
};
CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.xSize; x++) {
        for (var y = 0; y < this.ySize; y++) {
            this.data[x][y] = f(x, y, this.data[x][y]);
        }
    }
};
CellField.prototype.shift = function(_x, _y) {
    _x = _x || 0;
    _y = _y || 0;

    shiftArray(this.data, _x);
    for (var i = 0; i < this.xSize; i++) {
        shiftArray(this.data[i], _y);
    }
};
CellField.prototype.copy = function(cells, _x, _y, options) {
    _x = _x || 0;
    _y = _y || 0;
    options = options instanceof Object ? options : {};

    for (var i = 0, x = _x; i < cells.xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var j = 0, y = _y; j < cells.ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

            var t = cells.data[i][j];
            if (!options.skipZeros || t !== 0) {
                this.data[x][y] = options.setZeros ? 0 : t;
            }
        }
    }
};
CellField.prototype.refresh = function() {
    var c = this.view.context;

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    this.draw();
};
CellField.prototype.draw = function(_x, _y, _xSize, _ySize) {
    _x = _x || 0;
    _y = _y || 0;
    _xSize = _xSize || this.xSize;
    _ySize = _ySize || this.ySize;

    var numStates = 4,
        border = this.view.border,
        side = this.view.cellSide,
        sideFull = side + border,
        c = this.view.context;

    var g = [];
    for (var i = 0; i < numStates; i++) {
        g.push([]);
    }

    var d = this.data;
    for (var i = 0, x = _x; i < _xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var j = 0, y = _y; j < _ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

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
CellField.prototype.resizeView = function(cellSide, border) {
    if (!this.view.canvas || isNaN(cellSide) || cellSide < 1) {
        return;
    }

    var c = this.view.context = this.view.canvas.getContext('2d');

    var s = this.view.cellSide = cellSide,
        b = this.view.border = (arguments.length === 1 ? this.view.border : border) || 0;

    this.view.canvas.width  = c.width  = this.xSize * (s + b) + b;
    this.view.canvas.height = c.height = this.ySize * (s + b) + b;

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    this.draw();
};
CellField.prototype.colors = {
    background: '#888888',
    0: '#000000',
    1: '#FFFFFF',
    2: '#444444',
    3: '#CCCCCC'
};

var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var cells = CellField(xSize, ySize, viewOptions),
        newCells = CellField(xSize, ySize),
        rule = 'function main() { return center; }',
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
function main() {\
    var s = (north === 1) + (south === 1) + (west === 1) + (east === 1) + (n_west === 1) + (s_west === 1) + (n_east === 1) + (s_east === 1);\
\
    return ({\
        0: 0,\
        1: 2,\
        2: 3,\
        3: s === 1 || s === 2 ? 1 : 3\
    })[center];\
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

    var timer = {
        intervalID: null,
        _delay: 30,
        get delay() {
            return timer._delay;
        },
        set delay(value) {
            timer._delay = value;
            if (timer.intervalID) {
                timer.stop();
                timer.start();
            }
        },
        start: function() {
            if (timer.intervalID) {
                return false;
            }

            cells.mode = '';
            timer.intervalID = setInterval(function() {
var timeStart = new Date();
                newGeneration(1);
console.log('next generation got:', new Date() - timeStart);
                cells.draw();
console.log(new Date() - timeStart);
            }, timer.delay);

            /*var drawIntervalID = setInterval(function() {
                cells.draw();
                if (!timer.intervalID) {
                    clearInterval(drawIntervalID);
                }
            }, 100);
            requestAnimationFrame(function drawCellField() {
                cells.draw();
                if (timer.intervalID) {
                    requestAnimationFrame(drawCellField);
                }
            });*/

            return true;
        },
        stop: function() {
            if (!timer.intervalID) {
                return false;
            }

            cells.mode = 'edit';
            clearInterval(timer.intervalID);
            timer.intervalID = null;

            return true;
        }
    };

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
            xSize = cells.xSize,
            ySize = cells.ySize;

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

            var t = newCells.data;
            newCells.data = cells.data;
            cells.data = t;
        }
    }

    return {
        cells: cells,
        newGeneration: newGeneration,
        get rule() {
            return rule;
        },
        set rule(code) {
            newStatesTable = getNewStatesTable(code);
            rule = code;
        },
        get delay() {
            return timer.delay;
        },
        set delay(value) {
            timer.delay = value;
        },
        get gps() {
            return Math.round(1000 / timer.delay);
        },
        set gps(value) {
            timer.delay = Math.round(1000 / value);
        },
        isStarted: function() {
            return !!timer.intervalID;
        },
        start: timer.start,
        stop: timer.stop
    };
};
