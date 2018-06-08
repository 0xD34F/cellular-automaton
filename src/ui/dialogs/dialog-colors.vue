<template>
  <el-dialog :visible.sync="visible" title="Colors" width="360px" @open="onOpen">
    <div class="ca-state-select">
      <div v-for="(c, key) in colors" :key="key" class="ca-state">
        <span class="ca-state-name">{{ colorName(key) }}</span>
        <el-color-picker v-model="colors[key]" />
      </div>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button type="primary" @click="clickOK">OK</el-button>
      <el-button @click="clickCancel">Cancel</el-button>
    </span>
  </el-dialog>
</template>

<script>
import ca from 'ca';

export default {
  name: 'ca-colors',
  props: [ 'show' ],
  data() {
    return {
      colors: { ...ca.view.colors },
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
    colorName(color) {
      return isNaN(color) ? color : (+color).toString(16).toUpperCase();
    },
    onOpen() {
      this.colors = { ...ca.view.colors };
    },
    clickOK() {
      ca.view.setColors(this.colors);
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

<style lang="scss" scoped>
.ca-state-select {
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-end;

  .ca-state {
    padding: 5px 10px;
    display: inline-flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }
}
</style>
