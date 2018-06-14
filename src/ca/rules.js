import { limitation } from 'utils';


function numberedRule(rule, bitSize) {
  const
    min = 0,
    max = Math.pow(2, bitSize) - 1;

  return function(ruleNumber, ...rest) {
    if (ruleNumber !== limitation(ruleNumber, { min, max })) {
      throw `incorrect rule number (${JSON.stringify(ruleNumber)}), must be between ${min} and ${max}`;
    }

    return rule(ruleNumber, ...rest);
  };
}


const rules = {

  elementary: numberedRule(ruleNumber => n => {
    const t = ((n.n_west & 1) << 2) + ((n.north & 1) << 1) + (n.n_east & 1);

    return ((ruleNumber & (1 << t)) ? 1 : 0) | n.center;
  }, 8),

  totalistic2d5: numberedRule((ruleNumber, bitPlane = 0) => n => {
    const
      total = rules.sum(bitPlane, n.north, n.south, n.west, n.east),
      mask = 1 << bitPlane;

    return (ruleNumber & (1 << (total * 2 + !!(n.center & mask)))) ? m : 0;
  }, 10),

  totalistic2d9: numberedRule((ruleNumber, bitPlane = 0) => n => {
    const
      total = rules.sum(bitPlane, n.north, n.south, n.west, n.east, n.n_west, n.n_east, n.s_west, n.s_east),
      mask = 1 << bitPlane;

    return (ruleNumber & (1 << (total * 2 + !!(n.center & mask)))) ? mask : 0;
  }, 18),

  lifeLike(rule) {
    if (!rule.match(/^B\d*\/S\d*$/)) {
      throw `rules.lifeLike: wrong rule name: ${rule}`;
    }

    const bs = rule.split('/');
    let ruleNumber = 0;

    bs[0].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2));
    bs[1].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2 + 1));

    return rules.totalistic2d9(ruleNumber);
  },

  sum: (plane, ...values) => values.reduce((sum, val) => sum + ((val >> plane) & 1), 0),

};

export default rules;
