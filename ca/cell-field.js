﻿function CellField(x, y, viewOptions) {
    var o = Object.create(CellField.prototype);

    o.resize(x, y);

    o.view = viewOptions instanceof Object ? viewOptions : {};
    o.view.showBitPlanes = isNaN(+o.view.showBitPlanes) ? 3 : +o.view.showPlanes;

    if (typeof o.view.wrapper === 'string') {
        o.view.wrapper = document.querySelectorAll(o.view.wrapper)[0];
    }
    if (o.view.wrapper instanceof HTMLElement) {
        o.view.cellSide = o.view.cellSide << 0;
        o.view.cellBorder = o.view.cellBorder << 0;

        if (!o.view.width) {
            o.view.width = x * (o.view.cellSide + o.view.cellBorder) + o.view.cellBorder;
        }
        if (!o.view.height) {
            o.view.height = y * (o.view.cellSide + o.view.cellBorder) + o.view.cellBorder;
        }

        o.view.wrapper.style.width = o.view.width + 'px';
        o.view.wrapper.style.height = o.view.height + 'px';

        var canvas = document.createElement('canvas');
        o.view.wrapper.appendChild(canvas);
        o.view.canvas = canvas;
    }

    if (o.view.canvas) {
        o.view.oldEventCoord = {};

        for (var i = 0; i < o.eventHandlers.length; i++) {
            var eh = o.eventHandlers[i];
            for (var j = 0; j < eh.events.length; j++) {
                o.view.canvas['on' + eh.events[j]] = eh.handler.bind(o);
            }
        }
    }

    if (!isNaN(o.view.cellSide)) {
        o.resizeView(o.view.cellSide);
    }

    o.mode = 'edit';

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

CellField.prototype.eventHandlers = [ {
    events: [ 'contextmenu' ],
    handler: function(e) {
        return false;
    }
}, {
    events: [ 'mouseup', 'mouseleave' ],
    handler: function(e) {
        this.view.oldEventCoord = {};
        this.dispatchEvent('cell-field-' + this.mode + '-ended');
    }
}, {
    events: [ 'mousedown', 'mousemove' ],
    handler: function(e) {
        if (e.buttons !== 1 && e.buttons !== 2) {
            return;
        }

        var oldCoord = this.view.oldEventCoord,
            newCoord = this.detectEventCoord(e);

        if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
            return;
        }

        var action = this.userActions[this.mode] || {};
        if (action.events.indexOf(e.type) !== -1 &&
            action.handler instanceof Function &&
            action.handler.call(this, e, newCoord, oldCoord) !== false) {

            this.view.oldEventCoord = newCoord;
        }
    }
} ];

CellField.prototype.userActions = {
    edit: {
        events: [ 'mousedown', 'mousemove' ],
        handler: function(e, newCoord, oldCoord) {
            var x = newCoord.x,
                y = newCoord.y;

            if (x >= this.xSize || y >= this.ySize || x < 0 || y < 0) {
                return false;
            }

            if (this.brush instanceof CellField) {
                x = (x - Math.floor(this.brush.xSize / 2) + this.xSize) % this.xSize;
                y = (y - Math.floor(this.brush.ySize / 2) + this.ySize) % this.ySize;

                this.copy(this.brush, x, y, {
                    skipZeros: true,
                    setZeros: e.buttons === 2
                }).draw({ x: x, y: y, xSize: this.brush.xSize, ySize: this.brush.ySize });
            } else {
                if (e.buttons === 0) {
                    this.data[x][y] = (this.data[x][y] + 1) & 3;
                } else if (e.buttons === 2) {
                    this.data[x][y] = (this.data[x][y] - 1) & 3;
                }

                this.draw({ x: x, y: y, xSize: 1, ySize: 1 });
            }
        }
    },
    shift: {
        events: [ 'mousemove' ],
        handler: function(e, newCoord, oldCoord) {
            this.shift(newCoord.x - oldCoord.x, newCoord.y - oldCoord.y).draw();
        }
    },
    scale: {
        events: [ 'mousedown' ],
        handler: function(e, newCoord, oldCoord) {
            this.changeScale(e.button === 2 ? -1 : 1, e);
        }
    }
};

CellField.prototype.detectEventCoord = function(e) {
    var b = this.view.cellBorder,
        t = Math.round(b / 2);

    return {
        x: Math.floor((e.offsetX - t) / (this.view.cellSide + b)),
        y: Math.floor((e.offsetY - t) / (this.view.cellSide + b))
    };
};

CellField.prototype.dispatchEvent = function(eventName, data) {
    data = data instanceof Object ? data : {};
    data.cellField = this;

    document.dispatchEvent(new CustomEvent(eventName, {
        detail: data
    }));

    return this;
};

Object.defineProperty(CellField.prototype, 'mode', {
    get: function() {
        return this._mode;
    },
    set: function(value) {
        this._mode = value;

        this.dispatchEvent('cell-field-mode');

        if (this.view.canvas) {
            this.view.canvas.setAttribute('data-mode', value);
        }
    }
});

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
    return this.fill(function(x, y, val) {
        var newVal = val;

        for (var i in o) {
            newVal = (newVal & ~(1 << i)) | (((val & (1 << o[i])) >> o[i]) << i);
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

CellField.prototype.draw = function(coord, prevStates) {
    coord = coord === true ? {
        x: 0,
        y: 0,
        xSize: this.xSize,
        ySize: this.ySize
    } : coord || this.detectViewCoord();

    var numStates = Math.pow(2, this.numBitPlanes),
        border = this.view.cellBorder,
        side = this.view.cellSide,
        sideFull = side + border,
        c = this.view.context,
        m = this.view.showBitPlanes;

    var g = [];
    for (var i = 0; i < numStates; i++) {
        g.push([]);
    }

    var d = this.data;
    for (var i = 0, x = coord.x; i < coord.xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var j = 0, y = coord.y; j < coord.ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

            var t = d[x][y] & m;
            if (!(prevStates && (prevStates[x][y] & m) === t)) {
                g[t].push(x, y);
            }
        }
    }

    for (var state = 0; state < numStates; state++) {
        c.fillStyle = this.colors[state];

        for (var n = g[state], i = 0; i < n.length; i += 2) {
            c.fillRect(n[i] * sideFull + border, n[i + 1] * sideFull + border, side, side);
        }
    }

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

CellField.prototype.resizeView = function(cellSide, cellBorder) {
    if (!this.view.canvas || isNaN(cellSide) || cellSide < 1) {
        return;
    }

    var c = this.view.context = this.view.canvas.getContext('2d');

    var s = this.view.cellSide = cellSide,
        b = this.view.cellBorder = (arguments.length === 1 ? this.view.cellBorder : cellBorder) || 0;

    this.view.canvas.width  = c.width  = this.xSize * (s + b) + b;
    this.view.canvas.height = c.height = this.ySize * (s + b) + b;

    var parent = this.view.canvas.parentNode;
    if (c.width > parseInt(parent.style.width) || c.height > parseInt(parent.style.height)) {
        parent.classList.add('scrollable');
    } else {
        parent.classList.remove('scrollable');
        parent.scrollTop = 0;
    }

    c.fillStyle = this.colors.background;
    c.fillRect(0, 0, c.width, c.height);

    if (this.view.grid) {
        c.lineWidth = this.view.cellBorder;
        c.strokeStyle = this.colors.grid;

        var linePosFix = Math.floor(c.lineWidth / 2),
            gridSize = 8;

        for (var i = gridSize; i < this.xSize; i += gridSize) {
            c.beginPath();
            c.moveTo(i * (s + b) + linePosFix,        0);
            c.lineTo(i * (s + b) + linePosFix, c.height);
            c.stroke();
        }
        for (i = gridSize; i < this.ySize; i += gridSize) {
            c.beginPath();
            c.moveTo(      0, i * (s + b) + linePosFix);
            c.lineTo(c.width, i * (s + b) + linePosFix);
            c.stroke();
        }
    }

    setTimeout(function() {
        this.draw(true);
    }.bind(this));

    return this.dispatchEvent('cell-field-resize-view');
};

CellField.prototype.changeScale = function(change, coord) {
    var c = this.view.canvas;
    if (!c) {
        return this;
    }

    var oldCellSide = this.view.cellSide,
        newCellSide = limitation(oldCellSide + change, this.view.cellSideMin, this.view.cellSideMax);

    if (oldCellSide !== newCellSide) {
        if (!coord) {
            coord = {
                x: 0,
                y: 0
            };
        } else if (coord instanceof MouseEvent) {
            coord = this.detectEventCoord(coord);
        }

        var oldScrollX = c.parentNode.scrollLeft,
            oldScrollY = c.parentNode.scrollTop;

        this.resizeView(newCellSide);

        c.parentNode.scrollLeft = coord.x * (newCellSide - oldCellSide) + oldScrollX;
        c.parentNode.scrollTop  = coord.y * (newCellSide - oldCellSide) + oldScrollY;
    }

    return this;
};

CellField.prototype.detectViewCoord = function() {
    var v = this.view,
        p = this.view.canvas.parentNode,
        t = p.classList.contains('scrollable'),
        s = v.cellSide + v.cellBorder,
        x = Math.floor(p.scrollLeft / s),
        y = Math.floor(p.scrollTop  / s);

    return {
        x: t ? x : 0,
        y: t ? y : 0,
        xSize: t ? x + Math.floor(p.clientWidth  / s) : this.xSize,
        ySize: t ? y + Math.floor(p.clientHeight / s) : this.ySize,
    };
};

CellField.prototype.colors = {
    background: '#505050',
    grid: '#707070',
    0: '#000000',
    1: '#FFFFFF',
    2: '#666666',
    3: '#A8A8A8'
};
