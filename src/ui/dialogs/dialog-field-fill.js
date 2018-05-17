import config from 'config';
import ca from 'ca';


const bitPlanesListTemplate = bitPlanes => `
  <table class="ca-options-table" style="table-layout: fixed;">
    <tr>
      <th width="65px">Bit plane</th>
      <th width="100px">Method</th>
      <th width="185px"></th>
      <th width="35px">Fill</th>
    </tr>
    ${bitPlanes.map(n => `
    <tr data-bit-plane="${n}">
      <td class="ca-bit-plane">${n}</td>
      <td>
        <select class="ca-filling-method" dir="rtl">
          <option value="random">Random</option>
          <option value="copy">Copy</option>
          <option value="invert">Invert</option>
          <option value="all1">All 1</option>
          <option value="all0">All 0</option>
        </select>
      </td>
      <td class="ca-filling-options">
        <div class="ca-filling-random">
          <span class="ca-filling-options-note">density, ‰</span>
          <input type="text">
        </div>
        <div class="ca-filling-copy">
          <span class="ca-filling-options-note">from plane</span>
          <input type="text" readonly="readonly">
        </div>
      </td>
      <td class="ca-bit-plane">
        <input type="checkbox" id="ca-filling-fill-plane-${n}" class="ca-bit-plane-cb">
        <label for="ca-filling-fill-plane-${n}"></label>
      </td>
    </tr>
    `).join('')}
  </table>`;


export default {
  template: '<div id="ca-filling" title="Cells field filling"></div>',
  width: 480,
  create() {
    const
      planesList = ca.cells.curr.getBitPlanes(),
      planesHTML = bitPlanesListTemplate(planesList),
      max = ca.cells.curr.randomFillDensityDescritization;

    $(this).append(planesHTML).find('.ca-filling-random > input').spinner({
      min: 0,
      max: max,
      step: 1
    }).val(max * config.DEFAULT_FILL_DENSITY | 0).end().find('select').selectmenu({
      width: 100
    }).on('selectmenuchange', function(e, ui) {
      $(this).closest('tr').find('.ca-filling-options').find('>').hide().end().find(`.ca-filling-${ui ? ui.item.value : this.value}`).show();
    }).trigger('selectmenuchange').end().find('.ca-filling-copy > input').autocomplete({
      source(request, response) {
        const ownPlane = +this.element.closest('tr').attr('data-bit-plane');

        response(planesList.filter(n => n !== ownPlane).map(n => n.toString()));
      }
    }).end().find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
  },
  ok() {
    const
      invert = [],
      random = {},
      copy = {};

    this.find('.ca-bit-plane-cb:checked').each(function() {
      const
        $tr = $(this).closest('tr'),
        plane = $tr.attr('data-bit-plane');

      switch ($tr.find('.ca-filling-method').val()) {
        case 'invert': invert.push(plane); break;
        case   'all1': random[plane] = ca.cells.curr.randomFillDensityDescritization; break;
        case   'all0': random[plane] = 0; break;
        case 'random': random[plane] = $tr.find('.ca-filling-random input').val(); break;
        case   'copy': copy[plane] = $tr.find('.ca-filling-copy input').val(); break;
      }
    });

    ca.fill({ invert, random, copy });
  }
};
