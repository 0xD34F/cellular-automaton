import config from 'config';
import ca from 'ca';


const speedOptions = {
  meta: [
    { name: 'generationsPerStep', label: 'Generations per step', spinner: { min: config.GENERATIONS_PER_STEP_MIN, max: config.GENERATIONS_PER_STEP_MAX, step: config.GENERATIONS_PER_STEP_CHANGE } },
    { name: 'stepDuration',       label: 'Step duration, ms',    spinner: { min: config.STEP_DURATION_MIN,        max: config.STEP_DURATION_MAX,        step: config.STEP_DURATION_CHANGE } }
  ],
  row: r =>
    `<tr>
      <td>${r.label}</td>
      <td>
        <input name="${r.name}" type="text">
      </td>
    </tr>`
};


export default {
  template: '<div id="ca-speed" title="Speed"></div>',
  width: 320,
  create() {
    $(this).append($('<table />').settingsTable(speedOptions));
  },
  open() {
    $(this).find('table').settingsTable('set', ca);
  },
  ok() {
    Object.assign(ca, this.find('table').settingsTable('get'));
  }
};
