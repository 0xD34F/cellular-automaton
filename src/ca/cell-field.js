﻿import { rotateArray } from '../utils';

export default class CellField {

    constructor(x, y) {
        this.resize(x, y);
    }

    resize(x, y = x) {
        this.xSize = x;
        this.ySize = y;
        this.data = [...Array(x)].map(() => Array(y).fill(0));

        return this;
    }

    fill(f) {
        this.data = this.data.map((col, x) => col.map((cell, y) => f.call(this, x, y, cell)));

        return this;
    }

    shift(x, y) {
        rotateArray(this.data, x);
        this.data.forEach(col => rotateArray(col, y));

        return this;
    }

    clone() {
        return new CellField(this.xSize, this.ySize).copy(this);
    }

    copy(source, options) {
        options = Object.assign({ x: 0, y: 0 }, options);

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

    // btiPlanes - массив номеров битовых плоскостей
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
                const mask = (1 << i);

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