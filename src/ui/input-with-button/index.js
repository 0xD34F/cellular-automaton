import './style.scss';


$.widget('custom.inputWithButton', {
  options: {
    icon: '',
    value: '',
    title: '',
    placeholder: '',
    click: $.noop
  },
  _create() {
    const {
      element,
      options
    } = this;

    element.addClass('input-with-button ui-controlgroup ui-corner-all ui-widget ui-widget-content');

    element.append(`
      <input class="ui-spinner-input">
      <button><span class="ui-icon ${options.icon}"></span></button>
    `);

    element.find('button').button().on('click', options.click.bind(element)).attr('title', options.title);
    element.find('input').val(options.value).attr('placeholder', options.placeholder);
  },
  value(val) {
    const $input = this.element.find('input');

    return val === undefined
      ? $input.val()
      : $input.val(val).end();
  }
});
