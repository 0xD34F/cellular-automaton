import config from 'config';
import { CellField } from '@/ca/';


const
  { BRUSH_SIZE } = config,
  center = BRUSH_SIZE / 2 | 0,
  field = new CellField(BRUSH_SIZE);

field.data[center][center] = 1;


export default {
  state: {
    field,
    defaultField: field.clone(),
  },
  getters: {
    brush: state => state.field,
    defaultBrush: state => state.defaultField,
  },
  actions: {
    updateBrush({ state }, source) {
      state.field.copy(source);
    },
  },
};
