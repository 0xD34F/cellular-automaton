function random(max, min) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min)) + min;
}

function CellField(x, y) {
    this.x_size = x;
    this.y_size = y;

    var t = this.data = new Array(x);
    for (var i = 0; i < x; i++) {
        t[i] = new Array(y);
    }

    /*this.fill(function() {
        return 0;
    });*/
}
CellField.prototype.fill = function(f) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            this.data[x][y] = f(x, y);
        }
    }
};
CellField.prototype.copy = function(cells) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            this.data[x][y] = cells.data[x][y];
        }
    }
};
CellField.prototype.draw = function(c, side) {
    for (var x = 0; x < this.x_size; x++) {
        for (var y = 0; y < this.y_size; y++) {
            c.fillStyle = this.data[x][y] ? '#FFF' : '#000';
            c.fillRect(x * side + 1, y * side + 1, side - 1, side - 1);
        }
    }
};


function makeStep(cells, newCells) {
    var d = cells.data,
        xSize = cells.x_size,
        ySize = cells.y_size;

    for (var x = 0; x < xSize; x++) {
        for (var y = 0; y < ySize; y++) {
            var xPrev = x === 0 ? xSize - 1 : x - 1,
                xNext = x === xSize - 1 ? 0 : x + 1,
                yPrev = y === 0 ? ySize - 1 : y - 1,
                yNext = y === ySize - 1 ? 0 : y + 1;

            var center = d[x][y],
                north  = d[x][yPrev],
                south  = d[x][yNext],
                west   = d[xPrev][y],
                east   = d[xNext][y],
                n_west = d[xPrev][yPrev],
                s_west = d[xPrev][yNext],
                n_east = d[xNext][yPrev],
                s_east = d[xNext][yNext];

            var s = north + south + west + east + n_west + s_west + n_east + s_east;

            newCells.data[x][y] = s === 3 ? 1 : (s === 2 ? center : 0);
        }
    }

    cells.copy(newCells);
}

window.onload = function() {
    var X_SIZE = 256,
        Y_SIZE = 256,
        SIDE = 3;

    var cells = new CellField(X_SIZE, Y_SIZE),
        newCells = new CellField(X_SIZE, Y_SIZE);

    cells.fill(function() {
        return random(2);
    });

    var cellsCanvas = document.getElementById('cells'),
        ctx = cellsCanvas.getContext('2d');

    cellsCanvas.width = ctx.width = X_SIZE * SIDE + 1;
    cellsCanvas.height = ctx.height = Y_SIZE * SIDE + 1;

    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, ctx.width, ctx.height);

    cells.draw(ctx, SIDE);

    var intervalID = null;
    document.getElementById('start').onclick = function() {
        if (!intervalID) {
            intervalID = setInterval(function() {
var timeStart = new Date();

                makeStep(cells, newCells);
                cells.draw(ctx, SIDE);

console.log(new Date() - timeStart);
            }, 50);
        } else {
            clearInterval(intervalID);
            intervalID = null;
        }

        this.innerHTML = intervalID ? 'Stop' : 'Start';
    };
};
