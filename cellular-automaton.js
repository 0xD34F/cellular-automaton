(function() {
    if (typeof window.CustomEvent === 'function') {
        return;
    }

    function CustomEvent (event, params) {
        params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
        };

        var e = document.createEvent('CustomEvent');
        e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return e;
    }
    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();

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

    o.resize(x, y);

    o._mode = 'edit';
    o.view = viewOptions instanceof Object ? viewOptions : {};

    if (o.view.wrapper instanceof HTMLElement) {
        o.view.cellSide = o.view.cellSide << 0;
        o.view.border = o.view.border << 0;

        if (!o.view.width) {
            o.view.width = x * (o.view.cellSide + o.view.border) + o.view.border;
        }
        if (!o.view.height) {
            o.view.height = y * (o.view.cellSide + o.view.border) + o.view.border;
        }

        o.view.wrapper.style.width = o.view.width + 'px';
        o.view.wrapper.style.height = o.view.height + 'px';

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
            }).draw(x, y, this.brush.xSize, this.brush.ySize);
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
        this.shift(x - prevX, y - prevY).draw();
    }
};
CellField.prototype.dispatchEvent = function(eventName, data) {
    data = data instanceof Object ? data : {};
    data.cellField = this;

    document.dispatchEvent(new CustomEvent(eventName, {
        detail: data
    }));

    return this;
};
Object.defineProperty(CellField.prototype, 'mode', {
    get: function() {
        return this._mode;
    },
    set: function(value) {
        this._mode = value;

        this.dispatchEvent('ca-mode', {
            mode: value
        });
    }
});
CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.xSize; x++) {
        for (var y = 0; y < this.ySize; y++) {
            this.data[x][y] = f(x, y, this.data[x][y]);
        }
    }

    return this;
};
CellField.prototype.shift = function(_x, _y) {
    _x = _x || 0;
    _y = _y || 0;

    shiftArray(this.data, _x);
    for (var i = 0; i < this.xSize; i++) {
        shiftArray(this.data[i], _y);
    }

    return this;
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

    return this;
};
// o - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости> }
CellField.prototype.copyBitPlane = function(o) {
    return this.fill(function(x, y, val) {
        var newVal = val;

        for (var i in o) {
            newVal = (newVal & ~(1 << i)) | (((val & (1 << o[i])) >> o[i]) << i);
        }

        return newVal;
    });
};
// o - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
CellField.prototype.fillRandom = function(o) {
    return this.fill(function(x, y, value) {
        for (var i in o) {
            var mask = (1 << i);

            if (random(1000) < o[i]) {
                value |= mask;
            } else {
                value &= ~mask;
            }
        }

        return value;
    });
};
CellField.prototype.refresh = function() {
    var c = this.view.context;

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    return this.draw();
};
CellField.prototype.draw = function(_x, _y, _xSize, _ySize, prevStates) {
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

            var t = d[x][y];
            if (!(prevStates && prevStates[x][y] === t)) {
                g[t].push(x, y);
            }
        }
    }

    for (var state = 0; state < numStates; state++) {
        c.fillStyle = this.colors[state];

        for (var n = g[state], i = 0; i < n.length; i += 2) {
            c.fillRect(n[i] * sideFull + border, n[i + 1] * sideFull + border, side, side);
        }
    }

    return this;
};
CellField.prototype.resize = function(x, y) {
    this.xSize = x;
    this.ySize = y;

    this.data = new Array(x);
    for (var i = 0; i < x; i++) {
        this.data[i] = new Array(y);
    }

    return this.fill(function() {
        return 0;
    }).dispatchEvent('ca-resize');
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

    var parent = this.view.canvas.parentNode;
    if (c.width > parseInt(parent.style.width) || c.height > parseInt(parent.style.height)) {
        parent.classList.add('scrollable');
    } else {
        parent.classList.remove('scrollable');
        parent.scrollTop = 0;
    }

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    return this.draw().dispatchEvent('ca-resize-view');
};
CellField.prototype.colors = {
    background: '#888888',
    0: '#000000',
    1: '#FFFFFF',
    2: '#444444',
    3: '#CCCCCC'
};

var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var neighborhoodSize = {};

    var newGenerationCode = {
        tableProcBegin: '(function(table, main) {\
for (var i = 0; i < table.length; i++) {\
    var shift = 0;\
    var n = {};\
    n.center = (i & (3 << (neighborhoodSize.main + neighborhoodSize.extra))) >> (neighborhoodSize.main + neighborhoodSize.extra);',
        tableProcEnd: '\
    table[i] = main(n) & 3;\
}\
    })',
        indexProcBegin: '(function(d, newD, xSize, ySize) {\
for (var x = 0; x < xSize; x++) {\
    for (var y = 0; y < ySize; y++) {\
        var xPrev = x === 0 ? xSize - 1 : x - 1,\
            xNext = x === xSize - 1 ? 0 : x + 1,\
            yPrev = y === 0 ? ySize - 1 : y - 1,\
            yNext = y === ySize - 1 ? 0 : y + 1,\
            index = d[x][y] & 3;\
',
        indexProcEnd: '\
        newD[x][y] = newStatesTable[index];\
    }\
}\
    })',
        main: {
            Neumann: {
                size: 8,
                tableCode: '\
n.north = (i & (3 << (6 + neighborhoodSize.extra))) >> (6 + neighborhoodSize.extra);\
n.south = (i & (3 << (4 + neighborhoodSize.extra))) >> (4 + neighborhoodSize.extra);\
n.west  = (i & (3 << (2 + neighborhoodSize.extra))) >> (2 + neighborhoodSize.extra);\
n.east  = (i & (3 <<      neighborhoodSize.extra))  >>      neighborhoodSize.extra;',
                indexCode: '\
index <<= 2; index |= d[x][yPrev] & 3;\
index <<= 2; index |= d[x][yNext] & 3;\
index <<= 2; index |= d[xPrev][y] & 3;\
index <<= 2; index |= d[xNext][y] & 3;'
            },
            'Moore-thin': {
                size: 8,
                tableCode: '\
n.north  = (i & (1 << (7 + neighborhoodSize.extra))) >> (7 + neighborhoodSize.extra);\
n.south  = (i & (1 << (6 + neighborhoodSize.extra))) >> (6 + neighborhoodSize.extra);\
n.west   = (i & (1 << (5 + neighborhoodSize.extra))) >> (5 + neighborhoodSize.extra);\
n.east   = (i & (1 << (4 + neighborhoodSize.extra))) >> (4 + neighborhoodSize.extra);\
n.n_west = (i & (1 << (3 + neighborhoodSize.extra))) >> (3 + neighborhoodSize.extra);\
n.s_west = (i & (1 << (2 + neighborhoodSize.extra))) >> (2 + neighborhoodSize.extra);\
n.n_east = (i & (1 << (1 + neighborhoodSize.extra))) >> (1 + neighborhoodSize.extra);\
n.s_east = (i & (1 <<      neighborhoodSize.extra))  >>      neighborhoodSize.extra;',
                indexCode: '\
index <<= 1; index |= d[x][yPrev] & 1;\
index <<= 1; index |= d[x][yNext] & 1;\
index <<= 1; index |= d[xPrev][y] & 1;\
index <<= 1; index |= d[xNext][y] & 1;\
index <<= 1; index |= d[xPrev][yPrev] & 1;\
index <<= 1; index |= d[xPrev][yNext] & 1;\
index <<= 1; index |= d[xNext][yPrev] & 1;\
index <<= 1; index |= d[xNext][yNext] & 1;'
            },
            'Moore-thick': {
                size: 16,
                tableCode: '\
n.north  = (i & (3 << (14 + neighborhoodSize.extra))) >> (14 + neighborhoodSize.extra);\
n.south  = (i & (3 << (12 + neighborhoodSize.extra))) >> (12 + neighborhoodSize.extra);\
n.west   = (i & (3 << (10 + neighborhoodSize.extra))) >> (10 + neighborhoodSize.extra);\
n.east   = (i & (3 << ( 8 + neighborhoodSize.extra))) >> ( 8 + neighborhoodSize.extra);\
n.n_west = (i & (3 << ( 6 + neighborhoodSize.extra))) >> ( 6 + neighborhoodSize.extra);\
n.s_west = (i & (3 << ( 4 + neighborhoodSize.extra))) >> ( 4 + neighborhoodSize.extra);\
n.n_east = (i & (3 << ( 2 + neighborhoodSize.extra))) >> ( 2 + neighborhoodSize.extra);\
n.s_east = (i & (3 <<       neighborhoodSize.extra))  >>       neighborhoodSize.extra;',
                indexCode: '\
index <<= 2; index |= d[x][yPrev] & 3;\
index <<= 2; index |= d[x][yNext] & 3;\
index <<= 2; index |= d[xPrev][y] & 3;\
index <<= 2; index |= d[xNext][y] & 3;\
index <<= 2; index |= d[xPrev][yPrev] & 3;\
index <<= 2; index |= d[xPrev][yNext] & 3;\
index <<= 2; index |= d[xNext][yPrev] & 3;\
index <<= 2; index |= d[xNext][yNext] & 3;'
            }
        },
        extra: {
            phase: {
                size: 2,
                tableCode: '\
n.phase = (i & (3 << shift)) >> shift;',
                indexCode: '\
index <<= 2; index |= time & 3;'
            },
            hv: {
                size: 2,
                tableCode: '\
n.horz = (i & (1 <<  shift))      >>  shift,\
n.vert = (i & (1 << (shift + 1))) >> (shift + 1);',
                indexCode: '\
index <<= 2; index |= (x & 1) | ((y & 1) << 1);'
            }
        }
    };

    var newStateTableInner = function() {},
        newGenerationInner = function() {};

    var cells = CellField(xSize, ySize, viewOptions),
        newCells = CellField(xSize, ySize),
        rule = 'function main(n) { return n.center; }',
        newStatesTable = getNewStatesTable(rule),
        time = 0;

    var MIN_STEPS = 1,
        MAX_STEPS = 100,
        steps = MIN_STEPS;

    var timer = {
        intervalID: null,
        MIN_DELAY: 1,
        MAX_DELAY: 10000,
        _delay: 30,
        get delay() {
            return timer._delay;
        },
        set delay(value) {
            timer._delay = limitation(value, this.MIN_DELAY, this.MAX_DELAY);
            if (timer.intervalID) {
                timer.stop();
                timer.start();
            }
        },
        start: function() {
            if (timer.intervalID) {
                return false;
            }

            cells.mode = 'shift';
            timer.intervalID = setInterval(function() {
                newGeneration(steps);
                cells.draw(null, null, null, null, steps === 1 ? newCells.data : null);
            }, timer.delay);

            document.dispatchEvent(new CustomEvent('ca-start'));

            return true;
        },
        stop: function() {
            if (!timer.intervalID) {
                return false;
            }

            cells.mode = 'edit';
            clearInterval(timer.intervalID);
            timer.intervalID = null;

            document.dispatchEvent(new CustomEvent('ca-stop'));

            return true;
        }
    };


    function getNewStatesTable(code) {
        time = 0;

        setNeighborhoods({
            main: 'Moore-thin',
            extra: []
        });

        eval(code);

        var table = new Array(Math.pow(2, 2 + neighborhoodSize.main + neighborhoodSize.extra));

        newStateTableInner(table, main);

        return table;
    }

    function setNeighborhoods(o) {
        o = o instanceof Object ? o : {};
        o.main = newGenerationCode.main.hasOwnProperty(o.main) ? o.main : 'Moore-thin';
        o.extra = (o.extra instanceof Array ? o.extra : []).filter(function(n) {
            return newGenerationCode.extra.hasOwnProperty(n);
        });

        neighborhoodSize = {
            main: newGenerationCode.main[o.main].size,
            extra: 0
        };

        var newStateTableProcCode = '',
            newGenerationProcCode = '';

        for (var i = 0; i < o.extra.length; i++) {
            var t = newGenerationCode.extra[o.extra[i]];

            newStateTableProcCode += t.tableCode + 'shift += ' + t.size + ';';

            newGenerationProcCode = t.indexCode + newGenerationProcCode;
            neighborhoodSize.extra += t.size;
        }

        newStateTableInner = eval(
            newGenerationCode.tableProcBegin +
            newGenerationCode.main[o.main].tableCode +
            newStateTableProcCode +
            newGenerationCode.tableProcEnd
        );
        newGenerationInner = eval(
            newGenerationCode.indexProcBegin +
            newGenerationCode.main[o.main].indexCode +
            newGenerationProcCode +
            newGenerationCode.indexProcEnd
        );
    }


    function newGeneration(n) {
        if (isNaN(n) || n < 1) {
            n = 1;
        }

        var xSize = cells.xSize,
            ySize = cells.ySize;

        for (var i = 0; i < n; i++) {
            var d = cells.data,
                newD = newCells.data;

            newGenerationInner(d, newD, xSize, ySize);

            var t = newCells.data;
            newCells.data = cells.data;
            cells.data = t;

            time++;
        }
    }


    function runTimeLog(f, message) {
        return function() {
            var startTime = new Date();

            var result = f.apply(this, arguments);

            console.log(message, arguments, 'time: ' + (new Date() - startTime));

            return result;
        };
    }

    CellField.prototype.draw = runTimeLog(CellField.prototype.draw, 'CellField display');
    getNewStatesTable = runTimeLog(getNewStatesTable, 'new states table built');
    newGeneration = runTimeLog(newGeneration, 'new generation got'); // */


    return {
        cells: cells,
        newGeneration: newGeneration,
        get stepsPerStroke() {
            return steps;
        },
        set stepsPerStroke(value) {
            steps = limitation(value, MIN_STEPS, MAX_STEPS);
        },
        get strokeDuration() {
            return timer.delay;
        },
        set strokeDuration(value) {
            timer.delay = value;
        },
        get rule() {
            return rule;
        },
        set rule(code) {
            newStatesTable = getNewStatesTable(code);
            rule = code;
        },
        isStarted: function() {
            return !!timer.intervalID;
        },
        start: timer.start,
        stop: timer.stop
    };
};
