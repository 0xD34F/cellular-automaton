var rules = (function() {
    var predefinedRules = [ {
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
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east,
        p0 = s === 3 ? 1 : (s === 2 ? n.center : 0),
        p1 = (+!!n.center) | p0;

    return p0 | (p1 << 1);
});`
    }, {
        name: 'Forest fire',
        code:
`setNeighborhoods({
    extra: [ {
        name: 'prob',
        data: [ 0.00001, 0.005 ]
    } ]
});

view.setColors([ '000000', 'FF0000', '00FF00' ], true);

makeTable(function(n) {
    var fire = 1 & (n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east),
        tree = n.center,
        treeIgnite = n.prob & 1,
        treeBirth = n.prob & 2;

    if (tree === 2 && (fire || treeIgnite)) {
        return 1;
    }

    if (tree === 0 && treeBirth) {
        return 2;
    }

    return tree === 1 ? 0 : tree;
});`
    }, {
        name: 'Brian\'s brain',
        code:
`var ready = n => n.center ? 0 : 1,
    stimulus = rules.totalistic2d9(48);

makeTable(n => (stimulus(n) & ready(n)) | ((n.center & 1) << 1));`
    }, {
        name: 'Wireworld',
        code:
`setNeighborhoods({
    main: 'Moore-thick'
});

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
`setNeighborhoods({
    main: 'Neumann'
});

makeTable(function(n) {
    return n.north ^ n.south ^ n.west ^ n.east ^ n.center;
});

// Same rule, for one bit plane:
// makeTable(rules.totalistic2d5(614));`
    }, {
        name: 'Anneal x 2',
        code:
`setNeighborhoods({
    main: 'Moore-thick'
});

view.setColors([ '000000', 'FF0000', '00FF00', 'FFFF00' ], true);

var ruleID = 260480,
    p0 = rules.totalistic2d9(ruleID, 0),
    p1 = rules.totalistic2d9(ruleID, 1);

makeTable(n => p0(n) | p1(n));`,
    }, {
        name: 'Rand anneal',
        code:
`setNeighborhoods({
    main: 'Neumann'
});

makeTable(function(n) {
    var s = rules.sum(0, n.center, n.north, n.south, n.west, n.east),
        r = (+!!(2 & n.center & n.north & n.south & n.west & n.east)) ^ 1,
        p0 = [ 0, 0, r, +!r, 1, 1 ][s],
        p1 = 2 & (n.center ^ n.north ^ n.south ^ n.west ^ n.east);

    return p0 | p1;
});`
    }, {
        name: 'Time tunnel',
        code:
`makeTable(function(n) {
    var s = (n.center & 1) + n.north + n.south + n.west + n.east,
        p0 = (s === 0 || s === 5 ? 0 : 1) ^ ((n.center & 2) >> 1),
        p1 = n.center & 1;

    return p0 | (p1 << 1);
});`
    }, {
        name: 'Border / hollow',
        code:
`setNeighborhoods({
    extra: ['phase']
});

function border(n) {
    return 1 & (n.center | n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east);
}

function hollow(n) {
    var t = 1 & n.north & n.south & n.west & n.east & n.n_west & n.n_east & n.s_west & n.s_east;
    return t ? 0 : n.center;
}

makeTable(function(n) {
    return (n.phase & 1) ? hollow(n) : border(n);
});`
    }, {
        name: 'Safe / pass',
        code:
`setNeighborhoods({
    main: 'Neumann'
});

makeTable(function(n) {
    var p0 = n.center & 1,
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
`setNeighborhoods({
    main: 'Margolus'
});

beforeNewGeneration = function() {
    view.setColors(time & 1 ? [ '000000', 'FFFFFF' ] : [ 'FFFFFF', '000000' ]);
};

makeTable(function(n) {
    var s = rules.sum(0, n.center, n.cw, n.ccw, n.opp),
        c = n.center ^ 1;

    return [ c, c, n.center & 1, n.opp ^ 1, c ][s];
});`
    }, {
        name: 'Tron',
        code:
`setNeighborhoods({
    main: 'Margolus'
});

makeTable(function(n) {
    var s = rules.sum(0, n.center, n.cw, n.ccw, n.opp),
        c = n.center;

    return [ 1, c, c, c, 0 ][s];
});`
    }, {
        name: 'Tube worms',
        code:
`setNeighborhoods({
    extra: ['_center']
}, {
    extra: ['_center']
});

makeTable(function(n) {
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east,
        alarm = [ 0, 0, 0, 1, 1, 1, 1, 1, 1 ][s];

    return ([ 1, 0, 0, 0 ][n._center]) | (alarm << 1);
},  function(n) {
    return n._center === 3 ? 3 : ([ 0, 0, 1, 2 ][n.center]);
});`
    }, {
        name: 'Brownian',
        code:
`setNeighborhoods({
    main: 'Margolus'
}, {
    extra: ['_center']
});

steps.duration = 1;
steps.generations = 8;

makeTable(function(n) {
    var p1 = 2 & (n.ccw & n.opp ^ n.cw ^ n.center),
        rand = 2 & (n.ccw ^ n.opp ^ n.cw ^ n.center);

    return ((rand ? n.cw : n.ccw) & 1) | p1;
},  function(n) {
    return (n._center & 1) | n.center;
});`
    }, {
        name: 'Cyclic',
        code:
`view.setColors(view.gradient('#FF0000', '#FFFF00'), true);

function main(n) {
    var t = (n.center + 1) & 15,
        s = (n.north === t) + (n.south === t) + (n.west === t) + (n.east === t) + (n.n_west === t) + (n.n_east === t) + (n.s_west === t) + (n.s_east === t);

    return s ? t : n.center;
}`
    } ].map(n => Object.assign(n, { predefined: true }));


    var savedRules = null;
    try {
        savedRules = JSON.parse(localStorage.rules);
    } catch (e) {}
    savedRules = Array.isArray(savedRules) ? savedRules : [];

    function save() {
        if (savedRules.length) {
            localStorage.rules = JSON.stringify(savedRules);
        } else {
            delete localStorage.rules;
        }
    }

    function isPredefined(name) {
        return predefinedRules.some(n => n.name === name);
    }

    function deleteSaved(name) {
        var i = savedRules.findIndex(n => n.name === name);
        if (i === -1) {
            return false;
        }

        savedRules.splice(i, 1);
        return true;
    }

    function result(status, message) {
        return { status, message };
    }

    function numberedRule(rule, max) {
        return (ruleNumber, ...rest) => rule(limitation(ruleNumber, 0, Math.pow(2, max) - 1), ...rest);
    }

    return {
        elementary: numberedRule(ruleNumber => function(n) {
            var t = ((n.n_west & 1) << 2) + ((n.north & 1) << 1) + (n.n_east & 1);
            return ((ruleNumber & (1 << t)) ? 1 : 0) | n.center;
        }, 8),
        totalistic2d5: numberedRule((ruleNumber, bitPlane = 0) => function(n) {
            var s = rules.sum(bitPlane, n.north, n.south, n.west, n.east),
                m = 1 << bitPlane;

            return (ruleNumber & (1 << (s * 2 + !!(n.center & m)))) ? m : 0;
        }, 10),
        totalistic2d9: numberedRule((ruleNumber, bitPlane = 0) => function(n) {
            var s = rules.sum(bitPlane, n.north, n.south, n.west, n.east, n.n_west, n.n_east, n.s_west, n.s_east),
                m = 1 << bitPlane;

            return (ruleNumber & (1 << (s * 2 + !!(n.center & m)))) ? m : 0;
        }, 18),
        lifeLike: function(rule) {
            var bs = rule.split('/');
                ruleNumber = 0;

            bs[0].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2));
            bs[1].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2 + 1));

            return rules.totalistic2d9(ruleNumber);
        },
        sum: (plane, ...values) => values.reduce((p, c) => p + ((c >> plane) & 1), 0),
        get: function(name) {
            var rules = predefinedRules.concat(savedRules);

            return name ? ((rules.find(n => n.name === name) || {}).code || '') : rules;
        },
        save: function(name, code) {
            var err = [];
            if (!name) {
                err.push('no rule name');
            }
            if (!code) {
                err.push('no rule code');
            }
            if (isPredefined(name)) {
                err.push('predefined rule ("' + name +'") can not be rewritten');
            }
            if (err.length) {
                return result(false, err.join('<br>'));
            }

            deleteSaved(name);

            savedRules.push({ name, code });

            save();
            return result(true, 'rule "' + name + '" saved');
        },
        del: function(name) {
            if (!name) {
                return result(false, 'no rule name');
            }
            if (isPredefined(name)) {
                return result(false, 'predefined rule ("' + name +'") can not be deleted');
            }

            if (!deleteSaved(name)) {
                return result(false, 'rule "' + name + '" not found');
            }

            save();
            return result(true, 'rule "' + name + '" deleted');
        }
    };
})();
