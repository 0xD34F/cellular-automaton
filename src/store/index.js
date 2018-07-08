import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import automaton from './automaton/';
import rules from './rules/';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    automaton,
    rules,
  },
  plugins: [ createPersistedState({
    key: 'caVuex',
    paths: [ 'rules.userDefined' ],
  }) ],
});
