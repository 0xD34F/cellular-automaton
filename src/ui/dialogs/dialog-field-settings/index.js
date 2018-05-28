import config from 'config';
import ca from 'ca';
import './style.scss';


const {
  X_SIZE_MIN,
  Y_SIZE_MIN,
  X_SIZE_MAX,
  Y_SIZE_MAX,
  CELL_SIDE_MIN,
  CELL_SIDE_MAX,
  CELL_BORDER_MIN,
  CELL_BORDER_MAX,
} = config;

const bitPlanesOptions = {
  meta: ca.cells.curr.bitPlanesList,
  row: r =>
    `<tr>
      <td class="center">${r}</td>
      <td class="center">
        <input type="checkbox" id="ca-show-plane-${r}" class="ca-bit-plane-cb">
        <label for="ca-show-plane-${r}"></label>
      </td>
    </tr>`
}

const sizesOptions = {
  meta: [
    { name: 'xSize',      label: 'Field width',  spinner: { min: X_SIZE_MIN,      max: X_SIZE_MAX }, classes: 'ca-start-disable' },
    { name: 'ySize',      label: 'Field height', spinner: { min: Y_SIZE_MIN,      max: Y_SIZE_MAX }, classes: 'ca-start-disable' },
    { name: 'cellSide',   label: 'Cell side',    spinner: { min: CELL_SIDE_MIN,   max: CELL_SIDE_MAX } },
    { name: 'cellBorder', label: 'Cell border',  spinner: { min: CELL_BORDER_MIN, max: CELL_BORDER_MAX } }
  ],
  row: r =>
    `<tr>
      <td>${r.label}</td>
      <td>
        <input name="${r.name}" type="text" class="${r.classes || ''}">
      </td>
    </tr>`
};


export default {
  template: `
<div id="ca-field" title="Cells field">
  <fieldset id="ca-field-sizes">
    <legend>Sizes</legend>
  </fieldset>
  <fieldset id="ca-field-planes">
    <legend>Show bit planes</legend>
  </fieldset>
</div>`,
  width: 460,
  height: 380,
  create() {
    const $this = $(this);

    $this
      .find('#ca-field-sizes').append($('<table />').settingsTable(sizesOptions))
      .find('.ca-start-disable').closest('td').find('.ui-button').addClass('ca-start-disable');

    $this
      .find('#ca-field-planes').append($('<table />').settingsTable(bitPlanesOptions))
      .find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
  },
  open() {
    const $this = $(this);

    $this.find('#ca-field-sizes table').settingsTable('set', ca.sizes());

    $this.find('.ca-bit-plane-cb').each(function(i) {
      this.checked = !!(ca.view.showBitPlanes & (1 << i));
    }).change();
  },
  ok() {
    ca.view.showBitPlanes = this.find('.ca-bit-plane-cb').toArray().reduce((planes, cb, i) => planes | (cb.checked << i), 0);

    ca.resize(this.find('#ca-field-sizes table').settingsTable('get'));
  }
};
