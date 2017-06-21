﻿var CellularAutomaton = function(xSize, ySize, viewOptions) {
    var newGenerationCode = {
        tableProc: '\
(function(neighborhoodSize, calculateNewState) {\
    var table = new Array(Math.pow(2, neighborhoodSize));\
\
    for (var i = 0; i < table.length; i++) {\
        var n = {};\
        {{.}}\
        table[i] = calculateNewState(n) & 3;\
    }\
\
    return table;\
})',
        indexProc: '\
(function(d, newD) {\
    var table = newGenerationTable,\
        xSize = d.length,\
        ySize = d[0].length,\
        t = time & 1;\
\
    for (var x = 0; x < xSize; x++) {\
        var newDX = newD[x],\
            xPrev = x === 0 ? xSize - 1 : x - 1,\
            xNext = x === xSize - 1 ? 0 : x + 1,\
            dXCurr = d[x],\
            dXPrev = d[xPrev],\
            dXNext = d[xNext],\
            h = x & 1;\
\
        for (var y = 0; y < ySize; y++) {\
            var yPrev = y === 0 ? ySize - 1 : y - 1,\
                yNext = y === ySize - 1 ? 0 : y + 1,\
                v = y & 1;\
\
            newDX[y] = table[{{.}}] & 3;\
        }\
    }\
})'
    };

    var neighborhood = {
        base: [
            { name: 'center', size: 2, code: 'dXCurr[y]' }
        ],
        main: {
            Neumann: [
                { name: 'north', size: 2, code: 'dXCurr[yPrev]' },
                { name: 'south', size: 2, code: 'dXCurr[yNext]' },
                { name:  'west', size: 2, code: 'dXPrev[y]' },
                { name:  'east', size: 2, code: 'dXNext[y]' }
            ],
            'Moore-thick': [
                { name:  'north', size: 2, code: 'dXCurr[yPrev]' },
                { name:  'south', size: 2, code: 'dXCurr[yNext]' },
                { name:   'west', size: 2, code: 'dXPrev[y]' },
                { name:   'east', size: 2, code: 'dXNext[y]' },
                { name: 'n_west', size: 2, code: 'dXPrev[yPrev]' },
                { name: 's_west', size: 2, code: 'dXPrev[yNext]' },
                { name: 'n_east', size: 2, code: 'dXNext[yPrev]' },
                { name: 's_east', size: 2, code: 'dXNext[yNext]' }
            ],
            'Moore-thin': [
                { name:  'north', size: 1, code: 'dXCurr[yPrev]' },
                { name:  'south', size: 1, code: 'dXCurr[yNext]' },
                { name:   'west', size: 1, code: 'dXPrev[y]' },
                { name:   'east', size: 1, code: 'dXNext[y]' },
                { name: 'n_west', size: 1, code: 'dXPrev[yPrev]' },
                { name: 's_west', size: 1, code: 'dXPrev[yNext]' },
                { name: 'n_east', size: 1, code: 'dXNext[yPrev]' },
                { name: 's_east', size: 1, code: 'dXNext[yNext]' }
            ],
            Margolus: [
                { name:  'cw', size: 2, code: 't ? d[h ^ v ? (h ? xNext : xPrev) : x][h ^ v ? y : (v ? yNext : yPrev)] : d[h ^ v ? (h ? xPrev : xNext) : x][h ^ v ? y : (v ? yPrev : yNext)]' },
                { name: 'ccw', size: 2, code: 't ? d[h ^ v ? x : (h ? xNext : xPrev)][h ^ v ? (v ? yNext : yPrev) : y] : d[h ^ v ? x : (h ? xPrev : xNext)][h ^ v ? (v ? yPrev : yNext) : y]' },
                { name: 'opp', size: 2, code: 't ? d[h ? xNext : xPrev][v ? yNext : yPrev] : d[h ? xPrev : xNext][v ? yPrev : yNext]' }
            ]
        },
        extra: {
            phase: [
                { name: 'phase', size: 2, code: 'time' }
            ],
            hv: [
                { name: 'horz', size: 1, code: 'x' },
                { name: 'vert', size: 1, code: 'y' }
            ]
        }
    };

    var neighborhoodData = null,
        neighborhoodSize = null,
        fillNewGenerationTable = null,
        calculateNewGeneration = null,
        beforeNewGeneration = null;

    var cells = CellField(xSize, ySize),
        newCells = cells.clone(),
        newGenerationTable = null,
        rule = null,
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


    function setRule(code) {
        time = 0;
        beforeNewGeneration = null;
        setNeighborhoods();

        eval(code);

        makeFunctions();

        newGenerationTable = fillNewGenerationTable(neighborhoodSize, main);
        rule = code;
    }

    function makeFunctions() {
        var tableProcCode = '',
            indexProcCode = [];

        neighborhoodSize = Array.prototype.concat.apply([], neighborhoodData).reduce(function(prev, curr) {
            var mask = Math.pow(2, curr.size) - 1;

            tableProcCode += 'n.' + curr.name + ' = (i & (' + mask + ' << ' + prev + ')) >> ' + prev + ';';
            indexProcCode.push('(((' + curr.code + ') & ' + mask + ') << ' + prev + ')');

            return prev + curr.size;
        }, 0);

        fillNewGenerationTable = eval(newGenerationCode.tableProc.replace('{{.}}', tableProcCode));
        calculateNewGeneration = eval(newGenerationCode.indexProc.replace('{{.}}', indexProcCode.join(' | ')));
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

            calculateNewGeneration(cells.data, newCells.data);

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
    setRule = runTimeLog(setRule, 'rule set');
    newGeneration = runTimeLog(newGeneration, 'new generation got'); // */

    setRule('function main(n) { return n.center; }');

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
            setRule(code);
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
