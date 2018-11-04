import baseDialog from './base/mixin.js';

const context = require.context('./', false, /dialog-[\w\-]+\.vue$/);

export default context.keys().reduce((dialogs, key) => ({
  ...dialogs,
  [key.match(/[\w\-]+/).pop()]: {
    mixins: [ baseDialog ],
    ...context(key).default,
  },
}), {});
