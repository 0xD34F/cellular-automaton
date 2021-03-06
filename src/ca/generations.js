﻿import { bitMask, logExecutionTime } from 'utils';
import Rules from './rules';
import neighborhood from './neighborhood';

const codeTemplate = {

  indexToNeighbor: (name, mask, position) => `${name}: (i & ${mask << position}) >> ${position}`,

  neighborToIndex: (code, mask, position, shift) => `((((${code}) & ${mask << shift}) >> ${shift}) << ${position})`,

  nextStateFromTable: (neighbors, shift) => `(table_${shift}[${neighbors.join('|')}] << ${shift})`,

  nextStateCalculation: (neighbors, numBitPlanes) => `main({${neighbors.map(n => `${n.name}:${n.code}`).join(',')}}) & ${bitMask(numBitPlanes)}`,

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
(function(cells, newCellsData) {
  var
    table_0 = this.CAA.table,
    table_2 = this.CAB.table,
    { xSize, ySize } = cells,
    d = cells.data,
    fixX = cells._shift.x,
    fixY = cells._shift.y,
    time = this.time,
    t = time & 1;

  for (var x = 0; x < xSize; x++) {
    var
      newDX = newCellsData[x],
      xPrev = x === 0 ? xSize - 1 : x - 1,
      xNext = x === xSize - 1 ? 0 : x + 1,
      dXCurr = d[x],
      dXPrev = d[xPrev],
      dXNext = d[xNext],
      h = (x ^ fixX) & 1;

    for (var y = 0; y < ySize; y++) {
      var
        yPrev = y === 0 ? ySize - 1 : y - 1,
        yNext = y === ySize - 1 ? 0 : y + 1,
        v = (y ^ fixY) & 1;

      newDX[y] = ${nextStateCode};
    }
  }
})`
};

class Compiler {

  constructor(shift, neighborhood) {
    this.shift = shift;
    this.customNeighborhood = neighborhood instanceof Object ? neighborhood : {};
  }

  setNeighborhoods(neighborhoods) {
    // основная окрестность может быть одна и только одна
    let main = neighborhood.main['Moore'];
    // дополнительных окрестностей можно подключить сколько угодно
    const extra = [];

    [].concat(neighborhoods).forEach(n => {
      if (neighborhood.main[n]) {
        // действительным является последнее назначение основной окрестности
        main = neighborhood.main[n];
      } else if (extra.every(m => m !== n && m.name !== n.name)) {
        // одну и ту же дополнительную окрестность нельзя подключить более одного раза
        extra.push(n);
      }
    });

    this.neighbors = Array.prototype.concat.apply([], [
      neighborhood.base,
      main,
      ...extra.map(n => {
        const
          name = n instanceof Object ? n.name : n,
          val = this.customNeighborhood[name] || neighborhood.extra[name];

        return val instanceof Function ? val(n.data) : val;
      }).filter(n => !!n)
    ]);
  }

  getNextStateCode() {
    const
      shift = this.shift,
      neighborsCode = [],
      nextStateCode = [];

    const neighborhoodSize = this.neighbors.reduce((size, neighbor) => {
      const mask = bitMask(neighbor.size);

      neighborsCode.push(codeTemplate.indexToNeighbor(neighbor.name, mask, size));
      nextStateCode.push(codeTemplate.neighborToIndex(neighbor.code, mask, size, shift));

      return size + neighbor.size;
    }, 0);

    const tableProc = eval(codeTemplate.tableProc(neighborsCode));
    this.table = tableProc(this.nextState, neighborhoodSize);

    return codeTemplate.nextStateFromTable(nextStateCode, shift);
  }
}

const defaultOptions = () => ({
  on: {},
  calculateNewGeneration: null,
  main: null,
  time: 0
});

export default class Generations {
  constructor(options) {
    Object.assign(this, options);

    this.setNeighborhoods = this.setNeighborhoods.bind(this);
    this.makeTable = this.makeTable.bind(this);

    this.CAA = new Compiler(0, { _center: [ { name: '_center', size: 2, code: '(dXCurr[y] & 12) >> 2' } ] });
    this.CAB = new Compiler(2, { _center: [ { name: '_center', size: 2, code: '(dXCurr[y] &  3) << 2' } ] });

    this.rules = Rules;
    this.utils = options.api;
  }

  get rule() {
    return this._rule;
  }
  set rule(code) {
    Object.assign(this, defaultOptions());
    this.setNeighborhoods();

    let { rules, utils, setNeighborhoods, makeTable, on, main } = this;

    eval(code);

    const nextStateCode = typeof main === 'function'
      ? codeTemplate.nextStateCalculation(this.CAA.neighbors, this.cells.curr.numBitPlanes)
      : [ this.CAA, this.CAB ].filter(n => n.nextState instanceof Function).map(n => n.getNextStateCode()).join('|');

    this.calculateNewGeneration = eval(codeTemplate.nextGeneration(nextStateCode));

    this._rule = code;
  }

  setNeighborhoods(a, b) {
    this.CAA.setNeighborhoods(a);
    this.CAB.setNeighborhoods(b);
  }

  makeTable(a, b) {
    this.CAA.nextState = a;
    this.CAB.nextState = b;
  }

  @logExecutionTime('new generation')
  next(count) {
    if (isNaN(count) || count < 1) {
      count = 1;
    }

    const { curr, next } = this.cells;

    for (let i = 0; i < count; i++) {
      if (this.on.beforeNewGeneration instanceof Function) {
        this.on.beforeNewGeneration.call(this);
      }

      this.calculateNewGeneration(curr, next.data);
      [ next.data, curr.data ] = [ curr.data, next.data ];

      this.time++;

      if (this.on.afterNewGeneration instanceof Function) {
        this.on.afterNewGeneration.call(this);
      }
    }
  }

}
