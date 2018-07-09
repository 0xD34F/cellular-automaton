import predefined from './predefined';


const isPredefined = (name) => predefined.some(n => n.name === name);
const result = (status, message) => ({ status, message });


export default {
  state: {
    predefined,
    userDefined: [],
  },
  getters: {
    rules: state => [ ...state.predefined, ...state.userDefined ],
  },
  mutations: {
    addRule(state, rule) {
      state.userDefined.push(rule);
    },
    delRule(state, name) {
      state.userDefined = state.userDefined.filter(n => n.name !== name);
    },
  },
  actions: {
    saveRule({ commit }, { name, code }) {
      const errors = [
        !name && 'no rule name',
        !code && 'no rule code',
        isPredefined(name) && `predefined rule ("${name}") can not be rewritten`,
      ].filter(n => !!n);

      if (errors.length) {
        return result(false, errors.join('<br>'));
      }

      commit('delRule', name);
      commit('addRule', { name, code });

      return result(true, `rule "${name}" saved`);
    },
    deleteRule({ commit, state }, name) {
      if (!name) {
        return result(false, 'no rule name');
      }
      if (isPredefined(name)) {
        return result(false, `predefined rule ("${name}") can not be deleted`);
      }
      if (!state.userDefined.find(n => n.name === name)) {
        return result(false, `rule "${name}" not found`);
      }

      commit('delRule', name);

      return result(true, `rule "${name}" deleted`);
    },
  },
};
