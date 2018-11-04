import * as CA from '@/ca/';


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
    initCA(state, options) {
      state.automaton = new CA.CellularAutomaton(options);
    },
    enable(state, enabled) {
      state.enabled = !!enabled;
    },
    updateHistory(state, history) {
      state.history = history;
    },
  },
  actions: {
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
