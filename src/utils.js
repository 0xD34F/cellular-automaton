function rotateArray(array, rotate) {
    rotate -= array.length * Math.floor(rotate / array.length);
    array.push(...array.splice(0, rotate));
};

function limitation(val, min, max) {
    return Math.min(max, Math.max(min, val >> 0));
};

function bitMask(size) {
    return Math.pow(2, size) - 1;
};

function getColorComponents(color) {
    return [ 1, 3, 5 ].map(n => parseInt(color.slice(n, n + 2), 16));
}

function transformColor(color) {
    return (parseInt(color.slice(5) + color.slice(3, 5) + color.slice(1, 3), 16)) | (0xFF << 24);
}

function getLineCoord(p0, p1) {
    var x = p0.x,
        y = p0.y,
        dx = Math.abs(x - p1.x),
        dy = Math.abs(y - p1.y),
        sx = (x < p1.x) ? 1 : -1,
        sy = (y < p1.y) ? 1 : -1,
        error = dx - dy,
        coord = [];

    while (true) {
        coord.push({ x, y });

        if ((x === p1.x) && (y === p1.y)) {
            break;
        }

        var e2 = error * 2;
        if (e2 > -dy) {
            error -= dy;
            x += sx;
        }
        if (e2 < dx) {
            error += dx;
            y += sy;
        }
    }

    return coord;
}

export { rotateArray, limitation, bitMask, getColorComponents, transformColor, getLineCoord };
