var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var newGenerationCode = {
        tableProc: '\
(function(table, calcNewState) {\
    for (var i = 0; i < table.length; i++) {\
        var n = {};\
        {{.}}\
        table[i] = calcNewState(n) & 3;\
    }\
})',
        indexProc: '\
(function(table, d, newD) {\
    var xSize = d.length,\
        ySize = d[0].length,\
        t = time & 1;\
\
    for (var x = 0; x < xSize; x++) {\
        var newDX = newD[x],\
            xPrev = x === 0 ? xSize - 1 : x - 1,\
            xNext = x === xSize - 1 ? 0 : x + 1,\
            dXCurr = d[x],\
            dXPrev = d[xPrev],\
            dXNext = d[xNext];\
\
        for (var y = 0; y < ySize; y++) {\
            var yPrev = y === 0 ? ySize - 1 : y - 1,\
                yNext = y === ySize - 1 ? 0 : y + 1,\
                index = 0;\
            {{.}}\
            newDX[y] = table[index] & 3;\
        }\
    }\
})'
    };

    var neighborhood = {
        base: {
            neighbors: [
                { name: 'center', size: 2, code: 'dXCurr[y]' }
            ]
        },
        main: {
            Neumann: {
                neighbors: [
                    { name: 'north', size: 2, code: 'dXCurr[yPrev]' },
                    { name: 'south', size: 2, code: 'dXCurr[yNext]' },
                    { name:  'west', size: 2, code: 'dXPrev[y]' },
                    { name:  'east', size: 2, code: 'dXNext[y]' }
                ]
            },
            'Moore-thick': {
                neighbors: [
                    { name:  'north', size: 2, code: 'dXCurr[yPrev]' },
                    { name:  'south', size: 2, code: 'dXCurr[yNext]' },
                    { name:   'west', size: 2, code: 'dXPrev[y]' },
                    { name:   'east', size: 2, code: 'dXNext[y]' },
                    { name: 'n_west', size: 2, code: 'dXPrev[yPrev]' },
                    { name: 's_west', size: 2, code: 'dXPrev[yNext]' },
                    { name: 'n_east', size: 2, code: 'dXNext[yPrev]' },
                    { name: 's_east', size: 2, code: 'dXNext[yNext]' }
                ]
            },
            'Moore-thin': {
                neighbors: [
                    { name:  'north', size: 1, code: 'dXCurr[yPrev]' },
                    { name:  'south', size: 1, code: 'dXCurr[yNext]' },
                    { name:   'west', size: 1, code: 'dXPrev[y]' },
                    { name:   'east', size: 1, code: 'dXNext[y]' },
                    { name: 'n_west', size: 1, code: 'dXPrev[yPrev]' },
                    { name: 's_west', size: 1, code: 'dXPrev[yNext]' },
                    { name: 'n_east', size: 1, code: 'dXNext[yPrev]' },
                    { name: 's_east', size: 1, code: 'dXNext[yNext]' }
                ]
            },
            Margolus: {
                code: '\
var h = x & 1,\
    v = y & 1,\
    p = h ^ v;',
                neighbors: [
                    { name:  'cw', size: 2, code: 't ? d[p ? (h ? xNext : xPrev) : x][p ? y : (v ? yNext : yPrev)] : d[p ? (h ? xPrev : xNext) : x][p ? y : (v ? yPrev : yNext)]' },
                    { name: 'ccw', size: 2, code: 't ? d[p ? x : (h ? xNext : xPrev)][p ? (v ? yNext : yPrev) : y] : d[p ? x : (h ? xPrev : xNext)][p ? (v ? yPrev : yNext) : y]' },
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

    var neighborhoodData = null,
        neighborhoodSize = null,
        fillNewGenerationTable = null,
        calculateNewGeneration = null,
        beforeNewGeneration = null;

    var cells = CellField(xSize, ySize),
        newCells = cells.clone(),
        rule = 'function main(n) { return n.center; }',
        newGenerationTable = getNewGenerationTable(rule),
        time = 0;

    var view = CellFieldView(cells, viewOptions);

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
                view.render();
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

    var history = {
        data: null,
        save: function() {
            this.data = {
                cells: cells.clone(),
                time: time
            };
        },
        back: function() {
            if (this.data) {
                cells.copy(this.data.cells);
                time = this.data.time;
                view.render();
                this.data = null;
            }
        }
    };


    function getNewGenerationTable(code) {
        time = 0;
        beforeNewGeneration = null;
        setNeighborhoods();

        eval(code);

        makeFunctions();

        var table = new Array(Math.pow(2, neighborhoodSize));

        fillNewGenerationTable(table, main);

        return table;
    }

    function makeFunctions() {
        var tableProcCode = '',
            indexProcCode = neighborhoodData.map(function(n) {
                return n.code || '';
            }).join('');

        neighborhoodSize = Array.prototype.concat.apply([], neighborhoodData.map(function(n) {
            return n.neighbors;
        })).reduce(function(prev, curr) {
            var mask = Math.pow(2, curr.size) - 1;

            tableProcCode += 'n.' + curr.name + ' = (i & (' + mask + ' << ' + prev + ')) >> ' + prev + ';';
            indexProcCode += 'index |= ((' + curr.code + ') & ' + mask + ') << ' + prev + ';';

            return prev + curr.size;
        }, 0);

        fillNewGenerationTable = eval(newGenerationCode.tableProc.replace('{{.}}', tableProcCode));
        calculateNewGeneration = eval(newGenerationCode.indexProc.replace('{{.}}', indexProcCode));
    }

    function setNeighborhoods(o) {
        o = o instanceof Object ? o : {};

        neighborhoodData = [
            neighborhood.base,
            neighborhood.main[neighborhood.main.hasOwnProperty(o.main) ? o.main : 'Moore-thin']
        ].concat((o.extra instanceof Array ? o.extra : []).filter(function(n) {
            return neighborhood.extra.hasOwnProperty(n);
        }).map(function(n) {
            return neighborhood.extra[n];
        }));
    }


    function newGeneration(n) {
        if (isNaN(n) || n < 1) {
            n = 1;
        }

        for (var i = 0; i < n; i++) {
            if (beforeNewGeneration instanceof Function) {
                beforeNewGeneration();
            }

            calculateNewGeneration(newGenerationTable, cells.data, newCells.data);

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
    getNewGenerationTable = runTimeLog(getNewGenerationTable, 'new states table built');
    newGeneration = runTimeLog(newGeneration, 'new generation got'); // */


    return {
        cells: cells,
        view: view,
        resize: function(o) {
            o = o instanceof Object ? o : {};

            if (!isNaN(o.xSize) && !isNaN(o.ySize)) {
                if (cells.xSize !== o.xSize || cells.ySize !== o.ySize) {
                    cells.resize(o.xSize, o.ySize);
                    newCells.resize(o.xSize, o.ySize);
                }
            }

            view.resize(o.cellSide, o.cellBorder);
        },
        clear: function() {
            cells.clear();
            view.render();
        },
        newGeneration: function(n) {
            if (!this.isStarted()) {
                history.save();
                newGeneration(n);
                view.render();
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
            newGenerationTable = getNewGenerationTable(code);
            rule = code;
        },
        isStarted: function() {
            return !!timer.intervalID;
        },
        start: function() {
            var result = timer.start();
            if (result) {
                document.dispatchEvent(new CustomEvent('ca-start'));
                history.save();
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
            if (history.data) {
                this.stop();
                history.back();
            }
        }
    };
};
