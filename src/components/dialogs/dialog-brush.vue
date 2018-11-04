<template lang="pug">
  extends ./base/template.pug
  block body
    cell-field(
      :field="field"
      :brush="brush"
      :colors="colors"
      :cellSide="12"
      :cellBorder="1"
      :editOptions="{ skipZeros: false }"
      ref="field"
    )
    .ca-state-select
      .ca-state(
        v-for="c in brushColors"
        :class="{ 'ca-state-active': c.state === brush.data[0][0] }"
        @click="selectActiveState(c.state)"
      )
        span.ca-state-name {{ c.label }}
        span.ca-state-color(:style="`background-color: ${c.color}`")
</template>

<script>
import { CellField } from '@/ca/';
import cellField from '@/components/cell-field';

export default {
  components: {
    cellField,
  },
  data() {
    return {
      title: 'Brush',
      width: '400px',
      field: null,
      brush: new CellField(1).fill(() => 1),
      resetLabel: 'Reset',
    };
  },
  computed: {
    colors() {
      return this.$store.getters.viewOptions.colors;
    },
    brushColors() {
      return Object.entries(this.colors).filter(n => !isNaN(n[0])).map(([ k, v ]) => ({
        label: (+k).toString(16).toUpperCase(),
        state: +k,
        color: v,
      }));
    },
  },
  methods: {
    onOpen() {
      this.field = this.$store.getters.brush.clone();
      this.$nextTick(() => this.$refs.field.render(true));
    },
    selectActiveState(state) {
      this.brush.fill(() => state);
    },
    clickOK() {
      this.$store.dispatch('updateBrush', this.field);
    },
    clickReset() {
      this.field = this.$store.getters.defaultBrush.clone();
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
