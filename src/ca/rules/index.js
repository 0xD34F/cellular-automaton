import { limitation } from '../../utils';
import predefinedRules from './predefined';


let savedRules = null;
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
  const i = savedRules.findIndex(n => n.name === name);
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


const rules = {

  elementary: numberedRule(ruleNumber => n => {
    let t = ((n.n_west & 1) << 2) + ((n.north & 1) << 1) + (n.n_east & 1);

    return ((ruleNumber & (1 << t)) ? 1 : 0) | n.center;
  }, 8),

  totalistic2d5: numberedRule((ruleNumber, bitPlane = 0) => n => {
    let
      total = rules.sum(bitPlane, n.north, n.south, n.west, n.east),
      mask = 1 << bitPlane;

    return (ruleNumber & (1 << (total * 2 + !!(n.center & mask)))) ? m : 0;
  }, 10),

  totalistic2d9: numberedRule((ruleNumber, bitPlane = 0) => n => {
    let
      total = rules.sum(bitPlane, n.north, n.south, n.west, n.east, n.n_west, n.n_east, n.s_west, n.s_east),
      mask = 1 << bitPlane;

    return (ruleNumber & (1 << (total * 2 + !!(n.center & mask)))) ? mask : 0;
  }, 18),

  lifeLike(rule) {
    let
      bs = rule.split('/'),
      ruleNumber = 0;

    bs[0].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2));
    bs[1].slice(1).split('').forEach(n => ruleNumber |= (1 << n * 2 + 1));

    return rules.totalistic2d9(ruleNumber);
  },

  sum: (plane, ...values) => values.reduce((sum, val) => sum + ((val >> plane) & 1), 0),

  get(name) {
    let rules = [ ...predefinedRules, ...savedRules ];

    return name
      ? ((rules.find(n => n.name === name) || {}).code || '')
      : rules.filter(n => !n.hidden);
  },

  save(name, code) {
    let err = [
      !name && 'no rule name',
      !code && 'no rule code',
      isPredefined(name) && `predefined rule ("${name}") can not be rewritten`
    ].filter(n => !!n);

    if (err.length) {
      return result(false, err.join('<br>'));
    }

    deleteSaved(name);
    savedRules.push({ name, code });

    save();
    return result(true, `rule "${name}" saved`);
  },

  del(name) {
    if (!name) {
      return result(false, 'no rule name');
    }
    if (isPredefined(name)) {
      return result(false, `predefined rule ("${name}") can not be deleted`);
    }
    if (!deleteSaved(name)) {
      return result(false, `rule "${name}" not found`);
    }

    save();
    return result(true, `rule "${name}" deleted`);
  }

};

export default rules;
