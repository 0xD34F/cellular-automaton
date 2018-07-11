import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import automaton from './automaton/';
import rules from './rules/';
import brush from './brush/';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    automaton,
    rules,
    brush,
  },
  plugins: [ createPersistedState({
    key: 'caVuex',
    paths: [ 'rules.userDefined' ],
  }) ],
});
