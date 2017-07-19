function CellField(x, y) {
    return Object.create(CellField.prototype).resize(x, y);
}

Object.defineProperty(CellField.prototype, 'numBitPlanes', {
    get: function() {
        return 4;
    }
});
Object.defineProperty(CellField.prototype, 'numCellStates', {
    get: function() {
        return Math.pow(2, this.numBitPlanes);
    }
})
CellField.prototype.getBitPlanes = function() {
    return [...Array(this.numBitPlanes)].map((n, i) => i);
};

CellField.prototype.resize = function(x, y = x) {
    this.xSize = x;
    this.ySize = y;
    this.data = [...Array(x)].map(() => Array(y).fill(0));

    return this;
};

CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.xSize; x++) {
        for (var y = 0; y < this.ySize; y++) {
            this.data[x][y] = f.call(this, x, y, this.data[x][y]);
        }
    }

    return this;
};

CellField.prototype.shift = function(x, y) {
    rotateArray(this.data, x);
    for (var i = 0; i < this.xSize; i++) {
        rotateArray(this.data[i], y);
    }

    return this;
};

CellField.prototype.clone = function() {
    return CellField(this.xSize, this.ySize).copy(this);
};

CellField.prototype.copy = function(source, options) {
    options = Object.assign({ x: 0, y: 0 }, options);

    for (var i = 0, x = options.x; i < source.xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var j = 0, y = options.y; j < source.ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

            var t = source.data[i][j];
            if (!options.skipZeros || t !== 0) {
                this.data[x][y] = options.setZeros ? 0 : t;
            }
        }
    }

    return this;
};

// o - массив номеров битовых плоскостей
CellField.prototype.invertBitPlane = function(o) {
    var mask = o.reduce((prev, curr) => prev | (1 << curr), 0);

    return mask ? this.fill((x, y, value) => value ^ mask) : this;
};

// o - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости>, ... }
CellField.prototype.copyBitPlane = function(o) {
    for (var i in o) {
        if (isNaN(parseInt(o[i], 10))) {
            delete o[i];
        }
    }

    return Object.keys(o).length ? this.fill(function(x, y, value) {
        var newVal = value;

        for (var i in o) {
            newVal = (newVal & ~(1 << i)) | (((value & (1 << o[i])) >> o[i]) << i);
        }

        return newVal;
    }) : this;
};

Object.defineProperty(CellField.prototype, 'randomFillDensityDescritization', {
    get: function() {
        return 1000;
    }
});
// o - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
CellField.prototype.fillRandom = function(o) {
    return Object.keys(o).length ? this.fill(function(x, y, value) {
        for (var i in o) {
            var mask = (1 << i);

            if (Math.floor(Math.random() * this.randomFillDensityDescritization) < o[i]) {
                value |= mask;
            } else {
                value &= ~mask;
            }
        }

        return value;
    }) : this;
};
