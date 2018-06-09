<template lang="pug">
  extends ./base/template.pug
  block body
    el-form(label-width="150px")
      el-form-item(
        v-for="o in speedOptions"
        :key="o.name"
        :label="o.label"
      )
        el-input-number(
          v-model="formData[o.name]"
          :min="o.min"
          :max="o.max"
          :step="o.step"
          controls-position="right"
        )
</template>

<script>
import config from 'config';
import ca from 'ca';
import baseDialog from './base/';

export default {
  name: 'ca-speed',
  mixins: [ baseDialog ],
  data() {
    return {
      title: 'Speed',
      width: '320px',
      formData: {},
      speedOptions: [
        { name: 'generationsPerStep', label: 'Generations per step', min: config.GENERATIONS_PER_STEP_MIN, max: config.GENERATIONS_PER_STEP_MAX, step: config.GENERATIONS_PER_STEP_CHANGE },
        { name: 'stepDuration',       label: 'Step duration, ms',    min: config.STEP_DURATION_MIN,        max: config.STEP_DURATION_MAX,        step: config.STEP_DURATION_CHANGE },
      ],
    };
  },
  methods: {
    onOpen() {
      this.formData = this.speedOptions.reduce((data, n) => ({ ...data, [n.name]: ca[n.name] }), {});
    },
    clickOK() {
      Object.assign(ca, this.formData);
    },
  },
};
</script>

<style scoped>
.el-input-number {
  width: 120px;
}
</style>
