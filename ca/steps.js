var Steps = (function() {

    var MIN_DELAY = 1,
        MAX_DELAY = 10000,
        MIN_GENERATIONS = 1,
        MAX_GENERATIONS = 100;

    function self(options) {
        return Object.assign(Object.create(self.prototype), {
            _delay: 30,
            _generations: 1
        }, options, {
            intervalID: null
        });
    }

    self.prototype.start = function() {
        if (this.intervalID) {
            return false;
        }

        this.intervalID = setInterval(this.step.bind(this), this.duration);

        return true;
    };

    self.prototype.stop = function() {
        if (!this.intervalID) {
            return false;
        }

        clearInterval(this.intervalID);
        this.intervalID = null;

        return true;
    };

    Object.defineProperty(self.prototype, 'duration', {
        get: function() {
            return this._delay;
        },
        set: function(value) {
            this._delay = limitation(value, MIN_DELAY, MAX_DELAY);
            if (this.intervalID) {
                this.stop();
                this.start();
            }
        }
    });

    Object.defineProperty(self.prototype, 'generations', {
        get: function() {
            return this._generations;
        },
        set: function(value) {
            this._generations = limitation(value, this.MIN_GENERATIONS, this.MAX_GENERATIONS);
        }
    })

    return self;
})();