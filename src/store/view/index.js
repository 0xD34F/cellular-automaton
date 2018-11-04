import { limitation } from 'utils';
import config from 'config';


export default {
  state: {
    colors: { ...config.DEFAULT_COLORS },
    cellSide: config.DEFAULT_CELL_SIDE,
    cellBorder: config.DEFAULT_CELL_BORDER,
    showBitPlanes: ~0,
    mode: 'edit',
  },
  getters: {
    viewOptions: state => ({
      colors: { ...state.colors },
      cellSide: state.cellSide,
      cellBorder: state.cellBorder,
      showBitPlanes: state.showBitPlanes,
      mode: state.mode,
    }),
  },
  mutations: {
    setViewOptions(state, {
      cellSide = state.cellSide,
      cellBorder = state.cellBorder,
      showBitPlanes = state.showBitPlanes,
      mode = state.mode,
    } = {}) {
      state.cellSide = limitation(cellSide, config.CELL_SIDE);
      state.cellBorder = limitation(cellBorder, config.CELL_BORDER);
      state.showBitPlanes = showBitPlanes;
      state.mode = mode;
    },
    setColors(state, colors = {}) {
      const
        oldColors = state.colors,
        newColors = {};

      colors = { ...oldColors, ...colors };

      for (const i in oldColors) {
        const color = colors[i] || oldColors[i];
        newColors[i] = color[0] !== '#' ? `#${color}` : color;
      }

      state.colors = newColors;
    },
  },
};
