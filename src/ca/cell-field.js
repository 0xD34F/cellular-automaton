import { rotateArray } from '../utils';


function rotateField(sizeField) {
    return function(target, key, descriptor) {
        const original = descriptor.value;

        descriptor.value = function() {
            this.data = original(this.data, this._shift, this[sizeField]);
            [ this.xSize, this.ySize ] = [ this.ySize, this.xSize ];

            return this;
        };

        return descriptor;
    };
}


export default class CellField {

    constructor(x, y) {
        this.resize(x, y);
    }

    resize(x, y = x, shift = { x: 0, y: 0 }) {
        this.xSize = x;
        this.ySize = y;
        this._shift = { ...shift };
        this.data = [...Array(x)].map(() => Array(y).fill(0));

        return this;
    }

    fill(f) {
        this.data = this.data.map((col, x) => col.map((cell, y) => f.call(this, x, y, cell)));

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

    @rotateField('ySize')
    rotateClockwise(data, shift, size) {
        Object.assign(shift, { x: (size - shift.y) % size, y: shift.x });
        return data[0].map((cell, y) => data.map((col, x) => data[x][size - y - 1]));
    }

    @rotateField('xSize')
    rotateCounterclockwise(data, shift, size) {
        Object.assign(shift, { x: shift.y, y: (size - shift.x) % size });
        return data[0].map((cell, y) => data.map((col, x) => data[size - x - 1][y]));
    }

    clone() {
        return new CellField(this.xSize, this.ySize, this._shift).copy(this);
    }

    conform(f) {
        this.data = f.data.map(col => [...col]);
        [ this.xSize, this.ySize ] = [ f.xSize, f.ySize ];
        Object.assign(this._shift, f._shift);
        return this;
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

    getBitPlanes() {
        return [...Array(this.numBitPlanes)].map((n, i) => i);
    }

    // bitPlanes - массив номеров битовых плоскостей
    invertBitPlane(bitPlanes) {
        const mask = bitPlanes.reduce((mask, plane) => mask | (1 << plane), 0);

        return mask ? this.fill((x, y, value) => value ^ mask) : this;
    }

    // bitPlanes - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости>, ... }
    copyBitPlane(bitPlanes) {
        for (let i in bitPlanes) {
            if (isNaN(parseInt(bitPlanes[i], 10))) {
                delete bitPlanes[i];
            }
        }

        return Object.keys(bitPlanes).length ? this.fill(function(x, y, value) {
            let newVal = value;

            for (let i in bitPlanes) {
                newVal = (newVal & ~(1 << i)) | (((value & (1 << bitPlanes[i])) >> bitPlanes[i]) << i);
            }

            return newVal;
        }) : this;
    }

    // bitPlanes - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
    fillRandom(bitPlanes) {
        return Object.keys(bitPlanes).length ? this.fill(function(x, y, value) {
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

    get randomFillDensityDescritization() {
        return 1000;
    }

    get numBitPlanes() {
        return 4;
    }

    get numCellStates() {
        return Math.pow(2, this.numBitPlanes);
    }
}
