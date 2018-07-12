const context = require.context('./', false, /dialog-[\w\-]+\.vue$/);

export default context.keys().reduce((dialogs, key) => ({
  ...dialogs,
  [key.match(/[\w\-]+/).pop()]: context(key).default,
}), {});
