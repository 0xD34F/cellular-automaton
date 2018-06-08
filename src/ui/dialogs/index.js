import $ from 'jquery';

import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/themes/base/dialog.css';


$.widget('ui.confirmDialog', $.ui.dialog, {
  options: {
    modal: true,
    autoOpen: false,
    resizable: false
  },
  _closeDialog(f) {
    return function() {
      const
        $this = $(this),
        run = f instanceof Function ? f.apply($this, arguments) : true;

      $.when(run).always(function(result) {
        if (result !== false) {
          $this.confirmDialog('close');
        }
      });
    };
  },
  _create() {
    this.options.buttons = {
      OK: this._closeDialog(this.options.ok || null),
      Cancel: this._closeDialog(this.options.cancel || null)
    };

    return this._super();
  },
  open() {
    this._super();
    this.overlay.on('click', () => this.element.confirmDialog('close'));

    return this;
  }
});


const
  context = require.context('./', true, /dialog-[\w\-]+((\.js)|(\/))$/),
  dialogsList = context.keys().map(key => context(key).default);

export default {
  init() {
    dialogsList.forEach(n => $(n.template).appendTo('body').confirmDialog(n));
  }
};


const vueDialogsContext = require.context('./', false, /dialog-[\w\-]+\.vue$/);

export const dialogs = vueDialogsContext.keys().reduce((dialogs, key) => {
  const dialog = vueDialogsContext(key).default;

  return {
    ...dialogs,
    [dialog.name]: dialog
  }
}, {});
