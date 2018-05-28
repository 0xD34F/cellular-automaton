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

    element
      .val(options.value).attr('placeholder', options.placeholder)
      .wrap('<div class="input-with-button ui-controlgroup ui-corner-all ui-widget ui-widget-content"></div>')
      .parent().append(`<button><span class="ui-icon ${options.icon}"></span></button>`)
      .find('button').button().on('click', options.click.bind(element)).attr('title', options.title);
  }
});
