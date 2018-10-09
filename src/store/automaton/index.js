import config from 'config';
import * as CA from '@/ca/';


const viewOptions = {
  scrollable: true,
  zoom: { ...config.CELL_SIDE },
  cellSizes: {
    cellSide: config.DEFAULT_CELL_SIDE,
    cellBorder: config.DEFAULT_CELL_BORDER,
  },
};


export default {
  state: {
    automaton: new CA.CellularAutomaton({
      xSize: config.DEFAULT_X_SIZE,
      ySize: config.DEFAULT_Y_SIZE,
    }),
    enabled: false,
    history: null,
    viewOptions,
  },
  getters: {
    ca: state => state.automaton,
    run: state => state.enabled,
  },
  mutations: {
    enable(state, enabled) {
      state.enabled = !!enabled;
    },
    updateHistory(state, history) {
      state.history = history;
    },
  },
  actions: {
    start({ commit, state }) {
      if (state.automaton.start()) {
        commit('enable', true);
        commit('updateHistory', state.automaton.state);
      }
    },
    stop({ commit, state }) {
      if (state.automaton.stop()) {
        commit('enable', false);
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
