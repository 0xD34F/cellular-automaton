import $ from 'jquery';
import ca from 'ca';


const modeList = [
  { name:  'edit', title:  'Edit', icon:  'pencil', classes: [ 'ca-start-disable' ] },
  { name: 'shift', title: 'Shift', icon: 'arrow-4' },
  { name: 'scale', title: 'Scale', icon:  'zoomin' }
];

const buttonTemplate = mode => `
  <input id="mode-${mode.name}" type="radio" name="mode" value="${mode.name}">
  <label for="mode-${mode.name}" title="${mode.scale}" class="${(mode.classes || []).join('')}">
    <span class="ui-icon ui-icon-${mode.icon}"></span>
  </label>
`;

function update() {
  $('#cell-field-mode').find(`[for="mode-${ca.view.mode}"]`).click();
}

export default {
  init() {
    $('#cell-field-mode')
      .append(modeList.map(buttonTemplate).join(''))
      .buttonset({
        items: 'input'
      })
      .find('.ui-checkboxradio-radio-label').removeClass('ui-checkboxradio-radio-label').end()
      .click(function(e) {
        var mode = $(e.target).val();
        if (mode && ca.view.mode !== mode) {
          ca.view.mode = mode;
        }
      })
      .find(`[for="mode-${ca.view.mode}"]`).click();

    $(document).on('cell-field-mode', function(e) {
      if (e.detail === ca.view) {
        update();
      }
    });

    update();
  }
};
