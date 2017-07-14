var rules = (function() {
    var predefinedRules = [ {
        name: 'Conway\'s Life',
        code:
`makeTable(function(n) {
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
    return s === 3 ? 1 : (s === 2 ? n.center : 0);
});`
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
`function ready(n) {
    return n.center === 0 ? 1 : 0;
}

function stimulus(n) {
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
    return s === 2 ? 1 : 0;
}

makeTable(function(n) {
    var p0 = stimulus(n) & ready(n),
        p1 = n.center & 1;

    return (p1 << 1) | p0;
});`
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
        name: 'Parity',
        code:
`makeTable(function(n) {
    return n.north ^ n.south ^ n.west ^ n.east ^ (n.center & 1);
});`
    }, {
        name: '1 out of 8',
        code:
`makeTable(function(n) {
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
    return s === 1 ? 1 : n.center;
});`
    }, {
        name: 'Lichens with death',
        code:
`makeTable(function(n) {
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
    return (s === 3) ? 1 : (s === 4 ? 0 : n.center);
});`
    }, {
        name: 'Anneal',
        code:
`makeTable(function(n) {
    var s = (n.center & 1) + n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;
    return s > 5 || s === 4 ? 1 : 0;
});`
    }, {
        name: 'Anneal x 2',
        code:
`setNeighborhoods({
    main: 'Moore-thick'
});

view.setColors([ '000000', 'FF0000', '00FF00', 'FFFF00' ], true);

function sum(n, p) {
    return (
        !!(n.center & p) + !!(n.north & p) + !!(n.south & p) + !!(n.west & p) + !!(n.east & p) +
        !!(n.n_west & p) + !!(n.s_west & p) + !!(n.n_east & p) + !!(n.s_east & p)
    );
}

makeTable(function(n) {
    var s0 = sum(n, 1),
        s1 = sum(n, 2);

    return (s0 > 5 || s0 === 4 ? 1 : 0) | ((s1 > 5 || s1 === 4 ? 1 : 0) << 1);
});`,
    }, {
        name: 'Rand anneal',
        code:
`setNeighborhoods({
    main: 'Neumann'
});

makeTable(function(n) {
    var s = (n.center & 1) + (n.north & 1) + (n.south & 1) + (n.west & 1) + (n.east & 1),
        r = (+!!(2 & n.center & n.north & n.south & n.west & n.east)) ^ 1,
        p0 = [ 0, 0, r, +!r, 1, 1 ][s],
        p1 = (n.center & 2) ^ (n.north & 2) ^ (n.south & 2) ^ (n.west & 2) ^ (n.east & 2);

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
    var s = (n.center & 1) + (n.cw & 1) + (n.ccw & 1) + (n.opp & 1),
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
    var s = (n.center & 1) + (n.cw & 1) + (n.ccw & 1) + (n.opp & 1),
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

function bit(val) {
    return +!!(val & 2);
}

makeTable(function(n) {
    var p1 = bit(n.ccw) & bit(n.opp) ^ bit(n.cw) ^ bit(n.center),
        rand = bit(n.ccw) ^ bit(n.opp) ^ bit(n.cw) ^ bit(n.center);

    return ((rand ? n.cw : n.ccw) & 1) | (p1 << 1);
},  function(n) {
    return (n._center & 1) | n.center;
});`
    }, {
        name: '30',
        code: 'makeTable(rules.elementary(30));'
    }, {
        name: '110',
        code: 'makeTable(rules.elementary(110));'
    }, {
        name: '126',
        code: 'makeTable(rules.elementary(126));'
    }, {
        name: 'Cyclic',
        code:
`function main(n) {
    var t = (n.center + 1) & 15,
        s = (n.north === t) + (n.south === t) + (n.west === t) + (n.east === t);

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
            localStorage.removeItem('rules');
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

    return {
        elementary: function(ruleNumber) {
            ruleNumber = limitation(ruleNumber, 0, 255);

            return function(n) {
                var t = ((n.n_west & 1) << 2) + ((n.north & 1) << 1) + (n.n_east & 1);
                return ((ruleNumber & (1 << t)) ? 1 : 0) | n.center;
            };
        },
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
