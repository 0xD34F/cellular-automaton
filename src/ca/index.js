﻿import { bitMask } from '../utils';
import Rules from './rules';
import Steps from './steps';
import neighborhood from './neighborhood';
import CellField from './cell-field';
import CellFieldView from './cell-field-view';

var rules = Rules;

var CellularAutomaton = function(options) {

    function _CA(shift, neighborhood) {
        this.shift = shift;
        this.customNeighborhood = neighborhood instanceof Object ? neighborhood : {};
    }
    _CA.prototype.setNeighborhoods = function(o) {
        o = o instanceof Object ? o : {};

        this.neighbors = Array.prototype.concat.apply([], [
            neighborhood.base,
            neighborhood.main[neighborhood.main.hasOwnProperty(o.main) ? o.main : 'Moore'],
            ...(Array.isArray(o.extra) ? o.extra : []).map(n => {
                var name = n instanceof Object ? n.name : n,
                    val = this.customNeighborhood[name] || neighborhood.extra[name];

                return val instanceof Function ? val(n.data) : val;
            }).filter(n => !!n)
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

    var codeTemplate = {

        indexToNeighbor: (name, mask, position, index) => `${name}: (i & ${mask << position}) >> ${position}`,

        neighborToIndex: (code, mask, position, shift) => `((((${code}) & ${mask << shift}) >> ${shift}) << ${position})`,

        nextStateFromTable: (neighbors, shift) => `(table_${shift}[${neighbors.join('|')}] << ${shift})`,

        nextStateCalculation: neighbors => `main({${neighbors.map(n => `${n.name}:${n.code}`).join(',')}}) & ${bitMask(cells.numBitPlanes)}`,

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

        nextGeneration: nextStateCode => `
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

    var main = null,
        calculateNewGeneration = null,
        beforeNewGeneration = null;

    var cells = new CellField(options.xSize, options.ySize),
        newCells = cells.clone(),
        rule = null,
        time = 0;

    var view = new CellFieldView(cells, options.view);

    var steps = new Steps({
        step: function() {
            newGeneration(this.generations);
            view.render();
        }
    });


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
        main = null;
        calculateNewGeneration = null;
        beforeNewGeneration = null;
        setNeighborhoods();
        makeTable();
        view.setColors(null, true);

        eval(code);

        var nextStateCode = typeof main === 'function'
            ? codeTemplate.nextStateCalculation(CAA.neighbors)
            : [ CAA, CAB ].filter(n => n.nextState instanceof Function).map(n => n.getNextStateCode()).join('|');

        calculateNewGeneration = eval(codeTemplate.nextGeneration(nextStateCode));

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
            console.time(message);

            var result = f.apply(this, arguments);

            console.timeEnd(message);

            return result;
        };
    }

    CellFieldView.prototype.render = runTimeLog(CellFieldView.prototype.render, 'CellField render');
    CellFieldView.prototype.renderPartial = runTimeLog(CellFieldView.prototype.renderPartial, 'CellField renderPartial');
    setRule = runTimeLog(setRule, 'rule set');
    newGeneration = runTimeLog(newGeneration, 'new generation'); // */

    setRule(options.ruleCode || rules.get(options.ruleName || 'default'));

    return {
        rules,
        cells,
        view,
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
        fill: function({ invert = [], random = {}, copy = {} } = {}) {
            cells
                .invertBitPlane(invert)
                .fillRandom(random)
                .copyBitPlane(copy);
            view.render();

        },
        clear: function() {
            cells.fill(() => 0);
            view.render();
        },
        newGeneration: function(n) {
            if (!steps.intervalID) {
                if (!history.data) {
                    history.save();
                }

                newGeneration(n);
                view.render();
            }
        },
        get generationsPerStep() {
            return steps.generations;
        },
        set generationsPerStep(value) {
            steps.generations = value;
        },
        get stepDuration() {
            return steps.duration;
        },
        set stepDuration(value) {
            steps.duration = value;
        },
        get rule() {
            return rule;
        },
        set rule(code) {
            setRule(code);
        },
        start: function() {
            var result = steps.start();
            if (result) {
                document.dispatchEvent(new CustomEvent('ca-start'));
                history.save();
            }

            return result;
        },
        stop: function() {
            var result = steps.stop();
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

export { CellField, CellFieldView, CellularAutomaton, Rules };
