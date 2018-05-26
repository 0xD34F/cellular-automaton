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

const sizesMeta = [
  { name: 'xSize',      label: 'Field width',  min: X_SIZE_MIN,      max: X_SIZE_MAX, classes: [ 'ca-start-disable' ] },
  { name: 'ySize',      label: 'Field height', min: Y_SIZE_MIN,      max: Y_SIZE_MAX, classes: [ 'ca-start-disable' ] },
  { name: 'cellSide',   label: 'Cell side',    min: CELL_SIDE_MIN,   max: CELL_SIDE_MAX },
  { name: 'cellBorder', label: 'Cell border',  min: CELL_BORDER_MIN, max: CELL_BORDER_MAX }
];


export default {
  template: `
<div id="ca-field" title="Cells field">
  <fieldset id="ca-field-sizes">
    <legend>Sizes</legend>
    <table class="ca-options-table">
    ${sizesMeta.map(n => `
      <tr>
        <td>${n.label}</td>
        <td><input name="${n.name}" type="text" class="${(n.classes || []).join('')}"></td>
      </tr>
    `).join('')}
    </table>
  </fieldset>
  <fieldset id="ca-field-planes">
    <legend>Show bit planes</legend>
  </fieldset>
</div>`,
  width: 460,
  height: 380,
  create() {
    const $this = $(this);

    sizesMeta.forEach(n => $this.find(`[name="${n.name}"]`).spinner({
      min: n.min,
      max: n.max,
      step: 1
    }).filter('.ca-start-disable').closest('td').find('.ui-button').addClass('ca-start-disable'));

    $this
      .find('#ca-field-planes').append(bitPlanesListTemplate(ca.cells.curr.bitPlanesList))
      .find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
  },
  open() {
    const
      $this = $(this),
      sizes = ca.sizes();

    sizesMeta.forEach(n => $this.find(`[name="${n.name}"]`).val(sizes[n.name]));

    $this.find('.ca-bit-plane-cb').each(function(i) {
      this.checked = !!(ca.view.showBitPlanes & (1 << i));
    }).change();
  },
  ok() {
    ca.view.showBitPlanes = this.find('.ca-bit-plane-cb').toArray().reduce((planes, cb, i) => planes | (cb.checked << i), 0);

    const sizes = {};
    sizesMeta.forEach(n => {
      const $el = this.find(`[name="${n.name}"]`);
      if (!$el.hasClass('ui-state-disabled')) {
        sizes[n.name] = $el.val() | 0;
      }
    });

    ca.resize(sizes);
  }
};
