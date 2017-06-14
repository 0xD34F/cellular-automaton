var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var neighborhoodSize = {};

    var newGenerationCode = {
        tableProc: '(function(table, calcNewState) {\
for (var i = 0; i < table.length; i++) {\
    var shift = 0;\
    var n = {};\
    n.center = (i & (3 << (neighborhoodSize.main + neighborhoodSize.extra))) >> (neighborhoodSize.main + neighborhoodSize.extra);\
    {{.}}\
    table[i] = calcNewState(n) & 3;\
}\
    })',
        indexProc: '(function(d, newD) {\
var xSize = d.length,\
    ySize = d[0].length;\
\
for (var x = 0; x < xSize; x++) {\
    for (var y = 0; y < ySize; y++) {\
        var xPrev = x === 0 ? xSize - 1 : x - 1,\
            xNext = x === xSize - 1 ? 0 : x + 1,\
            yPrev = y === 0 ? ySize - 1 : y - 1,\
            yNext = y === ySize - 1 ? 0 : y + 1,\
            index = d[x][y] & 3;\
\
        {{.}}\
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
n.horz = (i & (1 <<  shift))      >>  shift;\
n.vert = (i & (1 << (shift + 1))) >> (shift + 1);',
                indexCode: '\
index <<= 2; index |= (x & 1) | ((y & 1) << 1);'
            }
        }
    };

    var newStateTableInner = function() {},
        newGenerationInner = function() {};

    var cells = CellField(xSize, ySize),
        newCells = cells.clone(),
        initialCells = null,
        rule = 'function main(n) { return n.center; }',
        newStatesTable = getNewStatesTable(rule),
        time = 0;

    var cellsView = CellFieldView(cells, viewOptions);

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

            timer.intervalID = setInterval(function() {
                newGeneration(steps);
                cellsView.render();
            }, timer.delay);

            return true;
        },
        stop: function() {
            if (!timer.intervalID) {
                return false;
            }

            clearInterval(timer.intervalID);
            timer.intervalID = null;

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

        newStateTableInner = eval(newGenerationCode.tableProc.replace('{{.}}',
            newGenerationCode.main[o.main].tableCode +
            newStateTableProcCode
        ));
        newGenerationInner = eval(newGenerationCode.indexProc.replace('{{.}}',
            newGenerationCode.main[o.main].indexCode +
            newGenerationProcCode
        ));
    }

    function setColors(colors) {
        colors = colors instanceof Object ? colors : CellFieldView.prototype.colors;

        var oldColors = cellsView.colors,
            newColors = {};

        for (var i in oldColors) {
            var color = colors[i] || oldColors[i];
            if (color[0] !== '#') {
                color = '#' + color;
            }

            newColors[i] = color;
        }

        cellsView.colors = newColors;
        cellsView.render();
    }


    function newGeneration(n) {
        if (isNaN(n) || n < 1) {
            n = 1;
        }

        for (var i = 0; i < n; i++) {
            newGenerationInner(cells.data, newCells.data);

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

    CellFieldView.prototype.render = runTimeLog(CellFieldView.prototype.render, 'CellField render');
    CellFieldView.prototype.renderPartial = runTimeLog(CellFieldView.prototype.renderPartial, 'CellField renderPartial');
    getNewStatesTable = runTimeLog(getNewStatesTable, 'new states table built');
    newGeneration = runTimeLog(newGeneration, 'new generation got'); // */


    return {
        cells: cells,
        view: cellsView,
        resize: function(o) {
            o = o instanceof Object ? o : {};

            if (!isNaN(o.xSize) && !isNaN(o.ySize)) {
                if (cells.xSize !== o.xSize || cells.ySize !== o.ySize) {
                    cells.resize(o.xSize, o.ySize);
                    newCells.resize(o.xSize, o.ySize);
                }
            }

            cellsView.resize(o.cellSide, o.cellBorder);
        },
        newGeneration: function(n) {
            if (!this.isStarted()) {
                initialCells = cells.clone();
                newGeneration(n);
            }
        },
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
        start: function() {
            var result = timer.start();
            if (result) {
                document.dispatchEvent(new CustomEvent('ca-start'));
                initialCells = cells.clone();
            }

            return result;
        },
        stop: function() {
            var result = timer.stop();
            if (result) {
                document.dispatchEvent(new CustomEvent('ca-stop'));
            }

            return result;
        },
        back: function() {
            if (initialCells) {
                this.stop();
                cells.copy(initialCells);
                cellsView.render();
            }
        }
    };
};
