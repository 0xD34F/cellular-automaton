import config from 'config';
import ca, { CA } from 'ca';
import './style.scss';


const colorSelectTemplate = colors => colors.map(n => `
  <div class="ca-state" ca-state="${n.state}">
    <div>
      <span class="ca-state-name">${n.label}</span>
      <span class="ca-state-color" style="background-color: ${n.color}"></span>
    </div>
  </div>`).join('')

let
  brushField = null,
  brush = null;


export default {
  template: `
<div id="ca-brush" title="Brush">
  <div id="brush-wrapper" class="cells-field-wrapper"></div>
  <div class="ca-state-select"></div>
</div>`,
  width: 400,
  create() {
    const { BRUSH_SIZE } = config;
    ca.view.brush.resize(BRUSH_SIZE);
    ca.view.brush.data[BRUSH_SIZE / 2 | 0][BRUSH_SIZE / 2 | 0] = 1;

    brushField = ca.view.brush.clone();
    brush = new CA.CellFieldView({
      field: brushField,
      wrapper: '#brush-wrapper',
      cellSide: 12,
      cellBorder: 1,
      brush: new CA.CellField(1).fill(() => 1)
    });

    $(this).find('.ca-state-select').on('click', '.ca-state', function() {
      const $this = $(this);
      $this.parent().find('.ui-state-active').removeClass('ui-state-active');
      $this.addClass('ui-state-active');
      brush.brush.data[0][0] = +$this.attr('ca-state');
    });
  },
  open() {
    brushField.copy(ca.view.brush);
    brush.setColors(ca.view.colors, true);

    $(this).find('.ca-state-select').html(colorSelectTemplate($.map(brush.colors, function(n, i) {
      return isNaN(i) ? null : {
        label: (+i).toString(16).toUpperCase(),
        state: i,
        color: n
      };
    }))).find(`[ca-state="${brush.brush.data[0][0]}"]`).addClass('ui-state-active');
  },
  ok() {
    ca.view.brush.copy(brushField);
  }
};
