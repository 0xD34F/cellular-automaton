import { limitation } from '../utils';
import Rules from './rules';
import History from './history';
import Generations from './generations';
import CellField from './cell-field';
import CellFieldView from './cell-field-view';
import config from '../config';

const defaultOptions = {
    _intervalID: null,
    _stepDuration: config.DEFAULT_STEP_DURATION,
    _generationsPerStep: config.DEFAULT_GENERATIONS_PER_STEP
};

class CellularAutomaton {
    constructor(options) {
        Object.assign(this, defaultOptions);

        this.cells = new CellField(options.xSize, options.ySize);
        this.newCells = this.cells.clone();
        this.newCells._shift = this.cells._shift; // чтобы не заниматься синхронизацией, просто сделаем объект смещения общим

        this.view = new CellFieldView(this.cells, options.view);

        this.generations = new Generations({
            cells: {
                curr: this.cells,
                next: this.newCells
            },
            view: this.view
        });

        this.history = new History({
            cells: this.cells,
            generations: this.generations
        });

        this.generations.rule = options.ruleCode || Rules.get(options.ruleName || 'default');
    }

    resize(sizes = {}) {
        if (!isNaN(sizes.xSize) && !isNaN(sizes.ySize)) {
            if (this.cells.xSize !== sizes.xSize || this.cells.ySize !== sizes.ySize) {
                this.cells.resize(sizes.xSize, sizes.ySize);
                this.newCells.resize(sizes.xSize, sizes.ySize);
            }
        }

        this.view.resize(sizes.cellSide, sizes.cellBorder);
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

    start() {
        if (this._intervalID) {
            return false;
        }

        this._intervalID = setInterval(() => {
            this.generations.next(this.generationsPerStep);
            this.view.render();
        }, this.stepDuration);

        this.history.save();

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

        document.dispatchEvent(new CustomEvent('ca-stop', {
            detail: this
        }));

        return true;
    }

    back() {
        if (this.history.data) {
            this.stop();
            this.history.back();
            this.view.render();
        }
    }
}

export { CellField, CellFieldView, CellularAutomaton, Rules };
