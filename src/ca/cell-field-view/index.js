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

const _props = new WeakMap();

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
    _props.get(this).oldEventCoord = {};
  }
}, {
  events: [ 'mousedown', 'mousemove' ],
  handler(e) {
    e.preventDefault();

    if (![ mouseButtons.left, mouseButtons.right ].includes(e.buttons)) {
      return;
    }

    const
      props = _props.get(this),
      oldCoord = props.oldEventCoord || {},
      newCoord = this[_detectEventCoord](e);

    if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
      return;
    }

    const { events, handler } = userActions[this.mode.split('.')[0]];
    if (events.includes(e.type) && handler.call(this, e, newCoord, oldCoord) !== false) {
      props.oldEventCoord = newCoord;
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
        p = _props.get(this),
        f = p.field,
        fx = f.xSize,
        fy = f.ySize,
        b = p.brush,
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
      _props.get(this).field.shift(oldCoord.x - newCoord.x, oldCoord.y - newCoord.y);
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
    props = _props.get(this),
    mask = props.showBitPlanes,
    cells = props.field.data,
    maxX = Math.min(coord.x + coord.xSize, props.field.xSize),
    maxY = Math.min(coord.y + coord.ySize, props.field.ySize),
    border = props.cellBorder,
    side = props.cellSide,
    sideFull = side + border,
    image = props.buf32,
    width = props.imageData.width,
    colors = props.colorsForRender;

  for (var i = 0, x = coord.x; x < maxX; x++, i++) {
    var column = cells[x];

    for (var j = 0, y = coord.y; y < maxY; y++, j++) {
      var color = colors[column[y] & mask];

      ${cellRenderCode}
    }
  }

  props.imageData.data.set(props.buf8);
  props.context.putImageData(
    props.imageData,
    -(props.wrapper.scrollLeft % sideFull),
    -(props.wrapper.scrollTop % sideFull)
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

  constructor(props) {
    const p = { ...props };
    _props.set(this, p);

    p.wrapper = p.wrapper instanceof HTMLElement ? p.wrapper : document.querySelector(p.wrapper);
    p.cellSide = p.cellSide | 0;
    p.cellBorder = p.cellBorder | 0;
    p.showBitPlanes = isNaN(p.showBitPlanes) ? bitMask(p.field.numBitPlanes) : +p.showBitPlanes;

    if (p.wrapper.classList.contains('scrollable')) {
      p.wrapperScroll = document.createElement('div');
      p.wrapperScroll.classList.add('cells-field-wrapper-scroll');
      p.wrapper.appendChild(p.wrapperScroll);
    } else {
      const size = this[_getFullSize]();
      p.wrapper.style.width = `${size.width}px`;
      p.wrapper.style.height = `${size.height}px`;
    }

    p.canvas = document.createElement('canvas');
    p.wrapper.appendChild(p.canvas);

    eventHandlers.forEach(eh => eh.events.forEach(eventName => {
      const elem = eh.wrapper ? p.wrapper : p.canvas;
      elem[`on${eventName}`] = eh.handler.bind(this);
    }));

    this.setColors(null, true);
    this.refresh();

    this.mode = 'edit';
  }

  get colors() {
    return { ..._props.get(this).colors };
  }

  get element() {
    return _props.get(this).wrapper;
  }

  get sizes() {
    const { cellSide, cellBorder } = _props.get(this);
    return { cellSide, cellBorder };
  }

  get brush() {
    return _props.get(this).brush;
  }

  get imageData() {
    const image = _props.get(this).imageData;
    return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  }

  get mode() {
    return _props.get(this).mode;
  }
  set mode(value) {
    const props = _props.get(this)
    props.mode = value;
    props.canvas.setAttribute('data-mode', value);
    document.dispatchEvent(new CustomEvent('cell-field-mode', {
      detail: this
    }));
  }

  get showBitPlanes() {
    return _props.get(this).showBitPlanes;
  }
  set showBitPlanes(value) {
    const props = _props.get(this);
    props.showBitPlanes = value & bitMask(props.field.numBitPlanes);
  }

  @logExecutionTime('renderPartial')
  renderPartial(coord) {
    const
      props = _props.get(this),
      mask = props.showBitPlanes,
      cells = props.field.data,
      maxX = props.field.xSize,
      maxY = props.field.ySize,
      border = props.cellBorder,
      side = props.cellSide,
      sideFull = side + border,
      fixX = border - props.wrapper.scrollLeft,
      fixY = border - props.wrapper.scrollTop,
      c = props.context;

    for (let x = coord.x, i = 0; i < coord.xSize; i++, x++) {
      if (x === maxX) {
        x = 0;
      }

      for (let y = coord.y, j = 0; j < coord.ySize; j++, y++) {
        if (y === maxY) {
          y = 0;
        }

        c.fillStyle = props.colors[cells[x][y] & mask];
        c.fillRect(x * sideFull + fixX, y * sideFull + fixY, side, side);
      }
    }
  }

  @logExecutionTime('render')
  render(updateBackground) {
    const props = _props.get(this);

    if (updateBackground) {
      props.buf32.fill(props.colorsForRender.background);
    }

    (renderFunctions[props.cellSide] || renderFunctions['default']).call(this);
  }

  resize(cellSide = _props.get(this).cellSide, cellBorder = _props.get(this).cellBorder || 0) {
    Object.assign(_props.get(this), {
      cellSide: Math.max(1, cellSide | 0),
      cellBorder: Math.max(0, cellBorder | 0)
    });

    this.refresh();
  }

  refresh() {
    const
      props = _props.get(this),
      canvas = props.canvas,
      context = props.context = canvas.getContext('2d'),
      side = props.cellSide,
      border = props.cellBorder,
      sideFull = side + border,
      size = this[_getFullSize](),
      isScroll = !!props.wrapperScroll,
      width = isScroll ? (props.wrapper.clientWidth || 1) : size.width,
      height = isScroll ? (props.wrapper.clientHeight || 1) : size.height;

    if (isScroll) {
      props.wrapperScroll.style.width = `${Math.max(size.width, width)}px`;
      props.wrapperScroll.style.height = `${Math.max(size.height, height)}px`;
    }

    canvas.width = context.width = width;
    canvas.height = context.height = height;

    props.imageData = context.createImageData(
      Math.min(size.width, Math.ceil(width / sideFull) * sideFull),
      Math.min(size.height, Math.ceil(height / sideFull) * sideFull)
    );
    props.imageBuff = new ArrayBuffer(props.imageData.data.length);
    props.buf8 = new Uint8ClampedArray(props.imageBuff);
    props.buf32 = new Uint32Array(props.imageBuff);

    if (!renderFunctions.hasOwnProperty(side) && side <= config.MAX_CELL_SIDE_WITH_OWN_RENDER) {
      renderFunctions[side] = cellFieldRenderFunction(cellRenderCode(side));
    }

    this[_scrollFix]();
    this.render(true);
  }

  setColors(colors, noRender) {
    const
      props = _props.get(this),
      oldColors = props.colors || defaultColors,
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

    props.colors = newColors;
    props.colorsForRender = colorsForRender;

    if (!noRender) {
      this.render(true);
    }
  }

  [_changeZoom](change, coord) {
    const props = _props.get(this);

    if (!props.zoom) {
      return;
    }

    const
      oldCellSide = props.cellSide,
      newCellSide = limitation(oldCellSide + change, props.zoom.min, props.zoom.max);

    if (oldCellSide !== newCellSide) {
      const
        w = props.wrapper,
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
        fixScrollX = Math.round(newScrollX / (newCellSide + props.cellBorder));
        newScrollX = 0;
      }
      if (newScrollX > maxScrollX) {
        fixScrollX = Math.round((newScrollX - maxScrollX) / (newCellSide + props.cellBorder));
        newScrollX = maxScrollX;
      }
      if (newScrollY < 0) {
        fixScrollY = Math.round(newScrollY / (newCellSide + props.cellBorder));
        newScrollY = 0;
      }
      if (newScrollY > maxScrollY) {
        fixScrollY = Math.round((newScrollY - maxScrollY) / (newCellSide + props.cellBorder));
        newScrollY = maxScrollY;
      }

      w.scrollLeft = newScrollX;
      w.scrollTop  = newScrollY;

      if (fixScrollX || fixScrollY) {
        props.field.shift(fixScrollX, fixScrollY);
        this.render();
      }
    }
  }

  [_getFullSize]() {
    const
      p = _props.get(this),
      f = p.field,
      b = p.cellBorder,
      s = p.cellSide + b;

    return {
      width:  f.xSize * s + b,
      height: f.ySize * s + b
    };
  }

  // левый верхний угол canvas'а совпадает с левым верхним углом клетки (если возможно)
  [_scrollFix]() {
    const
      p = _props.get(this),
      s = p.cellSide + p.cellBorder,
      w = p.wrapper,
      size = this[_getFullSize]();

    w.scrollLeft = Math.min(Math.round(w.scrollLeft / s) * s, size.width  - w.clientWidth);
    w.scrollTop  = Math.min(Math.round(w.scrollTop  / s) * s, size.height - w.clientHeight);
  }

  [_detectEventCoord](e) {
    const
      p = _props.get(this),
      b = p.cellBorder,
      t = Math.round(b / 2),
      w = p.wrapper;

    return {
      x: Math.floor((e.offsetX + w.scrollLeft - t) / (p.cellSide + b)),
      y: Math.floor((e.offsetY + w.scrollTop  - t) / (p.cellSide + b))
    };
  }

  [_detectViewCoord]() {
    const
      p = _props.get(this),
      w = p.wrapper,
      t = w.classList.contains('scrollable'),
      s = p.cellSide + p.cellBorder;

    return {
      x: t ? Math.floor(w.scrollLeft / s) : 0,
      y: t ? Math.floor(w.scrollTop  / s) : 0,
      xSize: t ? Math.ceil(p.imageData.width  / s) : p.field.xSize,
      ySize: t ? Math.ceil(p.imageData.height / s) : p.field.ySize
    };
  }

}
