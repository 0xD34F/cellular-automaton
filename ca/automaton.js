var CellularAutomaton = function(xSize, ySize, viewOptions) {

    function _CA(shift, neighborhood) {
        this.shift = shift;
        this.customNeighborhood = neighborhood instanceof Object ? neighborhood : {};
    }
    _CA.prototype.setNeighborhoods = function(o) {
        o = o instanceof Object ? o : {};

        this.neighbors = Array.prototype.concat.apply([], [
            neighborhood.base,
            neighborhood.main[neighborhood.main.hasOwnProperty(o.main) ? o.main : 'Moore'],
            ...(Array.isArray(o.extra) ? o.extra : []).map(n => this.customNeighborhood[n] || neighborhood.extra[n]).filter(n => !!n)
        ]);
    };
    _CA.prototype.getNextStateCode = function() {
        var shift = this.shift,
            neighborsCode = [],
            nextStateCode = [];

        var neighborhoodSize = this.neighbors.reduce(function(prev, curr) {
            var mask = bitMask(curr.size);

            neighborsCode.push(codeTemplate.indexToNeighbor(curr.name, mask, prev));
            nextStateCode.push(codeTemplate.neighborToIndex(curr.code, mask, prev, shift));

            return prev + curr.size;
        }, 0);

        var tableProc = eval(codeTemplate.tableProc(neighborsCode));
        this.table = tableProc(this.nextState, neighborhoodSize);

        return codeTemplate.nextStateFromTable(nextStateCode, shift);
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
            Moore: [
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
                { name:  'cw', size: 2, code: 't ? (h ^ v ? (h ? dXNext : dXPrev) : dXCurr)[h ^ v ? y : (v ? yNext : yPrev)] : (h ^ v ? (h ? dXPrev : dXNext) : dXCurr)[h ^ v ? y : (v ? yPrev : yNext)]' },
                { name: 'ccw', size: 2, code: 't ? (h ^ v ? dXCurr : (h ? dXNext : dXPrev))[h ^ v ? (v ? yNext : yPrev) : y] : (h ^ v ? dXCurr : (h ? dXPrev : dXNext))[h ^ v ? (v ? yPrev : yNext) : y]' },
                { name: 'opp', size: 2, code: 't ? (h ? dXNext : dXPrev)[v ? yNext : yPrev] : (h ? dXPrev : dXNext)[v ? yPrev : yNext]' }
            ]
        },
        extra: {
            phase: [
                { name: 'phase', size: 2, code: 'time' }
            ],
            hv: [
                { name: 'horz', size: 1, code: 'x' },
                { name: 'vert', size: 1, code: 'y' }
            ],
            rand: [
                { name: 'rand', size: 4, code: 'Math.random() * 16' }
            ]
        }
    };
    neighborhood.main['Moore-thick'] = neighborhood.main.Moore.map(n => Object.assign({}, n, { size: 2 }));

    var codeTemplate = {

        indexToNeighbor: (name, mask, position, index) => `${name}: (i & ${mask << position}) >> ${position}`,

        neighborToIndex: (code, mask, position, shift) => `((((${code}) & ${mask << shift}) >> ${shift}) << ${position})`,

        nextStateFromTable: (neighbors, shift) => `(table_${shift}[${neighbors.join('|')}] << ${shift})`,

        nextStateCalculation: neighbors => `main({${neighbors.map(n => `${n.name + ':' + n.code}`).join(',')}}) & ${bitMask(cells.numBitPlanes)}`,

        tableProc: neighborsCode => `
(function(nextState, neighborhoodSize) {
    var table = new Array(Math.pow(2, neighborhoodSize));

    for (var i = 0; i < table.length; i++) {
        table[i] = nextState({
            ${neighborsCode.join(',')}
        }) & 3;
    }

    return table;
})`,

        newGeneration: nextStateCode => `
(function(d, newD) {
    var table_0 = CAA.table,
        table_2 = CAB.table,
        xSize = d.length,
        ySize = d[0].length,
        t = time & 1;

    for (var x = 0; x < xSize; x++) {
        var newDX = newD[x],
            xPrev = x === 0 ? xSize - 1 : x - 1,
            xNext = x === xSize - 1 ? 0 : x + 1,
            dXCurr = d[x],
            dXPrev = d[xPrev],
            dXNext = d[xNext],
            h = x & 1;

        for (var y = 0; y < ySize; y++) {
            var yPrev = y === 0 ? ySize - 1 : y - 1,
                yNext = y === ySize - 1 ? 0 : y + 1,
                v = y & 1;

            newDX[y] = ${nextStateCode};
        }
    }
})`
    };

    var CAA = new _CA(0, { _center: [ { name: '_center', size: 2, code: '(dXCurr[y] & 12) >> 2' } ] }),
        CAB = new _CA(2, { _center: [ { name: '_center', size: 2, code: '(dXCurr[y] &  3) << 2' } ] });

    var calculateNewGeneration = null,
        beforeNewGeneration = null;

    var cells = CellField(xSize, ySize),
        newCells = cells.clone(),
        rule = null,
        time = 0;

    var view = CellFieldView(cells, viewOptions);

    var timer = {
        intervalID: null,
        MIN_DELAY: 1,
        MAX_DELAY: 10000,
        _delay: 30,
        get delay() {
            return this._delay;
        },
        set delay(value) {
            this._delay = limitation(value, this.MIN_DELAY, this.MAX_DELAY);
            if (this.intervalID) {
                this.stop();
                this.start();
            }
        },
        MIN_STEPS: 1,
        MAX_STEPS: 100,
        _steps: 1,
        get steps() {
            return this._steps;
        },
        set steps(value) {
            this._steps = limitation(value, this.MIN_STEPS, this.MAX_STEPS);
        },
        start: function() {
            if (this.intervalID) {
                return false;
            }

            this.intervalID = setInterval(() => {
                newGeneration(this.steps);
                view.render();
            }, this.delay);

            return true;
        },
        stop: function() {
            if (!this.intervalID) {
                return false;
            }

            clearInterval(this.intervalID);
            this.intervalID = null;

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
        // сброс настроек
        time = 0;
        calculateNewGeneration = null;
        beforeNewGeneration = null;
        setNeighborhoods();
        makeTable();

        eval(code);

        if (typeof main === 'function') {
            calculateNewGeneration = eval(codeTemplate.newGeneration(codeTemplate.nextStateCalculation(CAA.neighbors)));
        } else {
            calculateNewGeneration = eval(codeTemplate.newGeneration([ CAA, CAB ].filter(function(n) {
                return n.nextState instanceof Function;
            }).map(function(n) {
                return n.getNextStateCode();
            }).join(' | ')));
        }

        rule = code;
    }

    function setNeighborhoods(a, b) {
        CAA.setNeighborhoods(a);
        CAB.setNeighborhoods(b);
    }

    function makeTable(a, b) {
        CAA.nextState = a;
        CAB.nextState = b;
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
            [ newCells.data, cells.data ] = [ cells.data, newCells.data ];

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

    setRule('makeTable(function(n) { return n.center; });');

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
            cells.fill(() => 0);
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
            return timer.steps;
        },
        set stepsPerStroke(value) {
            timer.steps = value;
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
