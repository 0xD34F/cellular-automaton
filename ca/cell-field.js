function CellField(x, y) {
    var o = Object.create(CellField.prototype);

    o.resize(x, y);

    return o;
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

CellField.prototype.shift = function(_x, _y) {
    _x = _x || 0;
    _y = _y || 0;

    shiftArray(this.data, _x);
    for (var i = 0; i < this.xSize; i++) {
        shiftArray(this.data[i], _y);
    }

    return this.dispatchEvent('cell-field-shift', {
        shifted: {
            x: _x,
            y: _y
        }
    });
};

CellField.prototype.clone = function() {
    return CellField(this.xSize, this.ySize).copy(this);
};

CellField.prototype.copy = function(cells, _x, _y, options) {
    _x = _x || 0;
    _y = _y || 0;
    options = options instanceof Object ? options : {};

    for (var i = 0, x = _x; i < cells.xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var j = 0, y = _y; j < cells.ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

            var t = cells.data[i][j];
            if (!options.skipZeros || t !== 0) {
                this.data[x][y] = options.setZeros ? 0 : t;
            }
        }
    }

    return this;
};

// o - объект вида { <номер заполняемой битовой плоскости>: <номер копируемой битовой плоскости> }
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
