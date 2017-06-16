function CellField(x, y) {
    return Object.create(CellField.prototype).resize(x, y);
}

CellField.prototype.numBitPlanes = 2;
CellField.prototype.getBitPlanes = function() {
    var planes = [];
    for (var i = 0; i < this.numBitPlanes; i++) {
        planes.push(i);
    }

    return planes;
};

CellField.prototype.dispatchEvent = function(eventName, data) {
    data = data instanceof Object ? data : {};
    data.cellField = this;

    document.dispatchEvent(new CustomEvent(eventName, {
        detail: data
    }));

    return this;
};

CellField.prototype.resize = function(x, y) {
    this.xSize = x;
    this.ySize = y;

    this.data = new Array(x);
    for (var i = 0; i < x; i++) {
        this.data[i] = new Array(y);
    }

    return this.clear().dispatchEvent('cell-field-resize');
};

CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.xSize; x++) {
        for (var y = 0; y < this.ySize; y++) {
            this.data[x][y] = f.call(this, x, y, this.data[x][y]);
        }
    }

    return this.dispatchEvent('cell-field-fill', {
        filled: f
    });
};

CellField.prototype.shift = function(x, y) {
    x = x || 0;
    y = y || 0;

    shiftArray(this.data, x);
    for (var i = 0; i < this.xSize; i++) {
        shiftArray(this.data[i], y);
    }

    return this.dispatchEvent('cell-field-shift', {
        shifted: {
            x: x,
            y: y
        }
    });
};

CellField.prototype.clone = function() {
    return CellField(this.xSize, this.ySize).copy(this).dispatchEvent('cell-field-clone', {
        cloned: this
    });
};

CellField.prototype.copy = function(source, options) {
    options = options instanceof Object ? options : {};
    options.x = options.x || 0;
    options.y = options.y || 0;

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

    return this.dispatchEvent('cell-field-copy', {
        copied: {
            source: source,
            options: options
        }
    });
};

// o - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости>, ... }
CellField.prototype.copyBitPlane = function(o) {
    return this.fill(function(x, y, value) {
        var newVal = value;

        for (var i in o) {
            newVal = (newVal & ~(1 << i)) | (((value & (1 << o[i])) >> o[i]) << i);
        }

        return newVal;
    });
};

CellField.prototype.randomFillDensityDescritization = 1000;
// o - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
CellField.prototype.fillRandom = function(o) {
    return this.fill(function(x, y, value) {
        for (var i in o) {
            var mask = (1 << i);

            if (random(this.randomFillDensityDescritization) < o[i]) {
                value |= mask;
            } else {
                value &= ~mask;
            }
        }

        return value;
    });
};

CellField.prototype.clear = function() {
    return this.fill(function() {
        return 0;
    });
};
