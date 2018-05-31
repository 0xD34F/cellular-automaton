import config from 'config';
import * as CA from './ca/';


const wrapper = document.createElement('div');
wrapper.classList.add('cells-field-wrapper', 'scrollable');

const ca = new CA.CellularAutomaton({
  xSize: config.DEFAULT_X_SIZE,
  ySize: config.DEFAULT_Y_SIZE,
  ruleName: config.DEFAULT_RULE,
  view: {
    wrapper,
    zoom: {
      min: config.CELL_SIDE_MIN,
      max: config.CELL_SIDE_MAX
    },
    cellSide: config.DEFAULT_CELL_SIDE,
    cellBorder: config.DEFAULT_CELL_BORDER,
    brush: new CA.CellField(1).fill(() => 1)
  }
});


export default ca;
export { CA };
