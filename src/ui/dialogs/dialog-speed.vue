<template>
  <el-dialog
    :visible.sync="visible"
    title="Speed"
    width="320px"
    @open="onOpen"
  >
    <el-form label-width="150px">
      <el-form-item
        v-for="o in speedOptions"
        :key="o.name"
        :label="o.label"
      >
        <el-input-number
          v-model="formData[o.name]"
          :min="o.min"
          :max="o.max"
          :step="o.step"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button type="primary" @click="clickOK">OK</el-button>
      <el-button @click="clickCancel">Cancel</el-button>
    </span>
  </el-dialog>
</template>

<script>
import config from 'config';
import ca from 'ca';

export default {
  name: 'ca-speed',
  props: [ 'show' ],
  data() {
    return {
      formData: {},
      speedOptions: [
        { name: 'generationsPerStep', label: 'Generations per step', min: config.GENERATIONS_PER_STEP_MIN, max: config.GENERATIONS_PER_STEP_MAX, step: config.GENERATIONS_PER_STEP_CHANGE },
        { name: 'stepDuration',       label: 'Step duration, ms',    min: config.STEP_DURATION_MIN,        max: config.STEP_DURATION_MAX,        step: config.STEP_DURATION_CHANGE },
      ],
    };
  },
  computed: {
    visible: {
      get() {
        return this.show;
      },
      set() {
        this.close();
      },
    },
  },
  methods: {
    onOpen() {
      this.formData = this.speedOptions.reduce((data, n) => ({ ...data, [n.name]: ca[n.name] }), {});
    },
    clickOK() {
      Object.assign(ca, this.formData);
      this.close();
    },
    clickCancel() {
      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.el-input-number {
  width: 120px;
}
</style>
