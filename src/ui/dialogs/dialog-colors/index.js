import config from 'config';
import ca from 'ca';
import './style.scss';


export default {
  template: `
<div id="ca-colors" title="Colors">
  <div class="ca-state-select">
    ${Object.keys(ca.view.colors).map(n => `
    <div class="ca-state">
      <div>
        <span class="ca-state-name">${isNaN(n) ? n : (+n).toString(16).toUpperCase()}</span>
        <input type="text" class="jscolor" color-name="${n}" readonly="readonly">
      </div>
    </div>
    `).join('')}
  </div>
</div>`,
  width: 320,
  height: 420,
  create() {
    $(this).find('.jscolor').each(function() {
      this.jscolor = new jscolor(this, {
        hash: true
      });
    });
  },
  open() {
    Object.entries(ca.view.colors).forEach(([ key, color ]) => {
      $(this).find(`[color-name="${key}"]`).val(color).get(0).jscolor.importColor();
    });
  },
  ok() {
    ca.view.setColors(Object.keys(ca.view.colors).reduce((colors, key) => ({
      ...colors,
      [key]: this.find(`[color-name="${key}"]`).val()
    }), {}));
  }
};
