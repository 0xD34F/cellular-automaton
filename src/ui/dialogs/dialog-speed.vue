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
        { name: 'generationsPerStep', label: 'Generations per step', ...config.GENERATIONS_PER_STEP },
        { name: 'stepDuration',       label: 'Step duration, ms',    ...config.STEP_DURATION },
      ],
    };
  },
  methods: {
    onOpen() {
      this.formData = this.speedOptions.reduce((data, n) => ({ ...data, [n.name]: this.ca[n.name] }), {});
    },
    clickOK() {
      Object.assign(this.ca, this.formData);
    },
  },
};
</script>

<style scoped>
.el-input-number {
  width: 120px;
}
</style>
