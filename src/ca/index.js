import { limitation } from 'utils';
import Rules from './rules/';
import History from './history';
import Generations from './generations';
import CellField from './cell-field';
import CellFieldView from './cell-field-view/';
import config from 'config';

const defaultOptions = {
    _intervalID: null,
    _stepDuration: config.DEFAULT_STEP_DURATION,
    _generationsPerStep: config.DEFAULT_GENERATIONS_PER_STEP
};

class CellularAutomaton {
    constructor(options) {
        Object.assign(this, defaultOptions);

        this.cells = {
            curr: new CellField(options.xSize, options.ySize)
        };
        this.cells.next = this.cells.curr.clone();
        this.cells.next._shift = this.cells.curr._shift; // чтобы не заниматься синхронизацией, просто сделаем объект смещения общим

        this.view = new CellFieldView({ ...options.view, field: this.cells.curr });

        this.generations = new Generations({
            cells: this.cells,
            view: this.view
        });

        this.history = new History({
            cells: this.cells,
            generations: this.generations
        });

        this.generations.rule = options.ruleCode || Rules.get(options.ruleName || 'default');
    }

    sizes() {
        const { xSize, ySize } = this.cells.curr;

        return { xSize, ySize, ...this.view.sizes };
    }

    resize(sizes = {}) {
        if (!isNaN(sizes.xSize) && !isNaN(sizes.ySize)) {
            if (this.cells.curr.xSize !== sizes.xSize || this.cells.curr.ySize !== sizes.ySize) {
                this.cells.curr.resize(sizes.xSize, sizes.ySize);
                this.cells.next.conform(this.cells.curr);
            }
        }

        this.view.resize(sizes.cellSide, sizes.cellBorder);
    }

    fill({ invert = [], random = {}, copy = {} } = {}) {
        this.cells.curr
            .invertBitPlane(invert)
            .fillRandom(random)
            .copyBitPlane(copy);
        this.view.render();
    }

    clear() {
        this.cells.curr.fill(() => 0);
        this.view.render();
    }

    newGeneration(n) {
        if (!this._intervalID) {
            if (!this.history.data) {
                this.history.save();
            }

            this.generations.next(n);
            this.view.render();
        }
    }

    get generationsPerStep() {
        return this._generationsPerStep;
    }
    set generationsPerStep(value) {
        this._generationsPerStep = limitation(value, config.GENERATIONS_PER_STEP_MIN, config.GENERATIONS_PER_STEP_MAX);
    }

    get stepDuration() {
        return this._stepDuration;
    }
    set stepDuration(value) {
        this._stepDuration = limitation(value, config.STEP_DURATION_MIN, config.STEP_DURATION_MAX);
        if (this._intervalID) {
            this.stop();
            this.start();
        }
    }

    get rule() {
        return this.generations.rule;
    }
    set rule(code) {
        this.generations.rule = code;
    }

    rotateClockwise() {
        this.cells.curr.rotateClockwise();
        this.cells.next.conform(this.cells.curr);
        this.view.refresh();
    }
    rotateCounterclockwise() {
        this.cells.curr.rotateCounterclockwise();
        this.cells.next.conform(this.cells.curr);
        this.view.refresh();
    }

    start() {
        if (this._intervalID) {
            return false;
        }

        this._intervalID = setInterval(() => {
            this.generations.next(this.generationsPerStep);
            this.view.render();
        }, this.stepDuration);

        this.history.save();

        if (this.view.mode === 'edit') {
            this.view.mode = 'shift';
        }

        document.dispatchEvent(new CustomEvent('ca-start', {
            detail: this
        }));

        return true;
    }

    stop() {
        if (!this._intervalID) {
            return false;
        }

        clearInterval(this._intervalID);
        this._intervalID = null;

        this.view.mode = 'edit';

        document.dispatchEvent(new CustomEvent('ca-stop', {
            detail: this
        }));

        return true;
    }

    back() {
        if (this.history.data) {
            this.stop();
            this.history.back();
            this.view.refresh();
        }
    }
}

export { CellField, CellFieldView, CellularAutomaton, Rules };
