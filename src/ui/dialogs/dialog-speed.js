import config from 'config';
import ca from 'ca';


export default {
  template: `
<div id="ca-speed" title="Speed">
  <table class="ca-options-table">
    <tr>
      <td>Generations per step</td>
      <td>
        <input id="generations-per-step" type="text">
      </td>
    </tr>
    <tr>
      <td>Step duration, ms</td>
      <td>
        <input id="step-duration" type="text">
      </td>
    </tr>
  </table>
</div>`,
  width: 320,
  create() {
    $(this).find('#generations-per-step').spinner({
      min: config.GENERATIONS_PER_STEP_MIN,
      max: config.GENERATIONS_PER_STEP_MAX,
      step: config.GENERATIONS_PER_STEP_CHANGE
    }).end().find('#step-duration').spinner({
      min: config.STEP_DURATION_MIN,
      max: config.STEP_DURATION_MAX,
      step: config.STEP_DURATION_CHANGE
    });
  },
  open() {
    $(this)
      .find('#generations-per-step').val(ca.generationsPerStep).end()
      .find('#step-duration').val(ca.stepDuration);
  },
  ok() {
    ca.generationsPerStep = this.find('#generations-per-step').val();
    ca.stepDuration = this.find('#step-duration').val();
  }
};
