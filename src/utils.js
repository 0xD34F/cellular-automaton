function rotateArray(array, rotate) {
  rotate -= array.length * Math.floor(rotate / array.length);
  array.push(...array.splice(0, rotate));
}

function limitation(val, { min, max }) {
  return Math.min(max, Math.max(min, val | 0));
}

function bitMask(size) {
  return Math.pow(2, size) - 1;
}

function bitPlaneSum(plane, ...values) {
  return values.reduce((sum, val) => sum + ((val >> plane) & 1), 0);
}

function getColorComponents(color, str) {
  return color.match(/(\w\w)+?/g).map(n => str ? n : parseInt(n, 16));
}

function transformColor(color) {
  return parseInt(getColorComponents(color, true).reverse().join(''), 16) | (0xFF << 24);
}

function gradient(colorFrom, colorTo, numSteps) {
  const
    from = getColorComponents(colorFrom),
    to = getColorComponents(colorTo),
    items = from.map((n, i) => (n - to[i]) / (numSteps - 1));

  return [...Array(numSteps)].map((n, i) => {
    return `#${from.map((m, j) => ((m - i * items[j]) | 0).toString(16).padStart(2, '0')).join('')}`;
  });
}

function getLineCoord(p0, p1) {
  let
    { x, y } = p0,
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

    const e2 = error * 2;
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

function logExecutionTime(message) {
  return function(target, key, descriptor) {
    const original = descriptor.value;

    descriptor.value = function(...args) {
      const
        start = performance.now(),
        result = original.apply(this, args);

      console.log(`${message}: ${performance.now() - start}`);

      return result;
    };

    return descriptor;
  };
}

export { rotateArray, limitation, bitMask, bitPlaneSum, getColorComponents, transformColor, gradient, getLineCoord, logExecutionTime };
