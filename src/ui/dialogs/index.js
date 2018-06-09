const context = require.context('./', false, /dialog-[\w\-]+\.vue$/);

export default context.keys().reduce((dialogs, key) => {
  const dialog = context(key).default;

  return {
    ...dialogs,
    [dialog.name]: dialog
  }
}, {});
