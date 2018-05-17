import config from 'config';
import ca from 'ca';
import { limitation } from 'utils';


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

const bitPlanesListTemplate = bitPlanes => `
  <table class="ca-options-table">
    ${bitPlanes.map(n => `
    <tr>
      <td class="ca-bit-plane">${n}</td>
      <td class="ca-bit-plane">
        <input type="checkbox" id="ca-show-plane-${n}" class="ca-bit-plane-cb">
        <label for="ca-show-plane-${n}"></label>
      </td>
    </tr>
    `).join('')}
  </table>`;


export default {
  template: `
<div id="ca-field" title="Cells field">
  <fieldset id="ca-field-sizes">
    <legend>Sizes</legend>
    <table class="ca-options-table">
      <tr><td>Field width</td><td><input id="ca-field-x-size" type="text" class="ca-start-disable"></td></tr>
      <tr><td>Field height</td><td><input id="ca-field-y-size" type="text" class="ca-start-disable"></td></tr>
      <tr><td>Cell side</td><td><input id="ca-field-cell-side" type="text"></td></tr>
      <tr><td>Cell border</td><td><input id="ca-field-cell-border" type="text"></td></tr>
    </table>
  </fieldset>
  <fieldset id="ca-field-planes">
    <legend>Show bit planes</legend>
  </fieldset>
</div>`,
  width: 460,
  height: 380,
  create() {
    var $this = $(this);

    [
      [ '#ca-field-x-size',      X_SIZE_MIN,      X_SIZE_MAX ],
      [ '#ca-field-y-size',      Y_SIZE_MIN,      Y_SIZE_MAX ],
      [ '#ca-field-cell-side',   CELL_SIDE_MIN,   CELL_SIDE_MAX ],
      [ '#ca-field-cell-border', CELL_BORDER_MIN, CELL_BORDER_MAX ]
    ].forEach(n => $this.find(n[0]).spinner({
      min: n[1],
      max: n[2],
      step: 1
    }).filter('.ca-start-disable').closest('td').find('.ui-button').addClass('ca-start-disable'));

    $this
      .find('#ca-field-planes').append(bitPlanesListTemplate(ca.cells.curr.getBitPlanes()))
      .find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
  },
  open() {
    $(this)
      .find('#ca-field-x-size').val(ca.cells.curr.xSize).end()
      .find('#ca-field-y-size').val(ca.cells.curr.ySize).end()
      .find('#ca-field-cell-side').val(ca.view.cellSide).end()
      .find('#ca-field-cell-border').val(ca.view.cellBorder).end()
      .find('.ca-bit-plane-cb').each(function(i) {
        this.checked = !!(ca.view.showBitPlanes & (1 << i));
      }).change();
  },
  ok() {
    ca.view.showBitPlanes = this.find('.ca-bit-plane-cb').toArray().reduce((planes, cb, i) => planes | (cb.checked << i), 0);

    ca.resize({
      xSize: limitation(this.find('#ca-field-x-size').val(), X_SIZE_MIN, X_SIZE_MAX),
      ySize: limitation(this.find('#ca-field-y-size').val(), Y_SIZE_MIN, Y_SIZE_MAX),
      cellSide: limitation(this.find('#ca-field-cell-side').val(), CELL_SIDE_MIN, CELL_SIDE_MAX),
      cellBorder: limitation(this.find('#ca-field-cell-border').val(), CELL_BORDER_MIN, CELL_BORDER_MAX)
    });
  }
};
