import { limitation, bitMask, getColorComponents, transformColor, getLineCoord, logExecutionTime } from '../utils';

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

const mouseButtons = {
    left: 1,
    right: 2
};

const scale = {
    up: 1,
    down: -1
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

        if (![ mouseButtons.left, mouseButtons.right ].includes(e.buttons)) {
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

        changeScale(this, e.deltaY > 0 ? scale.down : scale.up, detectEventCoord(this, e));
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

            var coord = getLineCoord(newCoord, { ...newCoord, ...oldCoord });
            for (var i = 0; i < coord.length; i++) {
                x = (coord[i].x - Math.floor(b.xSize / 2) + f.xSize) % f.xSize;
                y = (coord[i].y - Math.floor(b.ySize / 2) + f.ySize) % f.ySize;

                f.copy(b, {
                    x: x,
                    y: y,
                    skipZeros: true,
                    setZeros: e.buttons === mouseButtons.right
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
                [mouseButtons.left]:  scale.up,
                [mouseButtons.right]: scale.down
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
}

function getFullSize(view) {
    var f = view.field,
        b = view.cellBorder,
        s = view.cellSide + b;

    return {
        width:  f.xSize * s + b,
        height: f.ySize * s + b
    }
}

// левый верхний угол canvas'а совпадает с левым верхним углом клетки (если возможно)
function scrollFix(view) {
    var s = view.cellSide + view.cellBorder,
        w = view.wrapper,
        size = getFullSize(view);

    w.scrollLeft = Math.min(Math.round(w.scrollLeft / s) * s, size.width  - w.clientWidth);
    w.scrollTop  = Math.min(Math.round(w.scrollTop  / s) * s, size.height - w.clientHeight);
}

function detectEventCoord(view, e) {
    var b = view.cellBorder,
        t = Math.round(b / 2),
        w = view.wrapper;

    return {
        x: Math.floor((e.offsetX + w.scrollLeft - t) / (view.cellSide + b)),
        y: Math.floor((e.offsetY + w.scrollTop  - t) / (view.cellSide + b))
    };
}

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
}

const limit = limitation;

const MAX_CELL_SIDE_WITH_OWN_RENDER = 20;
/*
 * собственные методы отрисовки под различные размеры клетки
 *
 * прирост скорости отрисовки - до ~2 раз (чем меньше размер - тем больше эффект),
 * за счёт отсутствия накладных расходов на организацию циклов по пикселям отдельной клетки
 */
const cellFieldRenderFunction = cellRenderCode => eval(`
(function() {
    var coord = detectViewCoord(this),
        mask = this.showBitPlanes,
        cells = this.field.data,
        maxX = limit(coord.x + coord.xSize, 0, this.field.xSize),
        maxY = limit(coord.y + coord.ySize, 0, this.field.ySize),
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

            ${cellRenderCode}
        }
    }

    this.imageData.data.set(this.buf8);
    this.context.putImageData(
        this.imageData,
        -(this.wrapper.scrollLeft % sideFull),
        -(this.wrapper.scrollTop % sideFull)
    );
})
`);

const cellPixelRenderCode = (i, j) => `image[i * sideFull + border + ${i} + (j * sideFull + border + ${j}) * width] = color;`;

const cellRenderCode = cellSide => [...Array(cellSide * cellSide)].map((n, i) => cellPixelRenderCode(i / cellSide | 0, i % cellSide)).join('');

const renderFunctions = {
    default: cellFieldRenderFunction(`
        for (var imageX = i * sideFull + border, n = 0; n < side; n++, imageX++) {
            for (var imageY = j * sideFull + border, m = 0; m < side; m++, imageY++) {
                image[imageX + imageY * width] = color;
            }
        }
    `)
};

export default class CellFieldView {

    constructor(field, options) {
        var o = Object.assign(this, options);

        o.field = field;
        o.wrapper = o.wrapper instanceof HTMLElement ? o.wrapper : document.querySelector(o.wrapper);
        o.cellSide = o.cellSide << 0;
        o.cellBorder = o.cellBorder << 0;
        o.showBitPlanes = isNaN(o.showBitPlanes) ? bitMask(o.field.numBitPlanes) : +o.showBitPlanes;

        if (o.wrapper.classList.contains('scrollable')) {
            o.wrapperScroll = document.createElement('div');
            o.wrapperScroll.classList.add('cells-field-wrapper-scroll');
            o.wrapper.appendChild(o.wrapperScroll);
        } else {
            var size = getFullSize(o);
            o.wrapper.style.width = `${size.width}px`;
            o.wrapper.style.height = `${size.height}px`;
        }

        o.canvas = document.createElement('canvas');
        o.wrapper.appendChild(o.canvas);

        eventHandlers.forEach(function(eh) {
            eh.events.forEach(function(eventName) {
                var elem = eh.wrapper ? o.wrapper : o.canvas;
                elem[`on${eventName}`] = eh.handler.bind(o);
            });
        });

        o.setColors(null);
        o.resize(o.cellSide);

        o.mode = 'edit';
    }

    get mode() {
        return this._mode;
    }
    set mode(value) {
        this._mode = value;
        this.canvas.dispatchEvent(new CustomEvent('cell-field-mode'));
        this.canvas.setAttribute('data-mode', value);
    }

    @logExecutionTime('renderPartial')
    renderPartial(coord) {
        var mask = this.showBitPlanes,
            cells = this.field.data,
            maxX = this.field.xSize,
            maxY = this.field.ySize,
            border = this.cellBorder,
            side = this.cellSide,
            sideFull = side + border,
            fixX = border - this.wrapper.scrollLeft,
            fixY = border - this.wrapper.scrollTop,
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
                c.fillRect(x * sideFull + fixX, y * sideFull + fixY, side, side);
            }
        }
    }

    @logExecutionTime('render')
    render() {
        (renderFunctions[this.cellSide] || renderFunctions['default']).call(this);
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
            size = getFullSize(this),
            isScroll = !!this.wrapperScroll,
            width = isScroll ? (this.wrapper.clientWidth || 1) : size.width,
            height = isScroll ? (this.wrapper.clientHeight || 1) : size.height;

        if (isScroll) {
            this.wrapperScroll.style.width = `${Math.max(size.width, width)}px`;
            this.wrapperScroll.style.height = `${Math.max(size.height, height)}px`;
        }

        canvas.width = context.width = width;
        canvas.height = context.height = height;

        this.imageData = context.createImageData(
            Math.min(size.width, Math.ceil(width / sideFull) * sideFull),
            Math.min(size.height, Math.ceil(height / sideFull) * sideFull)
        );
        this.imageBuff = new ArrayBuffer(this.imageData.data.length);
        this.buf8 = new Uint8ClampedArray(this.imageBuff);
        this.buf32 = new Uint32Array(this.imageBuff);

        this.buf32.fill(this.colorsForRender.background);

        if (!renderFunctions.hasOwnProperty(cellSide) && cellSide <= MAX_CELL_SIDE_WITH_OWN_RENDER) {
            renderFunctions[cellSide] = cellFieldRenderFunction(cellRenderCode(cellSide));
        }

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
                color = `#${color}`;
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
