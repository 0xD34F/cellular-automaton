export default {

  X_SIZE: {
    min: 32,
    max: 1024
  },
  Y_SIZE: {
    min: 32,
    max: 1024
  },

  CELL_SIDE: {
    min: 1,
    max: 20
  },
  CELL_BORDER: {
    min: 0,
    max: 4
  },

  BRUSH_SIZE: 11,

  GENERATIONS_PER_STEP: {
    min: 1,
    max: 100,
    step: 1
  },
  STEP_DURATION: {
    min: 0,
    max: 5000,
    step: 10
  },

  SKIP_GENERATIONS: {
    min: 1,
    max: 10000
  },

  MAX_CELL_SIDE_WITH_OWN_RENDER: 20,

  DEFAULT_RULE: "Conway's Life",
  DEFAULT_X_SIZE: 256,
  DEFAULT_Y_SIZE: 256,
  DEFAULT_CELL_SIDE: 7,
  DEFAULT_CELL_BORDER: 1,
  DEFAULT_GENERATIONS_PER_STEP: 1,
  DEFAULT_STEP_DURATION: 30,
  DEFAULT_FILL_DENSITY: 0.5,

  DEFAULT_COLORS: {
    background: '#505050',
     0: '#000000',
     1: '#FFFFFF',
     2: '#666666',
     3: '#A8A8A8',
     4: '#FF0000',
     5: '#00FF00',
     6: '#0000FF',
     7: '#00FFFF',
     8: '#FF00FF',
     9: '#FFFF00',
    10: '#FF8080',
    11: '#80FF80',
    12: '#8080FF',
    13: '#FFFF80',
    14: '#FF80FF',
    15: '#80FFFF'
  },

};
