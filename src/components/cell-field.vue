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
import CellField from '@/ca/cell-field';
import { limitation, transformColor, getLineCoord, logExecutionTime } from 'utils';
import config from 'config';


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
    sideFull = this.cellSize,
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
    brush: CellField,
    mode: {
      type: String,
      default: 'edit',
    },
    scrollable: {
      type: Boolean,
      default: false,
    },
    cellSide: {
      type: Number,
      default: 2,
    },
    cellBorder: {
      type: Number,
      default: 1,
    },
    showBitPlanes: {
      type: Number,
      default: ~0,
    },
    colors: {
      type: Object,
      default() {
        return { ...config.DEFAULT_COLORS };
      },
    },
    editOptions: {
      type: Object,
      default() {
        return {};
      },
    },
  },
  computed: {
    image() {
      const image = this.imageData;
      return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    },
    colorsForRender() {
      return Object.entries(this.colors).reduce((acc, [k, v]) => ({ ...acc, [k]: transformColor(v) }), {});
    },
    cellSize() {
      return this.cellSide + this.cellBorder;
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
      this.oldEventCoord = null;
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
        sideFull = this.cellSize,
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
    refresh() {
      const
        canvas = this.$refs.canvas,
        context = this.context = canvas.getContext('2d'),
        side = this.cellSide,
        border = this.cellBorder,
        sideFull = this.cellSize,
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
    changeZoom(change, coord) {
      this.oldEventCoord = coord;
      this.$emit('zoom', this.cellSide + change);
    },
    getFullSize() {
      const
        f = this.field,
        b = this.cellBorder,
        s = this.cellSize;

      return {
        width:  f.xSize * s + b,
        height: f.ySize * s + b,
      };
    },
    // левый верхний угол canvas'а совпадает с левым верхним углом клетки (если возможно)
    scrollFix() {
      const
        s = this.cellSize,
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
        x: Math.floor((e.offsetX + w.scrollLeft - t) / this.cellSize),
        y: Math.floor((e.offsetY + w.scrollTop  - t) / this.cellSize),
      };
    },
    detectViewCoord() {
      const
        w = this.$refs.wrapper,
        t = this.scrollable,
        s = this.cellSize;

      return {
        x: t ? Math.floor(w.scrollLeft / s) : 0,
        y: t ? Math.floor(w.scrollTop  / s) : 0,
        xSize: t ? Math.ceil(this.imageData.width  / s) : this.field.xSize,
        ySize: t ? Math.ceil(this.imageData.height / s) : this.field.ySize,
      };
    },
  },
  watch: {
    field() {
      this.refresh();
    },
    showBitPlanes() {
      this.refresh();
    },
    cellSize(newCellSize, oldCellSize) {
      let coord = this.oldEventCoord;
      if (!coord) {
        coord = this.detectViewCoord();
        coord.x += coord.xSize / 2 | 0;
        coord.y += coord.ySize / 2 | 0;
      }
      this.oldEventCoord = null;

      const
        w = this.$refs.wrapper,
        oldScrollX = w.scrollLeft,
        oldScrollY = w.scrollTop;

      let
        newScrollX = coord.x * (newCellSize - oldCellSize) + oldScrollX,
        newScrollY = coord.y * (newCellSize - oldCellSize) + oldScrollY,
        fixScrollX = 0,
        fixScrollY = 0;

      this.refresh();

      const
        maxScrollX = w.scrollWidth - w.clientWidth,
        maxScrollY = w.scrollHeight - w.clientHeight;

      if (newScrollX < 0) {
        fixScrollX = Math.round(newScrollX / newCellSize);
        newScrollX = 0;
      }
      if (newScrollX > maxScrollX) {
        fixScrollX = Math.round((newScrollX - maxScrollX) / newCellSize);
        newScrollX = maxScrollX;
      }
      if (newScrollY < 0) {
        fixScrollY = Math.round(newScrollY / newCellSize);
        newScrollY = 0;
      }
      if (newScrollY > maxScrollY) {
        fixScrollY = Math.round((newScrollY - maxScrollY) / newCellSize);
        newScrollY = maxScrollY;
      }

      w.scrollLeft = newScrollX;
      w.scrollTop  = newScrollY;

      if (fixScrollX || fixScrollY) {
        this.field.shift(fixScrollX, fixScrollY);
        this.render();
      }
    },
  },
  mounted() {
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
