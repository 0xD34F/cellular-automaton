import { rotateArray } from 'utils';


export default class CellField {

  constructor(x, y) {
    this.resize(x, y);
  }

  resize(x, y = x, shift = { x: 0, y: 0 }) {
    this._shift = { ...shift };
    this.data = [...Array(Math.max(1, x | 0))].map(() => Array(Math.max(1, y | 0)).fill(0));

    return this;
  }

  fill(f) {
    this.data = this.data.map((col, x) => col.map((cell, y) => f.call(this, cell, x, y)));

    return this;
  }

  shift(x, y) {
    x = x | 0;
    y = y | 0;

    rotateArray(this.data, x);
    this.data.forEach(col => rotateArray(col, y));

    this._shift.x = (this._shift.x + x) % this.xSize;
    this._shift.y = (this._shift.y + y) % this.ySize;

    return this;
  }

  rotateClockwise() {
    const { data, _shift, ySize } = this;

    Object.assign(_shift, { x: (ySize - _shift.y) % ySize, y: _shift.x });
    this.data = data[0].map((cell, y) => data.map((col, x) => data[x][ySize - y - 1]));

    return this;
  }

  rotateCounterclockwise() {
    const { data, _shift, xSize } = this;

    Object.assign(_shift, { x: _shift.y, y: (xSize - _shift.x) % xSize });
    this.data = data[0].map((cell, y) => data.map((col, x) => data[xSize - x - 1][y]));

    return this;
  }

  clone() {
    return new CellField().conform(this);
  }

  conform(f) {
    return this.resize(f.xSize, f.ySize, f._shift).copy(f);
  }

  copy(source, options) {
    options = { x: 0, y: 0, ...options };

    for (let i = 0, x = options.x; i < source.xSize; i++, x++) {
      if (x === this.xSize) {
        x = 0;
      }

      for (let j = 0, y = options.y; j < source.ySize; j++, y++) {
        if (y === this.ySize) {
          y = 0;
        }

        let t = source.data[i][j];
        if (!options.skipZeros || t !== 0) {
          this.data[x][y] = options.setZeros ? 0 : t;
        }
      }
    }

    return this;
  }

  // bitPlanes - массив номеров битовых плоскостей
  invertBitPlane(bitPlanes) {
    const mask = bitPlanes.reduce((mask, plane) => mask | (1 << plane), 0);

    return mask ? this.fill(value => value ^ mask) : this;
  }

  // bitPlanes - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости>, ... }
  copyBitPlane(bitPlanes) {
    for (let i in bitPlanes) {
      if (isNaN(parseInt(bitPlanes[i], 10))) {
        delete bitPlanes[i];
      }
    }

    return Object.keys(bitPlanes).length ? this.fill(value => {
      let newVal = value;

      for (let i in bitPlanes) {
        newVal = (newVal & ~(1 << i)) | (((value & (1 << bitPlanes[i])) >> bitPlanes[i]) << i);
      }

      return newVal;
    }) : this;
  }

  // bitPlanes - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
  fillRandom(bitPlanes) {
    return Object.keys(bitPlanes).length ? this.fill(value => {
      for (let i in bitPlanes) {
        const mask = 1 << i;

        if ((Math.random() * this.randomFillDensityDescritization | 0) < bitPlanes[i]) {
          value |= mask;
        } else {
          value &= ~mask;
        }
      }

      return value;
    }) : this;
  }

  get xSize() {
    return this.data.length;
  }

  get ySize() {
    return this.data[0].length;
  }

  get randomFillDensityDescritization() {
    return 1000;
  }

  get numBitPlanes() {
    return 4;
  }

  get numCellStates() {
    return Math.pow(2, this.numBitPlanes);
  }

  get bitPlanesList() {
    return [...Array(this.numBitPlanes)].map((n, i) => i);
  }

}
