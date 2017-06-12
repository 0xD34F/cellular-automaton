function CellField(x, y, viewOptions) {
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
                var elem = eh.wrapper ? o.view.canvas.parentNode : o.view.canvas;
                elem['on' + eh.events[j]] = eh.handler.bind(o);
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
}, {
    wrapper: true,
    events: [ 'scroll' ],
    handler: function(e) {
        var s = this.view.cellSide + this.view.cellBorder,
            p = this.view.canvas.parentNode;

        p.scrollLeft = Math.round(p.scrollLeft / s) * s;
        p.scrollTop  = Math.round(p.scrollTop  / s) * s;

        setTimeout(this.render.bind(this));
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
                }).renderPartial({ x: x, y: y, xSize: this.brush.xSize, ySize: this.brush.ySize });
            } else {
                if (e.buttons === 1) {
                    this.data[x][y] = (this.data[x][y] + 1) & 3;
                } else if (e.buttons === 2) {
                    this.data[x][y] = (this.data[x][y] - 1) & 3;
                }

                this.renderPartial({ x: x, y: y, xSize: 1, ySize: 1 });
            }
        }
    },
    shift: {
        events: [ 'mousemove' ],
        handler: function(e, newCoord, oldCoord) {
            this.shift(newCoord.x - oldCoord.x, newCoord.y - oldCoord.y).render();
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

CellField.prototype._getRenderGroups = function() {
    var numStates = Math.pow(2, this.numBitPlanes),
        groups = [];

    for (var i = 0; i < numStates; i++) {
        groups.push([]);
    }

    return groups;
};

CellField.prototype.renderPartial = function(coord) {
    var m = this.view.showBitPlanes,
        rg = this._getRenderGroups(),
        cells = this.data;

    for (var x = coord.x, i = 0; i < coord.xSize; i++, x++) {
        if (x === this.xSize) {
            x = 0;
        }

        for (var y = coord.y, j = 0; j < coord.ySize; j++, y++) {
            if (y === this.ySize) {
                y = 0;
            }

            rg[cells[x][y] & m].push(x, y);
        }
    }

    var border = this.view.cellBorder,
        side = this.view.cellSide,
        sideFull = side + border,
        c = this.view.context;

    for (var state = 0; state < rg.length; state++) {
        c.fillStyle = this.colors[state];

        for (var n = rg[state], p = 0; p < n.length; p += 2) {
            c.fillRect(n[p] * sideFull + border, n[p + 1] * sideFull + border, side, side);
        }
    }

    return this;
};

CellField.prototype.render = function(prevStates) {
    var coord = this.detectViewCoord(),
        m = this.view.showBitPlanes,
        rg = this._getRenderGroups(),
        cells = this.data,
        maxX = limitation(coord.x + coord.xSize, 0, this.xSize),
        maxY = limitation(coord.y + coord.ySize, 0, this.ySize);

    for (var i = 0, x = coord.x; x < maxX; x++, i++) {
        for (var j = 0, y = coord.y; y < maxY; y++, j++) {
            rg[cells[x][y] & m].push(i, j);
        }
    }

    var border = this.view.cellBorder,
        side = this.view.cellSide,
        sideFull = side + border,
        image = this.view.imageData.data,
        w = this.view.imageData.width;

    for (var state = 0; state < rg.length; state++) {
        var r = parseInt(this.colors[state].slice(1, 3), 16),
            g = parseInt(this.colors[state].slice(3, 5), 16),
            b = parseInt(this.colors[state].slice(5, 7), 16);

        for (var n = rg[state], p = 0; p < n.length; p += 2) {
            for (x = n[p] * sideFull + border, i = 0; i < side; i++, x++) {
                for (y = n[p + 1] * sideFull + border, j = 0; j < side; j++, y++) {
                    var k = 4 * x + 4 * y * w;
                    image[k + 0] =   r; // red
                    image[k + 1] =   g; // green
                    image[k + 2] =   b; // blue
                    image[k + 3] = 255; // alpha
                }
            }
        }
    }

    this.view.context.putImageData(this.view.imageData, coord.x * sideFull, coord.y * sideFull);

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
        b = this.view.cellBorder = (arguments.length === 1 ? this.view.cellBorder : cellBorder) || 0,
        sb = s + b;

    this.view.canvas.width  = c.width  = this.xSize * sb + b;
    this.view.canvas.height = c.height = this.ySize * sb + b;

    var parent = this.view.canvas.parentNode,
        w = parseInt(parent.style.width,  10),
        h = parseInt(parent.style.height, 10);

    if (c.width > w || c.height > h) {
        parent.classList.add('scrollable');
    } else {
        parent.classList.remove('scrollable');
        parent.scrollTop = 0;
    }

    this.view.imageData = c.createImageData(Math.ceil(w / sb) * sb, Math.ceil(h / sb) * sb);

    var d = this.view.imageData.data,
        _r = parseInt(this.colors.background.slice(1, 3), 16),
        _g = parseInt(this.colors.background.slice(3, 5), 16),
        _b = parseInt(this.colors.background.slice(5, 7), 16);

    for (var i = 0; i < d.length; i += 4) {
        d[i + 0] = _r;
        d[i + 1] = _g;
        d[i + 2] = _b;
        d[i + 3] = 255;
    }

    return this.render().dispatchEvent('cell-field-resize-view');
};

CellField.prototype.changeScale = function(change, coord) {
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

        var p = this.view.canvas.parentNode,
            oldScrollX = p.scrollLeft,
            oldScrollY = p.scrollTop;

        this.resizeView(newCellSide);

        p.scrollLeft = coord.x * (newCellSide - oldCellSide) + oldScrollX;
        p.scrollTop  = coord.y * (newCellSide - oldCellSide) + oldScrollY;
    }

    return this;
};

CellField.prototype.detectViewCoord = function() {
    var v = this.view,
        p = v.canvas.parentNode,
        t = p.classList.contains('scrollable'),
        s = v.cellSide + v.cellBorder;

    return {
        x: t ? Math.floor(p.scrollLeft / s) : 0,
        y: t ? Math.floor(p.scrollTop  / s) : 0,
        xSize: t ? Math.ceil(p.clientWidth  / s) : this.xSize,
        ySize: t ? Math.ceil(p.clientHeight / s) : this.ySize,
    };
};

CellField.prototype.colors = {
    background: '#505050',
    0: '#000000',
    1: '#FFFFFF',
    2: '#666666',
    3: '#A8A8A8'
};
