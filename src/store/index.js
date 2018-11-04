import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';


Vue.use(Vuex);


const context = require.context('./', true, /\w+\/index.js$/);
const modules = context.keys().reduce((modules, key) => ({
  ...modules,
  [key.match(/\w+/).pop()]: context(key).default,
}), {});


export default new Vuex.Store({
  modules,
  plugins: [ createPersistedState({
    key: 'caVuex',
    paths: [ 'rules.userDefined' ],
  }) ],
});
