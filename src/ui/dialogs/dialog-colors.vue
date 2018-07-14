<template lang="pug">
  extends ./base/template.pug
  block body
    .gradient-color-select
      el-checkbox(
        v-model="gradient.use"
        label="use gradient"
        @change="onGradientToggle"
      )
      .gradient-color(
        v-for="(color, key) in gradient.colors"
        :key="key"
      ) {{ key }}
        el-color-picker(
          :value="color"
          @active-change="onActiveChange($event, gradient.colors, key)"
        )
    .cell-field-color-select
      .cell-field-color(
        v-for="(color, key) in colors"
        :key="key"
      )
        span.cell-field-color-name {{ colorName(key) }}
        el-color-picker(
          v-model="colors[key]"
          @active-change="onActiveChange($event, colors, key)"
        )
</template>

<script>
import config from 'config';
import { gradient } from 'utils';

export default {
  data() {
    return {
      title: 'Colors',
      width: '390px',
      colors: {},
      gradient: {
        use: false,
        colors: {
          from: '#FFFFFF',
          to: '#000000',
        },
        prevColors: null,
      },
      resetLabel: 'Default colors',
    };
  },
  methods: {
    colorName(color) {
      return isNaN(color) ? color : (+color).toString(16).toUpperCase();
    },
    onActiveChange(color, colorObj, key) {
      // rgb -> hex 
      this.$set(colorObj, key, `#${color.match(/(\d+)/g).map(n => (+n).toString(16).toUpperCase().padStart(2, '0')).join('')}`);
    },
    onGradientToggle() {
      if (this.gradient.use) {
        this.gradient.prevColors = { ...this.colors };
      } else {
        this.colors = { ...this.gradient.prevColors };
      }
    },
    getGradient() {
      const { from, to } = this.gradient.colors;

      return gradient(from, to, this.ca.cells.numCellStates);
    },
    onOpen() {
      this.colors = { ...this.ca.view.colors };
    },
    clickOK() {
      this.ca.view.setColors(this.colors);
    },
    clickReset() {
      this.colors = { ...config.DEFAULT_COLORS };
    },
  },
  watch: {
    colors: {
      deep: true,
      handler() {
        // если текущие цвета не совпадают с градиентными -
        // сбрасываем чекбокс, чтобы не вводить пользователя в заблуждение
        if (this.getGradient().some((color, state) => color !== this.colors[state])) {
          this.gradient.use = false;
        }
      },
    },
    gradient: {
      deep: true,
      handler() {
        if (this.gradient.use) {
          this.colors = { ...this.colors, ...this.getGradient() };
        }
      },
    },
  },
};
</script>

<style lang="scss" scoped>
.el-color-picker {
  margin-left: 5px;
}

.cell-field-color-select {
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-end;
}

.gradient-color-select {
  padding: 10px 20px;
}

.gradient-color,
.cell-field-color {
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.gradient-color {
  padding-left: 5px;
}

.cell-field-color {
  padding: 5px 15px;

  .cell-field-color-name {
    font-size: 18px;
    font-family: "Lucida Console", monospace;
  }
}
</style>
