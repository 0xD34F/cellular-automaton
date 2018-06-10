<template lang="pug">
  extends ./base/template.pug
  block body
    .ca-state-select
      .ca-state(v-for="(c, key) in colors" :key="key")
        span.ca-state-name {{ colorName(key) }}
        el-color-picker(v-model="colors[key]")
</template>

<script>
import ca from 'ca';
import baseDialog from './base/';

export default {
  name: 'ca-colors',
  mixins: [ baseDialog ],
  data() {
    return {
      title: 'Colors',
      width: '390px',
      colors: ca.view.colors,
    };
  },
  methods: {
    colorName(color) {
      return isNaN(color) ? color : (+color).toString(16).toUpperCase();
    },
    onOpen() {
      this.colors = ca.view.colors;
    },
    clickOK() {
      ca.view.setColors(this.colors);
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
    padding: 5px 15px;
    display: inline-flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    .ca-state-name {
      font-size: 18px;
      margin-right: 5px;
      font-family: "Lucida Console", monospace;
    }
  }
}
</style>
