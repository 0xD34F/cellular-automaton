﻿var rules = (function() {
    var predefinedRules = [ {
        name: 'Conway\'s Life',
        code: 'function main(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s === 3 ? 1 : (s === 2 ? n.center : 0);\n\
}'
    }, {
        name: 'Brian\'s brain',
        code: 'function ready(n) {\n\
    return n.center === 0 ? 1 : 0;\n\
}\n\
\n\
function stimulus(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s === 2 ? 1 : 0;\n\
}\n\
\n\
function main(n) {\n\
    var p0 = stimulus(n) & ready(n),\n\
        p1 = n.center & 1;\n\
\n\
    return (p1 << 1) | p0;\n\
}'
    }, {
        name: 'Wireworld',
        code: 'setNeighborhoods({\n\
    main: \'Moore-thick\'\n\
});\n\
\n\
function main(n) {\n\
    var s = (n.north === 1) + (n.south === 1) + (n.west === 1) + (n.east === 1) + (n.n_west === 1) + (n.s_west === 1) + (n.n_east === 1) + (n.s_east === 1);\n\
\n\
    return ({\n\
        0: 0,\n\
        1: 2,\n\
        2: 3,\n\
        3: s === 1 || s === 2 ? 1 : 3\n\
    })[n.center];\n\
}'
    }, {
        name: 'Parity',
        code: 'function main(n) {\n\
    return n.north ^ n.south ^ n.west ^ n.east ^ (n.center & 1);\n\
}'
    }, {
        name: '1 out of 8',
        code: 'function main(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s === 1 ? 1 : n.center;\n\
}'
    }, {
        name: 'Lichens with death',
        code: 'function main(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return (s === 3) ? 1 : (s === 4 ? 0 : n.center);\n\
}'
    }, {
        name: 'Anneal',
        code: 'function main(n) {\n\
    var s = (n.center & 1) + n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s > 5 || s === 4 ? 1 : 0;\n\
}'
    }, {
        name: 'Rand anneal',
        code: 'setNeighborhoods({\n\
    main: \'Neumann\'\n\
});\n\
\n\
function rand(n) {\n\
  return (+!!((n.center & 2) && (n.north & 2) && (n.south & 2) && (n.west & 2) && (n.east & 2))) ^ 1;\n\
}\n\
\n\
function main(n) {\n\
    var s = (n.center & 1) + (n.north & 1) + (n.south & 1) + (n.west & 1) + (n.east & 1);\n\
\n\
    return ({\n\
        0: 0,\n\
        1: 0,\n\
        2: rand(n),\n\
        3: +!rand(n),\n\
        4: 1,\n\
        5: 1\n\
    })[s];\n\
}'
    }, {
        name: 'Time tunnel',
        code: 'function main(n) {\n\
    var s = (n.center & 1) + n.north + n.south + n.west + n.east,\n\
        p0 = (s === 0 || s === 5 ? 0 : 1) ^ ((n.center & 2) >> 1),\n\
        p1 = n.center & 1;\n\
\n\
    return p0 | (p1 << 1);\n\
}'
    }, {
        name: 'Border / hollow',
        code: 'setNeighborhoods({\n\
    extra: [\'phase\']\n\
});\n\
\n\
function border(n) {\n\
    return 1 & (n.center | n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east);\n\
}\n\
\n\
function hollow(n) {\n\
    var t = 1 & n.north & n.south & n.west & n.east & n.n_west & n.n_east & n.s_west & n.s_east;\n\
    return t ? 0 : n.center;\n\
}\n\
\n\
function main(n) {\n\
    return (n.phase & 1) ? hollow(n) : border(n);\n\
}'
    }, {
        name: 'Safe / pass',
        code: 'setNeighborhoods({\n\
    main: \'Neumann\'\n\
});\n\
\n\
function main(n) {\n\
    var p0 = n.center & 1,\n\
        p1 = n.center & 2;\n\
\n\
    if (!p0) {\n\
        if (!p1 && (n.north & 1)) {\n\
            p0 = 1;\n\
        }\n\
    } else {\n\
        if (!n.south) {\n\
            p0 = 0;\n\
        }\n\
    }\n\
\n\
    return p0 | p1;\n\
}'
    }, {
        name: '30',
        code: 'var main = elementary(30);'
    }, {
        name: '110',
        code: 'var main = elementary(110);'
    }, {
        name: '126',
        code: 'var main = elementary(126);'
    } ].map(function(n) {
        n.predefined = true;
        return n;
    });

    var savedRules = null;
    try {
        savedRules = JSON.parse(localStorage.rules);
    } catch (e) {}
    savedRules = savedRules instanceof Array ? savedRules : [];

    function save() {
        if (savedRules.length) {
            localStorage.rules = JSON.stringify(savedRules);
        } else {
            localStorage.removeItem('rules');
        }
    }

    return {
        add: function(name, code) {
            for (var i = 0; i < predefinedRules.length; i++) {
                if (predefinedRules[i].name === name) {
                    return false;
                }
            }

            for (i = 0; i < savedRules.length; i++) {
                if (savedRules[i].name === name) {
                    savedRules.splice(i, 1);
                    break;
                }
            }

            savedRules.push({
                name: name,
                code: code
            });

            save();

            return true;
        },
        del: function(name) {
            for (var i = 0; i < savedRules.length; i++) {
                if (savedRules[i].name === name) {
                    savedRules.splice(i, 1);
                    save();
                    return true;
                }
            }

            return false;
        },
        saved: function() {
            return savedRules;
        },
        predefined: function() {
            return predefinedRules;
        }
    };
})();
