import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import rules from './rules/';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    rules,
  },
  plugins: [ createPersistedState({
    key: 'caVuex',
    paths: [ 'rules.userDefined' ],
  }) ],
});
