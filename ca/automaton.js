var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var neighborhoodSize = null;

    var newGenerationCode = {
        tableProc: '(function(table, calcNewState) {\
for (var i = 0; i < table.length; i++) {\
    var shift = 0;\
    var n = {};\
    n.center = i & 3;\
    {{.}}\
    table[i] = calcNewState(n) & 3;\
}\
    })',
        indexProc: '(function(d, newD) {\
var xSize = d.length,\
    ySize = d[0].length,\
    t = time & 1;\
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
    })'
    };

    var neighborhood = {
        main: {
            Neumann: {
                neighbors: [
                    { name: 'north', size: 2, code: 'd[x][yPrev]' },
                    { name: 'south', size: 2, code: 'd[x][yNext]' },
                    { name:  'west', size: 2, code: 'd[xPrev][y]' },
                    { name:  'east', size: 2, code: 'd[xNext][y]' }
                ]
            },
            'Moore-thick': {
                neighbors: [
                    { name:  'north', size: 2, code: 'd[x][yPrev]' },
                    { name:  'south', size: 2, code: 'd[x][yNext]' },
                    { name:   'west', size: 2, code: 'd[xPrev][y]' },
                    { name:   'east', size: 2, code: 'd[xNext][y]' },
                    { name: 'n_west', size: 2, code: 'd[xPrev][yPrev]' },
                    { name: 's_west', size: 2, code: 'd[xPrev][yNext]' },
                    { name: 'n_east', size: 2, code: 'd[xNext][yPrev]' },
                    { name: 's_east', size: 2, code: 'd[xNext][yNext]' }
                ]
            },
            'Moore-thin': {
                neighbors: [
                    { name:  'north', size: 1, code: 'd[x][yPrev]' },
                    { name:  'south', size: 1, code: 'd[x][yNext]' },
                    { name:   'west', size: 1, code: 'd[xPrev][y]' },
                    { name:   'east', size: 1, code: 'd[xNext][y]' },
                    { name: 'n_west', size: 1, code: 'd[xPrev][yPrev]' },
                    { name: 's_west', size: 1, code: 'd[xPrev][yNext]' },
                    { name: 'n_east', size: 1, code: 'd[xNext][yPrev]' },
                    { name: 's_east', size: 1, code: 'd[xNext][yNext]' }
                ]
            },
            Margolus: {
                code: '\
var h = x & 1,\
    v = y & 1,\
    p = h ^ v;',
                neighbors: [
                    { name:  'cw', size: 2, code: 't ? d[p ? x : (h ? xNext : xPrev)][p ? (v ? yNext : yPrev) : y] : d[p ? x : (h ? xPrev : xNext)][p ? (v ? yPrev : yNext) : y]' },
                    { name: 'ccw', size: 2, code: 't ? d[p ? (h ? xNext : xPrev) : x][p ? y : (v ? yNext : yPrev)] : d[p ? (h ? xPrev : xNext) : x][p ? y : (v ? yPrev : yNext)]' },
                    { name: 'opp', size: 2, code: 't ? d[h ? xNext : xPrev][v ? yNext : yPrev] : d[h ? xPrev : xNext][v ? yPrev : yNext]' }
                ]
            }
        },
        extra: {
            phase: {
                neighbors: [
                    { name: 'phase', size: 2, code: 'time' }
                ]
            },
            hv: {
                neighbors: [
                    { name: 'horz', size: 1, code: 'x' },
                    { name: 'vert', size: 1, code: 'y' }
                ]
            }
        }
    };

    var newStateTableInner = function() {},
        newGenerationInner = function() {};

    var cells = CellField(xSize, ySize),
        newCells = cells.clone(),
        previousConfiguration = null,
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

        var table = new Array(Math.pow(2, neighborhoodSize));

        newStateTableInner(table, main);

        return table;
    }

    function setNeighborhoods(o) {
        o = o instanceof Object ? o : {};
        o.main = neighborhood.main.hasOwnProperty(o.main) ? o.main : 'Moore-thin';
        o.extra = (o.extra instanceof Array ? o.extra : []).filter(function(n) {
            return neighborhood.extra.hasOwnProperty(n);
        });

        var main = neighborhood.main[o.main];

        var tableProcCode = '',
            indexProcCode = main.code || '';

        neighborhoodSize = Array.prototype.concat.apply(main.neighbors, o.extra.map(function(n) {
            return neighborhood.extra[n].neighbors;
        })).reduce(function(prev, curr) {
            var mask = Math.pow(2, curr.size) - 1;

            tableProcCode += 'n.' + curr.name + ' = (i & (' + mask + ' << ' + prev + ')) >> ' + prev + ';';
            indexProcCode += 'index |= ((' + curr.code + ') & ' + mask + ') << ' + prev + ';';

            return prev + curr.size;
        }, 2/* { name: 'center', size: 2, code: 'd[x][y]' } */);

        newStateTableInner = eval(newGenerationCode.tableProc.replace('{{.}}', tableProcCode));
        newGenerationInner = eval(newGenerationCode.indexProc.replace('{{.}}', indexProcCode));
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

    function saveConfiguration() {
        previousConfiguration = {
            cells: cells.clone(),
            time: time
        };
    }

    function restoreConfiguration() {
        cells.copy(previousConfiguration.cells);
        time = previousConfiguration.time;
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
                saveConfiguration();
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
                saveConfiguration();
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
            if (previousConfiguration) {
                this.stop();
                restoreConfiguration();
                cellsView.render();
            }
        }
    };
};
