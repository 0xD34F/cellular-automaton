import { limitation } from 'utils';
import Rules from './rules/';
import Generations from './generations';
import CellField from './cell-field';
import CellFieldView from './cell-field-view/';
import config from 'config';

const defaultProps = {
  intervalID: null,
  stepDuration: config.DEFAULT_STEP_DURATION,
  generationsPerStep: config.DEFAULT_GENERATIONS_PER_STEP
};

const _props = new WeakMap();

const
  _dispatch = Symbol(),
  _save = Symbol();


class CellularAutomaton {
  constructor(options) {
    const props = { ...defaultProps };
    _props.set(this, props);

    props.cells = {
      curr: new CellField(options.xSize, options.ySize)
    };
    props.cells.next = props.cells.curr.clone();

    props.view = new CellFieldView({ ...options.view, field: props.cells.curr });

    props.generations = new Generations({
      cells: props.cells,
      view: props.view
    });

    this.rule = options.ruleCode || Rules.get(options.ruleName || 'default');
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
      if (!props.history) {
        this[_save]();
      }

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

  get sizes() {
    const { xSize, ySize } = this.cells;

    return { xSize, ySize, ...this.view.sizes };
  }
  set sizes(sizes = {}) {
    const props = _props.get(this);

    if (!isNaN(sizes.xSize) && !isNaN(sizes.ySize)) {
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
    _props.get(this).generationsPerStep = limitation(value, config.GENERATIONS_PER_STEP_MIN, config.GENERATIONS_PER_STEP_MAX);
  }

  get stepDuration() {
    return _props.get(this).stepDuration;
  }
  set stepDuration(value) {
    const props = _props.get(this);
    props.stepDuration = limitation(value, config.STEP_DURATION_MIN, config.STEP_DURATION_MAX);
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

    this[_save]();

    if (props.view.mode === 'edit') {
      props.view.mode = 'shift';
    }

    this[_dispatch]('ca-start');

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

    this[_dispatch]('ca-stop');

    return true;
  }

  back() {
    const props = _props.get(this);

    if (props.history) {
      this.stop();
      props.cells.curr.conform(props.history.cells);
      props.cells.next.conform(props.history.cells);
      props.generations.time = props.history.time;
      props.history = null;
      this.view.refresh();
    }
  }

  [_dispatch](name) {
    document.dispatchEvent(new CustomEvent(name, {
      detail: this
    }));
  }

  [_save]() {
    const props = _props.get(this);

    props.history = {
      cells: props.cells.curr.clone(),
      time: props.generations.time
    };
  }
}

export { CellField, CellFieldView, CellularAutomaton, Rules };
