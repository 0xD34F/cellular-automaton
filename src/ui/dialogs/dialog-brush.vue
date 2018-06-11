<template lang="pug">
  extends ./base/template.pug
  block body
    cell-field(
      :field="field"
      :brush="brush"
      :cellSizes="{ cellSide: 12, cellBorder: 1 }"
      ref="field"
    )
    .ca-state-select
      .ca-state(
        v-for="c in colors"
        :class="{ 'ca-state-active': c.state === brush.data[0][0] }"
        @click="selectActiveState(c.state)"
      )
        span.ca-state-name {{ c.label }}
        span.ca-state-color(:style="`background-color: ${c.color}`")
</template>

<script>
import config from 'config';
import ca, { CA } from 'ca';
import baseDialog from './base/';
import cellField from '../cell-field';

export default {
  name: 'ca-brush',
  mixins: [ baseDialog ],
  components: {
    cellField,
  },
  data() {
    return {
      title: 'Brush',
      width: '400px',
      field: null,
      brush: new CA.CellField(1).fill(() => 1),
      colors: {},
    };
  },
  methods: {
    onOpen() {
      if (!this.field) {
        this.field = ca.view.brush.clone();
      }

      this.field.copy(ca.view.brush);

      this.colors = Object.entries(ca.view.colors).filter(n => !isNaN(n[0])).map(([ k, v ]) => ({
        label: (+k).toString(16).toUpperCase(),
        state: +k,
        color: v,
      }));

      this.$nextTick(() => this.$refs.field.setColors(ca.view.colors));
    },
    selectActiveState(state) {
      this.brush.fill(() => state);
    },
    clickOK() {
      ca.view.brush.copy(this.field);
    },
  },
};
</script>

<style lang="scss" scoped>
/deep/ .el-dialog__body {
  display: flex;
  justify-content: space-between;
}

.ca-state-select {
  display: inline-grid;
  grid: repeat(4, 1fr) / repeat(4, 1fr);

  .ca-state {
    cursor: pointer;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 6px;

    &.ca-state-active {
      background-color: #007fff;
      color: #fff;
    }

    .ca-state-color {
      margin-right: 5px;
      width: 16px;
      height: 16px;
      border: 1px solid black;
    }

    .ca-state-name {
      font-size: 18px;
      margin-right: 5px;
      font-family: "Lucida Console", monospace;
    }
  }
}
</style>
