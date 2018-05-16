var neighborhood = {
    base: [
        { name: 'center', size: 2, code: 'dXCurr[y]' }
    ],
    main: {
        Neumann: [
            { name: 'north', size: 2, code: 'dXCurr[yPrev]' },
            { name: 'south', size: 2, code: 'dXCurr[yNext]' },
            { name:  'west', size: 2, code: 'dXPrev[y]' },
            { name:  'east', size: 2, code: 'dXNext[y]' }
        ],
        Moore: [
            { name:  'north', size: 1, code: 'dXCurr[yPrev]' },
            { name:  'south', size: 1, code: 'dXCurr[yNext]' },
            { name:   'west', size: 1, code: 'dXPrev[y]' },
            { name:   'east', size: 1, code: 'dXNext[y]' },
            { name: 'n_west', size: 1, code: 'dXPrev[yPrev]' },
            { name: 's_west', size: 1, code: 'dXPrev[yNext]' },
            { name: 'n_east', size: 1, code: 'dXNext[yPrev]' },
            { name: 's_east', size: 1, code: 'dXNext[yNext]' }
        ],
        Margolus: [
            { name:  'cw', size: 2, code: 't ? (h ^ v ? (h ? dXNext : dXPrev) : dXCurr)[h ^ v ? y : (v ? yNext : yPrev)] : (h ^ v ? (h ? dXPrev : dXNext) : dXCurr)[h ^ v ? y : (v ? yPrev : yNext)]' },
            { name: 'ccw', size: 2, code: 't ? (h ^ v ? dXCurr : (h ? dXNext : dXPrev))[h ^ v ? (v ? yNext : yPrev) : y] : (h ^ v ? dXCurr : (h ? dXPrev : dXNext))[h ^ v ? (v ? yPrev : yNext) : y]' },
            { name: 'opp', size: 2, code: 't ? (h ? dXNext : dXPrev)[v ? yNext : yPrev] : (h ? dXPrev : dXNext)[v ? yPrev : yNext]' }
        ]
    },
    extra: {
        phase: [
            { name: 'phase', size: 2, code: 'time' }
        ],
        hv: [
            { name: 'horz', size: 1, code: 'h' },
            { name: 'vert', size: 1, code: 'v' }
        ],
        prob: data => Object.entries(data).map(([ name, probability ]) => ({
            name,
            size: 1,
            code: `(Math.random() < ${probability})`
        }))
    }
};
neighborhood.main['Moore-thick'] = neighborhood.main.Moore.map(n => ({ ...n, size: 2 }));

export default neighborhood;
