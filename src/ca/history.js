class History {
    constructor(options) {
        Object.assign(this, options);

        this.data = null;
    }

    save() {
        this.data = {
            cells: this.cells.clone(),
            time: this.generations.time
        };
    }

    back() {
        if (this.data) {
            this.cells.conform(this.data.cells);
            this.generations.time = this.data.time;
            this.data = null;
        }
    }
}

export default History;
