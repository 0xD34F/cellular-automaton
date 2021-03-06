﻿export default [ {
  name: 'Conway\'s Life',
  code:
`makeTable(function(n) {
  var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
  return s === 3 ? 1 : (s === 2 ? n.center : 0);
});

// Same as:
// makeTable(rules.totalistic2d9(224));
// or:
// makeTable(rules.lifeLike('B3/S23'));`
}, {
  name: 'Conway\'s Life (trace)',
  code:
`makeTable(function(n) {
  var
    s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east,
    p0 = s === 3 ? 1 : (s === 2 ? n.center : 0),
    p1 = (+!!n.center) | p0;

  return p0 | (p1 << 1);
});`
}, {
  name: 'Forest fire',
  code:
`setNeighborhoods({
  name: 'prob',
  data: {
    treeBirth: 0.005,
    treeIgnite: 0.00001
  }
});

utils.setColors([ '000000', 'FF0000', '00FF00' ]);

makeTable(function(n) {
  var
    fire = 1 & (n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east),
    tree = n.center;

  if (tree === 2 && (fire || n.treeIgnite)) {
    return 1;
  }

  if (tree === 0 && n.treeBirth) {
    return 2;
  }

  return tree === 1 ? 0 : tree;
});`
}, {
  name: 'Brian\'s brain',
  code:
`var
  ready = n => n.center ? 0 : 1,
  stimulus = rules.totalistic2d9(48);

makeTable(n => (stimulus(n) & ready(n)) | ((n.center & 1) << 1));`
}, {
  name: 'Wireworld',
  code:
`setNeighborhoods('Moore-thick');

makeTable(function(n) {
  var s = (n.north === 1) + (n.south === 1) + (n.west === 1) + (n.east === 1) + (n.n_west === 1) + (n.s_west === 1) + (n.n_east === 1) + (n.s_east === 1);

  return [ 0, 2, 3, s === 1 || s === 2 ? 1 : 3 ][n.center];
});`
}, {
  name: 'Life-like',
  code:
`// see also: https://en.wikipedia.org/wiki/Life-like_cellular_automaton

var ruleCode = 

/* Replicator         */ // 'B1357/S1357'
/* Seeds              */ // 'B2/S'
/* Life without death */ // 'B3/S01234567'
/* Life               */ // 'B3/S23'
/* 34 Life            */ // 'B34/S34'
/* Diamoeba           */ // 'B35678/S5678'
/* 2x2                */  'B36/S125'
/* Highlife           */ // 'B36/S23'
/* Day & Night        */ // 'B3678/S34678'
/* Morley             */ // 'B368/S245'
/* Anneal             */ // 'B4678/S35678'

makeTable(rules.lifeLike(ruleCode))`
}, {
  name: 'Elementary',
  code:
`// see also: https://en.wikipedia.org/wiki/Elementary_cellular_automaton

var ruleID = 102;

makeTable(rules.elementary(ruleID));`
}, {
  name: 'Parity',
  code:
`setNeighborhoods('Neumann');

makeTable(n => n.north ^ n.south ^ n.west ^ n.east ^ n.center);

// Same rule, for one bit plane:
// makeTable(rules.totalistic2d5(614));`
}, {
  name: 'Anneal x 2',
  code:
`setNeighborhoods('Moore-thick');

utils.setColors([ '000000', 'FF0000', '00FF00', 'FFFF00' ]);

var
  ruleID = 260480,
  p0 = rules.totalistic2d9(ruleID, 0),
  p1 = rules.totalistic2d9(ruleID, 1);

makeTable(n => p0(n) | p1(n));`,
}, {
  name: 'Rand anneal',
  code:
`setNeighborhoods('Neumann');

makeTable(function(n) {
  var
    s = utils.sum(0, n.center, n.north, n.south, n.west, n.east),
    r = (+!!(2 & n.center & n.north & n.south & n.west & n.east)) ^ 1,
    p0 = [ 0, 0, r, +!r, 1, 1 ][s],
    p1 = 2 & (n.center ^ n.north ^ n.south ^ n.west ^ n.east);

  return p0 | p1;
});`
}, {
  name: 'Time tunnel',
  code:
`makeTable(function(n) {
  var
    s = (n.center & 1) + n.north + n.south + n.west + n.east,
    p0 = (s === 0 || s === 5 ? 0 : 1) ^ ((n.center & 2) >> 1),
    p1 = n.center & 1;

  return p0 | (p1 << 1);
});`
}, {
  name: 'Border / hollow',
  code:
`setNeighborhoods('phase');

function border(n) {
  return 1 & (n.center | n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east);
}

function hollow(n) {
  var t = 1 & n.north & n.south & n.west & n.east & n.n_west & n.n_east & n.s_west & n.s_east;
  return t ? 0 : n.center;
}

makeTable(n => n.phase & 1) ? hollow(n) : border(n));`
}, {
  name: 'Safe / pass',
  code:
`setNeighborhoods('Neumann');

makeTable(function(n) {
  var
    p0 = n.center & 1,
    p1 = n.center & 2;

  if (!p0) {
    if (!p1 && (n.north & 1)) {
      p0 = 1;
    }
  } else {
    if (!n.south) {
      p0 = 0;
    }
  }

  return p0 | p1;
});`
}, {
  name: 'Critters',
  code:
`setNeighborhoods('Margolus');

on.beforeNewGeneration = function() {
  utils.setColors(this.time & 1 ? [ '000000', 'FFFFFF' ] : [ 'FFFFFF', '000000' ], true);
};

makeTable(function(n) {
  var
    s = utils.sum(0, n.center, n.cw, n.ccw, n.opp),
    c = n.center ^ 1;

  return [ c, c, n.center & 1, n.opp ^ 1, c ][s];
});`
}, {
  name: 'Tron',
  code:
`setNeighborhoods('Margolus');

makeTable(function(n) {
  var
    s = utils.sum(0, n.center, n.cw, n.ccw, n.opp),
    c = n.center;

  return [ 1, c, c, c, 0 ][s];
});`
}, {
  name: 'Tube worms',
  code:
`setNeighborhoods('_center', '_center');

makeTable(function(n) {
  var
    s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east,
    alarm = [ 0, 0, 0, 1, 1, 1, 1, 1, 1 ][s];

  return ([ 1, 0, 0, 0 ][n._center]) | (alarm << 1);
}, function(n) {
  return n._center === 3 ? 3 : ([ 0, 0, 1, 2 ][n.center]);
});`
}, {
  name: 'Brownian',
  code:
`setNeighborhoods('Margolus', '_center');

makeTable(function(n) {
  var
    p1 = 2 & (n.ccw & n.opp ^ n.cw ^ n.center),
    rand = 2 & (n.ccw ^ n.opp ^ n.cw ^ n.center);

  return ((rand ? n.cw : n.ccw) & 1) | p1;
}, function(n) {
  return (n._center & 1) | n.center;
});`
}, {
  name: 'Cyclic',
  code:
`utils.setColors(utils.gradient('#FF0000', '#FFFF00', 16));

main = function(n) {
  var
    t = (n.center + 1) & 15,
    s = (n.north === t) + (n.south === t) + (n.west === t) + (n.east === t) + (n.n_west === t) + (n.n_east === t) + (n.s_west === t) + (n.s_east === t);

  return s ? t : n.center;
};`
}, {
  name: 'Steppers',
  code:
`// https://habr.com/post/237629/

setNeighborhoods('Moore-thick');
utils.setColors([ '#000000', '#27FFFF', '1C00FF' ]);

makeTable(function(n) {
  var
    _n = [ n.north, n.south, n.west, n.east, n.n_west, n.s_west, n.n_east, n.s_east ],
    alive = _n.filter(c => c !== 0).length;

  return [
    (alive === 3 && _n.filter(c => c === 2).length > 1) ? 1 : 0,
    2,
    ([2, 3].includes(alive) && _n.filter(c => c === 1).length < 2) ? 2 : 0
  ][n.center] || 0;
});`
}, ].map(n => ({ ...n, predefined: true }));
