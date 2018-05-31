import { limitation, bitMask, transformColor, getLineCoord, logExecutionTime } from 'utils';
import config from 'config';
import './style.scss';


const defaultColors = config.DEFAULT_COLORS;

const mouseButtons = {
  left: 1,
  right: 2
};

const zoom = {
  in: 1,
  out: -1
};

const
  _changeZoom = Symbol(),
  _getFullSize = Symbol(),
  _detectEventCoord = Symbol(),
  _detectViewCoord = Symbol(),
  _scrollFix = Symbol();

const eventHandlers = [ {
  events: [ 'contextmenu' ],
  handler(e) {
    // контекстное меню доступно при зажатом ctrl
    return e.ctrlKey;
  }
}, {
  events: [ 'mouseup', 'mouseleave' ],
  handler(e) {
    this.oldEventCoord = {};
  }
}, {
  events: [ 'mousedown', 'mousemove' ],
  handler(e) {
    e.preventDefault();

    if (![ mouseButtons.left, mouseButtons.right ].includes(e.buttons)) {
      return;
    }

    const
      oldCoord = this.oldEventCoord || {},
      newCoord = this[_detectEventCoord](e);

    if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
      return;
    }

    const { events, handler } = userActions[this.mode.split('.')[0]];
    if (events.includes(e.type) && handler.call(this, e, newCoord, oldCoord) !== false) {
      this.oldEventCoord = newCoord;
    }
  }
}, {
  wrapper: true,
  events: [ 'scroll' ],
  handler(e) {
    this[_scrollFix]();
    this.render();
  }
}, {
  wrapper: true,
  events: [ 'wheel' ],
  handler(e) {
    e.preventDefault();
    e.stopPropagation();

    this[_changeZoom](e.deltaY > 0 ? zoom.out : zoom.in, this[_detectEventCoord](e));
  }
} ];

const userActions = {
  edit: {
    events: [ 'mousedown', 'mousemove' ],
    handler(e, newCoord, oldCoord) {
      let { x, y } = newCoord;
      const
        f = this.field,
        fx = f.xSize,
        fy = f.ySize,
        b = this.brush,
        bx = b.xSize,
        by = b.ySize;

      if (x >= fx || y >= fy || x < 0 || y < 0 || !b || e.ctrlKey) {
        return false;
      }

      const coord = getLineCoord(newCoord, { ...newCoord, ...oldCoord });
      for (let i = 0; i < coord.length; i++) {
        x = (coord[i].x - Math.floor(bx / 2) + fx) % fx;
        y = (coord[i].y - Math.floor(by / 2) + fy) % fy;

        f.copy(b, {
          x,
          y,
          skipZeros: true,
          setZeros: e.buttons === mouseButtons.right
        });
        this.renderPartial({ x, y, xSize: bx, ySize: by });
      }
    }
  },
  shift: {
    events: [ 'mousemove' ],
    handler(e, newCoord, oldCoord) {
      this.field.shift(oldCoord.x - newCoord.x, oldCoord.y - newCoord.y);
      this.render();
    }
  },
  zoom: {
    events: [ 'mousedown' ],
    handler(e, newCoord, oldCoord) {
      const subMode = this.mode.split('.')[1] === 'in';
      this[_changeZoom](({
        [mouseButtons.left]:  subMode ? zoom.in  : zoom.out,
        [mouseButtons.right]: subMode ? zoom.out : zoom.in
      })[e.buttons] || 0, newCoord);
    }
  }
};


const limit = limitation;

/*
 * собственные методы отрисовки под различные размеры клетки
 *
 * прирост скорости отрисовки - до ~2 раз (чем меньше размер - тем больше эффект),
 * за счёт отсутствия накладных расходов на организацию циклов по пикселям отдельной клетки
 */
const cellFieldRenderFunction = cellRenderCode => eval(`
(function() {
  var
    coord = this[_detectViewCoord](),
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

  constructor(options) {
    const o = Object.assign(this, options);

    o.wrapper = o.wrapper instanceof HTMLElement ? o.wrapper : document.querySelector(o.wrapper);
    o.cellSide = o.cellSide | 0;
    o.cellBorder = o.cellBorder | 0;
    o.showBitPlanes = isNaN(o.showBitPlanes) ? bitMask(o.field.numBitPlanes) : +o.showBitPlanes;

    if (o.wrapper.classList.contains('scrollable')) {
      o.wrapperScroll = document.createElement('div');
      o.wrapperScroll.classList.add('cells-field-wrapper-scroll');
      o.wrapper.appendChild(o.wrapperScroll);
    } else {
      const size = o[_getFullSize]();
      o.wrapper.style.width = `${size.width}px`;
      o.wrapper.style.height = `${size.height}px`;
    }

    o.canvas = document.createElement('canvas');
    o.wrapper.appendChild(o.canvas);

    eventHandlers.forEach(function(eh) {
      eh.events.forEach(function(eventName) {
        const elem = eh.wrapper ? o.wrapper : o.canvas;
        elem[`on${eventName}`] = eh.handler.bind(o);
      });
    });

    o.setColors(null);
    o.resize();

    o.mode = 'edit';
  }

  get mode() {
    return this._mode;
  }
  set mode(value) {
    this._mode = value;
    this.canvas.setAttribute('data-mode', value);
    document.dispatchEvent(new CustomEvent('cell-field-mode', {
      detail: this
    }));
  }

  @logExecutionTime('renderPartial')
  renderPartial(coord) {
    const
      mask = this.showBitPlanes,
      cells = this.field.data,
      maxX = this.field.xSize,
      maxY = this.field.ySize,
      border = this.cellBorder,
      side = this.cellSide,
      sideFull = side + border,
      fixX = border - this.wrapper.scrollLeft,
      fixY = border - this.wrapper.scrollTop,
      c = this.context;

    for (let x = coord.x, i = 0; i < coord.xSize; i++, x++) {
      if (x === maxX) {
        x = 0;
      }

      for (let y = coord.y, j = 0; j < coord.ySize; j++, y++) {
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

    const
      canvas = this.canvas,
      context = this.context = canvas.getContext('2d'),
      side = this.cellSide = cellSide,
      border = this.cellBorder = cellBorder,
      sideFull = side + border,
      size = this[_getFullSize](),
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

    if (!renderFunctions.hasOwnProperty(cellSide) && cellSide <= config.MAX_CELL_SIDE_WITH_OWN_RENDER) {
      renderFunctions[cellSide] = cellFieldRenderFunction(cellRenderCode(cellSide));
    }

    this[_scrollFix]();
    this.render();
  }

  setColors(colors, forceRender) {
    const
      oldColors = this.colors || defaultColors,
      newColors = {},
      colorsForRender = {};

    colors = Object.assign({}, oldColors, colors || defaultColors);

    for (let i in defaultColors) {
      let color = colors[i] || oldColors[i];
      if (color[0] !== '#') {
        color = `#${color}`;
      }

      newColors[i] = color;
      colorsForRender[i] = transformColor(color);
    }

    this.colors = newColors;
    this.colorsForRender = colorsForRender;

    if (forceRender && this.canvas) {
      this.render();
    }
  }

  [_changeZoom](change, coord) {
    if (!this.zoom) {
      return;
    }

    const
      oldCellSide = this.cellSide,
      newCellSide = limitation(oldCellSide + change, this.zoom.min, this.zoom.max);

    if (oldCellSide !== newCellSide) {
      const
        w = this.wrapper,
        oldScrollX = w.scrollLeft,
        oldScrollY = w.scrollTop;

      let
        newScrollX = coord.x * (newCellSide - oldCellSide) + oldScrollX,
        newScrollY = coord.y * (newCellSide - oldCellSide) + oldScrollY,
        fixScrollX = 0,
        fixScrollY = 0;

      this.resize(newCellSide);

      const
        maxScrollX = w.scrollWidth - w.clientWidth,
        maxScrollY = w.scrollHeight - w.clientHeight;

      if (newScrollX < 0) {
        fixScrollX = Math.round(newScrollX / (newCellSide + this.cellBorder));
        newScrollX = 0;
      }
      if (newScrollX > maxScrollX) {
        fixScrollX = Math.round((newScrollX - maxScrollX) / (newCellSide + this.cellBorder));
        newScrollX = maxScrollX;
      }
      if (newScrollY < 0) {
        fixScrollY = Math.round(newScrollY / (newCellSide + this.cellBorder));
        newScrollY = 0;
      }
      if (newScrollY > maxScrollY) {
        fixScrollY = Math.round((newScrollY - maxScrollY) / (newCellSide + this.cellBorder));
        newScrollY = maxScrollY;
      }

      w.scrollLeft = newScrollX;
      w.scrollTop  = newScrollY;

      if (fixScrollX || fixScrollY) {
        this.field.shift(fixScrollX, fixScrollY);
        this.render();
      }
    }
  }

  [_getFullSize]() {
    const
      f = this.field,
      b = this.cellBorder,
      s = this.cellSide + b;

    return {
      width:  f.xSize * s + b,
      height: f.ySize * s + b
    };
  }

  // левый верхний угол canvas'а совпадает с левым верхним углом клетки (если возможно)
  [_scrollFix]() {
    const
      s = this.cellSide + this.cellBorder,
      w = this.wrapper,
      size = this[_getFullSize]();

    w.scrollLeft = Math.min(Math.round(w.scrollLeft / s) * s, size.width  - w.clientWidth);
    w.scrollTop  = Math.min(Math.round(w.scrollTop  / s) * s, size.height - w.clientHeight);
  }

  [_detectEventCoord](e) {
    const
      b = this.cellBorder,
      t = Math.round(b / 2),
      w = this.wrapper;

    return {
      x: Math.floor((e.offsetX + w.scrollLeft - t) / (this.cellSide + b)),
      y: Math.floor((e.offsetY + w.scrollTop  - t) / (this.cellSide + b))
    };
  }

  [_detectViewCoord]() {
    const
      w = this.wrapper,
      t = w.classList.contains('scrollable'),
      s = this.cellSide + this.cellBorder;

    return {
      x: t ? Math.floor(w.scrollLeft / s) : 0,
      y: t ? Math.floor(w.scrollTop  / s) : 0,
      xSize: t ? Math.ceil(this.imageData.width  / s) : this.field.xSize,
      ySize: t ? Math.ceil(this.imageData.height / s) : this.field.ySize
    };
  }

}
