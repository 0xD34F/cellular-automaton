import { limitation } from '../utils';

const
    MIN_DELAY = 1,
    MAX_DELAY = 10000,
    MIN_GENERATIONS = 1,
    MAX_GENERATIONS = 100;

export default class Steps {

    constructor(options) {
        Object.assign(this, {
            _delay: 30,
            _generations: 1
        }, options, {
            intervalID: null
        });
    }

    start() {
        if (this.intervalID) {
            return false;
        }

        this.intervalID = setInterval(this.step.bind(this), this.duration);

        return true;
    }

    stop() {
        if (!this.intervalID) {
            return false;
        }

        clearInterval(this.intervalID);
        this.intervalID = null;

        return true;
    }

    get duration() {
        return this._delay;
    }
    set duration(value) {
        this._delay = limitation(value, MIN_DELAY, MAX_DELAY);
        if (this.intervalID) {
            this.stop();
            this.start();
        }
    }

    get generations() {
        return this._generations;
    }
    set generations(value) {
        this._generations = limitation(value, MIN_GENERATIONS, MAX_GENERATIONS);
    }
}
