<template lang="pug">
  .cells-field-wrapper(
    :class="{ scrollable }"
    @scroll="onScroll"
    @mousewheel.prevent.stop="onWheel"
    ref="wrapper"
  )
    .cells-field-wrapper-scroll(
      v-if="scrollable"
      ref="wrapperScroll"
    )
    canvas(
      :data-mode="mode"
      @contextmenu="onContextMenu"
      @mousedown="onMouseActive"
      @mousemove="onMouseActive"
      @mouseup="onMouseDeactivate"
      @mouseleave="onMouseDeactivate"
      ref="canvas"
    )
</template>

<script>
import CellField from '../ca/cell-field';
import { limitation, bitMask, transformColor, getLineCoord, logExecutionTime } from 'utils';
import config from 'config';


const defaultColors = config.DEFAULT_COLORS;

const mouseButtons = {
  left: 1,
  right: 2
};

const zoom = {
  in: 1,
  out: -1
};

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
          setZeros: e.buttons === mouseButtons.right,
          ...this.editOptions,
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
      this.changeZoom(({
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
    coord = this.detectViewCoord(),
    mask = this.showBitPlanes,
    cells = this.field.data,
    maxX = Math.min(coord.x + coord.xSize, this.field.xSize),
    maxY = Math.min(coord.y + coord.ySize, this.field.ySize),
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
    -(this.$refs.wrapper.scrollLeft % sideFull),
    -(this.$refs.wrapper.scrollTop % sideFull)
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


export default {
  props: {
    field: CellField,
    cellSizes: null,
    scrollable: {
      type: Boolean,
      default: false,
    },
    brush: CellField,
    zoom: {
      default: null,
    },
    editOptions: {
      type: Object,
      default() {
        return {};
      },
    },
  },
  data() {
    return {
      mode: 'edit',
      colors: { ...config.DEFAULT_COLORS },
      showBitPlanes: bitMask(this.field.numBitPlanes),
      ...this.cellSizes,
    };
  },
  computed: {
    sizes() {
      const { cellSide, cellBorder } = this;
      return { cellSide, cellBorder };
    },
    image() {
      const image = this.imageData;
      return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    },
  },
  methods: {
    onContextMenu(e) {
      if (!e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onScroll() {
      this.scrollFix();
      this.render();
    },
    onWheel(e) {
      this.changeZoom(e.deltaY > 0 ? zoom.out : zoom.in, this.detectEventCoord(e));
    },
    onMouseActive(e) {
      e.preventDefault();

      if (![ mouseButtons.left, mouseButtons.right ].includes(e.buttons)) {
        return;
      }

      const
        oldCoord = this.oldEventCoord || {},
        newCoord = this.detectEventCoord(e);

      if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
        return;
      }

      const { events, handler } = userActions[this.mode.split('.')[0]];
      if (events.includes(e.type) && handler.call(this, e, newCoord, oldCoord) !== false) {
        this.oldEventCoord = newCoord;
      }
    },
    onMouseDeactivate() {
      this.oldEventCoord = {};
    },
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
        fixX = border - this.$refs.wrapper.scrollLeft,
        fixY = border - this.$refs.wrapper.scrollTop,
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
    },
    @logExecutionTime('render')
    render(updateBackground) {
      if (updateBackground) {
        this.buf32.fill(this.colorsForRender.background);
      }

      (renderFunctions[this.cellSide] || renderFunctions.default).call(this);
    },
    resize(cellSide = this.cellSide, cellBorder = this.cellBorder || 0) {
      this.cellSide = Math.max(1, cellSide | 0);
      this.cellBorder = Math.max(0, cellBorder | 0);

      this.refresh();
    },
    refresh() {
      const
        canvas = this.$refs.canvas,
        context = this.context = canvas.getContext('2d'),
        side = this.cellSide,
        border = this.cellBorder,
        sideFull = side + border,
        size = this.getFullSize(),
        isScroll = this.scrollable,
        width = isScroll ? (this.$refs.wrapper.clientWidth || 1) : size.width,
        height = isScroll ? (this.$refs.wrapper.clientHeight || 1) : size.height;

      if (isScroll) {
        this.$refs.wrapperScroll.style.width = `${Math.max(size.width, width)}px`;
        this.$refs.wrapperScroll.style.height = `${Math.max(size.height, height)}px`;
      } else {
        this.$refs.wrapper.style.width = `${size.width}px`;
        this.$refs.wrapper.style.height = `${size.height}px`;
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

      if (!renderFunctions.hasOwnProperty(side) && side <= config.MAX_CELL_SIDE_WITH_OWN_RENDER) {
        renderFunctions[side] = cellFieldRenderFunction(cellRenderCode(side));
      }

      this.scrollFix();
      this.render(true);
    },
    setColors(colors, noRender) {
      const
        oldColors = this.colors || defaultColors,
        newColors = {},
        colorsForRender = {};

      colors = { ...oldColors, ...(colors || defaultColors) };

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

      if (!noRender) {
        this.render(true);
      }
    },
    changeZoom(change, coord) {
      if (!this.zoom) {
        return;
      }

      const
        oldCellSide = this.cellSide,
        newCellSide = limitation(oldCellSide + change, this.zoom);

      if (oldCellSide !== newCellSide) {
        const
          w = this.$refs.wrapper,
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
    },
    getFullSize() {
      const
        f = this.field,
        b = this.cellBorder,
        s = this.cellSide + b;

      return {
        width:  f.xSize * s + b,
        height: f.ySize * s + b
      };
    },
    // левый верхний угол canvas'а совпадает с левым верхним углом клетки (если возможно)
    scrollFix() {
      const
        s = this.cellSide + this.cellBorder,
        w = this.$refs.wrapper,
        size = this.getFullSize();

      w.scrollLeft = Math.min(Math.round(w.scrollLeft / s) * s, size.width  - w.clientWidth);
      w.scrollTop  = Math.min(Math.round(w.scrollTop  / s) * s, size.height - w.clientHeight);
    },
    detectEventCoord(e) {
      const
        b = this.cellBorder,
        t = Math.round(b / 2),
        w = this.$refs.wrapper;

      return {
        x: Math.floor((e.offsetX + w.scrollLeft - t) / (this.cellSide + b)),
        y: Math.floor((e.offsetY + w.scrollTop  - t) / (this.cellSide + b))
      };
    },
    detectViewCoord() {
      const
        w = this.$refs.wrapper,
        t = this.scrollable,
        s = this.cellSide + this.cellBorder;

      return {
        x: t ? Math.floor(w.scrollLeft / s) : 0,
        y: t ? Math.floor(w.scrollTop  / s) : 0,
        xSize: t ? Math.ceil(this.imageData.width  / s) : this.field.xSize,
        ySize: t ? Math.ceil(this.imageData.height / s) : this.field.ySize
      };
    },
  },
  watch: {
    field() {
      this.refresh();
    },
  },
  mounted() {
    this.setColors(null, true);
    this.refresh();
  },
};
</script>

<style lang="scss">
.cells-field-wrapper {
  display: inline-block;

  &.scrollable {
    display: flex;
    overflow: hidden;
    padding: 0;
    flex: 1;
    overflow: scroll;
    position: relative;
  }

  .cells-field-wrapper-scroll {
    position: absolute;
  }

  canvas {
    position: sticky;
    left: 0;
    top: 0;

    &[data-mode="edit"] {
      cursor: default;
    }
    &[data-mode="shift"] {
      cursor: move;
    }
    &[data-mode="zoom.in"] {
      cursor: zoom-in;
    }
    &[data-mode="zoom.out"] {
      cursor: zoom-out;
    }
  }
}
</style>
