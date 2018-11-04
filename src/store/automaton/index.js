import * as CA from '@/ca/';
import config from 'config';


export default {
  state: {
    automaton: null,
    enabled: false,
    history: null,
  },
  getters: {
    ca: state => state.automaton,
    run: state => state.enabled,
  },
  mutations: {
    initCA(state, ca) {
      state.automaton = ca;
    },
    enable(state, enabled) {
      state.enabled = !!enabled;
    },
    updateHistory(state, history) {
      state.history = history;
    },
  },
  actions: {
    initCA({ commit, getters }, options) {
      const ca = new CA.CellularAutomaton({
        xSize: config.DEFAULT_X_SIZE,
        ySize: config.DEFAULT_Y_SIZE,
        ...options,
      });
      ca.rule = getters.rules.find(n => n.name === config.DEFAULT_RULE).code;

      commit('initCA', ca);
    },
    start({ commit, state, getters }) {
      if (state.automaton.start()) {
        commit('enable', true);
        commit('updateHistory', state.automaton.state);

        if (getters.viewOptions.mode === 'edit') {
          commit('setViewOptions', { mode: 'shift' });
        }
      }
    },
    stop({ commit, state }) {
      if (state.automaton.stop()) {
        commit('enable', false);
        commit('setViewOptions', { mode: 'edit' });
      }
    },
    skip({ commit, state }, numGenerations) {
      if (!state.enabled) {
        if (!state.history) {
          commit('updateHistory', state.automaton.state);
        }

        state.automaton.newGeneration(numGenerations);
      }
    },
    async back({ dispatch, commit, state }) {
      if (state.history) {
        await dispatch('stop');
        state.automaton.state = state.history;
        commit('updateHistory', null);
      }
    },
  },
};
