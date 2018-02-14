import { limitation, bitMask, getColorComponents, transformColor, getLineCoord } from '../utils';

const defaultColors = {
    background: '#505050',
     0: '#000000',
     1: '#FFFFFF',
     2: '#666666',
     3: '#A8A8A8',
     4: '#FF0000',
     5: '#00FF00',
     6: '#0000FF',
     7: '#00FFFF',
     8: '#FF00FF',
     9: '#FFFF00',
    10: '#FF8080',
    11: '#80FF80',
    12: '#8080FF',
    13: '#FFFF80',
    14: '#FF80FF',
    15: '#80FFFF'
};

const eventHandlers = [ {
    events: [ 'contextmenu' ],
    handler: function(e) {
        return false;
    }
}, {
    events: [ 'mouseup', 'mouseleave' ],
    handler: function(e) {
        this.oldEventCoord = {};
    }
}, {
    events: [ 'mousedown', 'mousemove' ],
    handler: function(e) {
        e.preventDefault();

        if (e.buttons !== 1 && e.buttons !== 2) {
            return;
        }

        var oldCoord = this.oldEventCoord || {},
            newCoord = detectEventCoord(this, e);

        if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
            return;
        }

        var action = userActions[this.mode];
        if (action.events.indexOf(e.type) !== -1 &&
            action.handler.call(this, e, newCoord, oldCoord) !== false) {

            this.oldEventCoord = newCoord;
        }
    }
}, {
    wrapper: true,
    events: [ 'scroll' ],
    handler: function(e) {
        scrollFix(this);
        this.render();
    }
}, {
    wrapper: true,
    events: [ 'wheel' ],
    handler: function(e) {
        e.preventDefault();
        e.stopPropagation();

        changeScale(this, e.deltaY > 0 ? -1 : 1, detectEventCoord(this, e));
    }
} ];

const userActions = {
    edit: {
        events: [ 'mousedown', 'mousemove' ],
        handler: function(e, newCoord, oldCoord) {
            var x = newCoord.x,
                y = newCoord.y,
                f = this.field,
                b = this.brush;

            if (x >= f.xSize || y >= f.ySize || x < 0 || y < 0 || !b) {
                return false;
            }

            var coord = getLineCoord(newCoord, Object.assign({}, newCoord, oldCoord));
            for (var i = 0; i < coord.length; i++) {
                x = (coord[i].x - Math.floor(b.xSize / 2) + f.xSize) % f.xSize;
                y = (coord[i].y - Math.floor(b.ySize / 2) + f.ySize) % f.ySize;

                f.copy(b, {
                    x: x,
                    y: y,
                    skipZeros: true,
                    setZeros: e.buttons === 2
                });
                this.renderPartial({ x: x, y: y, xSize: b.xSize, ySize: b.ySize });
            }
        }
    },
    shift: {
        events: [ 'mousemove' ],
        handler: function(e, newCoord, oldCoord) {
            this.field.shift(oldCoord.x - newCoord.x, oldCoord.y - newCoord.y);
            this.render();
        }
    },
    scale: {
        events: [ 'mousedown' ],
        handler: function(e, newCoord, oldCoord) {
            changeScale(this, ({
                1:  1,
                2: -1
            })[e.buttons] || 0, newCoord);
        }
    }
};


function changeScale(view, change, coord) {
    if (!view.scaling) {
        return;
    }

    var oldCellSide = view.cellSide,
        newCellSide = limitation(oldCellSide + change, view.scaling.min, view.scaling.max);

    if (oldCellSide !== newCellSide) {
        var w = view.wrapper,
            oldScrollX = w.scrollLeft,
            oldScrollY = w.scrollTop,
            newScrollX = coord.x * (newCellSide - oldCellSide) + oldScrollX,
            newScrollY = coord.y * (newCellSide - oldCellSide) + oldScrollY;

        view.resize(newCellSide);

        var maxScrollX = w.scrollWidth - w.clientWidth,
            maxScrollY = w.scrollHeight - w.clientHeight,
            fixScrollX = 0,
            fixScrollY = 0;

        if (newScrollX < 0) {
            fixScrollX = Math.round(newScrollX / (newCellSide + view.cellBorder));
            newScrollX = 0;
        }
        if (newScrollX > maxScrollX) {
            fixScrollX = Math.round((newScrollX - maxScrollX) / (newCellSide + view.cellBorder));
            newScrollX = maxScrollX;
        }
        if (newScrollY < 0) {
            fixScrollY = Math.round(newScrollY / (newCellSide + view.cellBorder));
            newScrollY = 0;
        }
        if (newScrollY > maxScrollY) {
            fixScrollY = Math.round((newScrollY - maxScrollY) / (newCellSide + view.cellBorder));
            newScrollY = maxScrollY;
        }

        w.scrollLeft = newScrollX;
        w.scrollTop  = newScrollY;

        if (fixScrollX || fixScrollY) {
            view.field.shift(fixScrollX, fixScrollY);
            view.render();
        }
    }
};

function scrollFix(view) {
    var s = view.cellSide + view.cellBorder,
        w = view.wrapper;

    w.scrollLeft = Math.round(w.scrollLeft / s) * s;
    w.scrollTop  = Math.round(w.scrollTop  / s) * s;
};

function detectEventCoord(view, e) {
    var b = view.cellBorder,
        t = Math.round(b / 2);

    return {
        x: Math.floor((e.offsetX - t) / (view.cellSide + b)),
        y: Math.floor((e.offsetY - t) / (view.cellSide + b))
    };
};

function detectViewCoord(view) {
    var w = view.wrapper,
        t = w.classList.contains('scrollable'),
        s = view.cellSide + view.cellBorder;

    return {
        x: t ? Math.floor(w.scrollLeft / s) : 0,
        y: t ? Math.floor(w.scrollTop  / s) : 0,
        xSize: t ? Math.ceil(view.imageData.width  / s) : view.field.xSize,
        ySize: t ? Math.ceil(view.imageData.height / s) : view.field.ySize
    };
};


export default class CellFieldView {

    constructor(field, options) {
        var o = Object.assign(this, options);

        o.field = field;
        o.wrapper = o.wrapper instanceof HTMLElement ? o.wrapper : document.querySelector(o.wrapper);
        o.cellSide = o.cellSide << 0;
        o.cellBorder = o.cellBorder << 0;
        o.showBitPlanes = isNaN(o.showBitPlanes) ? bitMask(o.field.numBitPlanes) : +o.showBitPlanes;

        if (!o.wrapper.classList.contains('scrollable')) {
            o.wrapper.style.width = `${field.xSize * (o.cellSide + o.cellBorder) + o.cellBorder}px`;
            o.wrapper.style.height = `${field.ySize * (o.cellSide + o.cellBorder) + o.cellBorder}px`;
        }

        o.canvas = document.createElement('canvas');
        o.wrapper.appendChild(o.canvas);

        eventHandlers.forEach(function(eh) {
            eh.events.forEach(function(eventName) {
                var elem = eh.wrapper ? o.wrapper : o.canvas;
                elem['on' + eventName] = eh.handler.bind(o);
            });
        });

        o.setColors(null);
        o.resize(o.cellSide);

        o.mode = 'edit';

        return o;
    }

    get mode() {
        return this._mode;
    }
    set mode(value) {
        this._mode = value;
        this.canvas.dispatchEvent(new CustomEvent('cell-field-mode'));
        this.canvas.setAttribute('data-mode', value);
    }

    renderPartial(coord) {
        var mask = this.showBitPlanes,
            cells = this.field.data,
            maxX = this.field.xSize,
            maxY = this.field.ySize,
            border = this.cellBorder,
            side = this.cellSide,
            sideFull = side + border,
            c = this.context;

        for (var x = coord.x, i = 0; i < coord.xSize; i++, x++) {
            if (x === maxX) {
                x = 0;
            }

            for (var y = coord.y, j = 0; j < coord.ySize; j++, y++) {
                if (y === maxY) {
                    y = 0;
                }

                c.fillStyle = this.colors[cells[x][y] & mask];
                c.fillRect(x * sideFull + border, y * sideFull + border, side, side);
            }
        }
    }

    render() {
        var coord = detectViewCoord(this),
            mask = this.showBitPlanes,
            cells = this.field.data,
            maxX = limitation(coord.x + coord.xSize, 0, this.field.xSize),
            maxY = limitation(coord.y + coord.ySize, 0, this.field.ySize),
            border = this.cellBorder,
            side = this.cellSide,
            sideFull = side + border,
            image = this.buf32,
            width = this.imageData.width,
            colors = this.colorsForRender;

        for (var i = 0, x = coord.x; x < maxX; x++, i++) {
            var column = cells[x];

            for (var j = 0, y = coord.y; y < maxY; y++, j++) {
                var color = colors[column[y] & mask];

                for (var imageX = i * sideFull + border, n = 0; n < side; n++, imageX++) {
                    for (var imageY = j * sideFull + border, m = 0; m < side; m++, imageY++) {
                        image[imageX + imageY * width] = color;
                    }
                }

            }
        }

        this.imageData.data.set(this.buf8);
        this.context.putImageData(this.imageData, coord.x * sideFull, coord.y * sideFull);
    }

    resize(cellSide = this.cellSide, cellBorder = this.cellBorder || 0) {
        if (isNaN(cellSide) || cellSide < 1) {
            return;
        }

        var canvas = this.canvas,
            context = this.context = canvas.getContext('2d'),
            side = this.cellSide = cellSide,
            border = this.cellBorder = cellBorder,
            sideFull = side + border,
            minWidth = this.field.xSize * sideFull + border,
            minHeight = this.field.ySize * sideFull + border,
            width = this.wrapper.clientWidth || minWidth,
            height = this.wrapper.clientHeight || minHeight;

        canvas.width = context.width = Math.max(minWidth, width);
        canvas.height = context.height = Math.max(minHeight, height);

        this.imageData = context.createImageData(
            Math.min(minWidth, Math.ceil(width / sideFull) * sideFull),
            Math.min(minHeight, Math.ceil(height / sideFull) * sideFull)
        );
        this.imageBuff = new ArrayBuffer(this.imageData.data.length);
        this.buf8 = new Uint8ClampedArray(this.imageBuff);
        this.buf32 = new Uint32Array(this.imageBuff);

        this.buf32.fill(this.colorsForRender.background);

        scrollFix(this);
        this.render();
    }

    setColors(colors, forceRender) {
        var oldColors = this.colors || defaultColors,
            newColors = {},
            colorsForRender = {};

        colors = Object.assign({}, oldColors, colors === null ? defaultColors : colors);

        for (var i in defaultColors) {
            var color = colors[i] || oldColors[i];
            if (color[0] !== '#') {
                color = '#' + color;
            }

            newColors[i] = color;
            colorsForRender[i] = transformColor(color);
        }

        this.colors = newColors;
        this.colorsForRender = colorsForRender;

        if (forceRender) {
            this.render();
        }
    }

    gradient(from, to, items = this.field.numCellStates) {
        var componentsFrom = getColorComponents(from),
            componentsTo = getColorComponents(to),
            componentsItems = componentsFrom.map((n, i) => (n - componentsTo[i]) / (items - 1));

        return [...Array(items)].map((n, i) => {
            return componentsFrom.map((m, j) => ((m - i * componentsItems[j]) | 0).toString(16).padStart(2, '0')).join('');
        });
    }

    download(filename = `${Date.now().toString()}.png`) {
        var a = document.createElement('a');
        a.href = this.canvas.toDataURL();
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
