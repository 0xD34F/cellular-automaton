import { limitation } from 'utils';
import Generations from './generations';
import CellField from './cell-field';
import config from 'config';

const defaultProps = {
  intervalID: null,
  stepDuration: config.DEFAULT_STEP_DURATION,
  generationsPerStep: config.DEFAULT_GENERATIONS_PER_STEP
};

const _props = new WeakMap();


class CellularAutomaton {
  constructor(options) {
    const props = { ...defaultProps };
    _props.set(this, props);

    props.cells = (cf => ({
      curr: cf,
      next: cf.clone(),
    }))(new CellField(options.xSize, options.ySize));

    props.generations = new Generations({
      cells: props.cells,
      view: {
        setColors: (...args) => props.view.setColors(...args)
      }
    });
  }

  fill({ invert = [], random = {}, copy = {} } = {}) {
    this.cells
      .invertBitPlane(invert)
      .fillRandom(random)
      .copyBitPlane(copy);
    this.view.render();
  }

  clear() {
    this.cells.fill(() => 0);
    this.view.render();
  }

  newGeneration(n) {
    const props = _props.get(this);

    if (!props.intervalID) {
      props.generations.next(n);
      props.view.render();
    }
  }

  get cells() {
    return _props.get(this).cells.curr;
  }

  get view() {
    return _props.get(this).view;
  }
  set view(val) {
    _props.get(this).view = val;
  }

  get sizes() {
    const { xSize, ySize } = this.cells;

    return { xSize, ySize, ...this.view.sizes };
  }
  set sizes(sizes = {}) {
    const props = _props.get(this);

    if (!isNaN(sizes.xSize) && !isNaN(sizes.ySize) && !props.intervalID) {
      if (props.cells.curr.xSize !== sizes.xSize || props.cells.curr.ySize !== sizes.ySize) {
        props.cells.curr.resize(sizes.xSize, sizes.ySize);
        props.cells.next.conform(props.cells.curr);
      }
    }

    props.view.resize(sizes.cellSide, sizes.cellBorder);
  }

  get generationsPerStep() {
    return _props.get(this).generationsPerStep;
  }
  set generationsPerStep(value) {
    _props.get(this).generationsPerStep = limitation(value, config.GENERATIONS_PER_STEP);
  }

  get stepDuration() {
    return _props.get(this).stepDuration;
  }
  set stepDuration(value) {
    const props = _props.get(this);
    props.stepDuration = limitation(value, config.STEP_DURATION);
    if (props.intervalID) {
      this.stop();
      this.start();
    }
  }

  get rule() {
    return _props.get(this).generations.rule;
  }
  set rule(code) {
    _props.get(this).generations.rule = code;
  }

  rotateClockwise() {
    this.cells.rotateClockwise();
    _props.get(this).cells.next.conform(this.cells);
    this.view.refresh();
  }
  rotateCounterclockwise() {
    this.cells.rotateCounterclockwise();
    _props.get(this).cells.next.conform(this.cells);
    this.view.refresh();
  }

  start() {
    const props = _props.get(this);

    if (props.intervalID) {
      return false;
    }

    props.intervalID = setInterval(() => {
      props.generations.next(props.generationsPerStep);
      props.view.render();
    }, props.stepDuration);

    if (props.view.mode === 'edit') {
      props.view.mode = 'shift';
    }

    return true;
  }

  stop() {
    const props = _props.get(this);

    if (!props.intervalID) {
      return false;
    }

    clearInterval(props.intervalID);
    props.intervalID = null;

    props.view.mode = 'edit';

    return true;
  }

  get state() {
    const props = _props.get(this);

    return {
      cells: props.cells.curr.clone(),
      time: props.generations.time,
    };
  }

  set state({ cells, time }) {
    const props = _props.get(this);

    this.stop();
    props.cells.curr.conform(cells);
    props.cells.next.conform(cells);
    props.generations.time = time;
    this.view.refresh();
  }
}

export { CellField, CellularAutomaton };
