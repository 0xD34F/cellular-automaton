import './style.scss';


$.widget('custom.settingsTable', {
  options: {
    row: () => '<tr></tr>',
    meta: []
  },
  _create() {
    const op = this.options;

    this.element
      .addClass('ca-options-table')
      .append(op.meta.map(op.row));

    op.meta.filter(n => n.spinner).forEach(n => {
      this.element.find(`[name="${n.name}"]`).spinner(n.spinner);
    });
  },
  set(data) {
    const $el = this.element;

    this.options.meta.forEach(n => {
      const val = data[n.name];
      if (val !== undefined) {
        $el.find(`[name="${n.name}"]`).val(val);
      }
    });
  },
  get() {
    const
      $this = this.element,
      data = {};

    this.options.meta.forEach(n => {
      const $el = $this.find(`[name="${n.name}"]`);
      if (!$el.hasClass('ui-state-disabled')) {
        data[n.name] = $el.val() | 0;
      }
    });

    return data;
  }
});
