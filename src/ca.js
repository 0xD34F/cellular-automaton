import config from 'config';
import * as CA from './ca/';

const { BRUSH_SIZE } = config;
const brush = new CA.CellField(BRUSH_SIZE);
brush.data[BRUSH_SIZE / 2 | 0][BRUSH_SIZE / 2 | 0] = 1;

const ca = new CA.CellularAutomaton({
  xSize: config.DEFAULT_X_SIZE,
  ySize: config.DEFAULT_Y_SIZE,
  view: {
    scrollable: true,
    zoom: { ...config.CELL_SIDE },
    cellSizes: {
      cellSide: config.DEFAULT_CELL_SIDE,
      cellBorder: config.DEFAULT_CELL_BORDER
    },
    brush
  }
});


export default ca;
export { CA };
