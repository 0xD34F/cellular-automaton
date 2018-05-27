import config from 'config';
import ca from 'ca';
import './style.scss';


const colorsListTemplate = colors => `
  <div class="ca-state-select">
    ${colors.map(n => `
    <div class="ca-state">
      <div>
        <span class="ca-state-name">${n.label}</span>
        <input type="text" class="jscolor" color-name="${n.color}" readonly="readonly">
      </div>
    </div>
    `).join('')}
  </div>`;

export default {
  template: `<div id="ca-colors" title="Colors"></div>`,
  width: 320,
  height: 420,
  create() {
    var $this = $(this);

    $this.append(colorsListTemplate($.map(ca.view.colors, (n, i) => ({
      color: i,
      label: isNaN(i) ? i : (+i).toString(16).toUpperCase()
    })))).find('.jscolor').each(function() {
      this.jscolor = new jscolor(this, {
        hash: true
      });
    });
  },
  open() {
    $(this).find('.jscolor').each(function() {
      var $this = $(this);
      $this.val(ca.view.colors[$this.attr('color-name')]);
      this.jscolor.importColor();
    });
  },
  ok() {
    var newColors = {};

    this.find('.jscolor').each(function() {
      var $this = $(this);
      newColors[$this.attr('color-name')] = $this.val();
    });

    ca.view.setColors(newColors, true);
  }
};
