<template lang="pug">
  extends ./base/template.pug
  block body
    table(style="table-layout: fixed;")
      tr
        th(width="85px") Fill bit plane
        th(width="125px") Method
        th(width="185px")
      tr(
        v-for="p in bitPlanes"
        :key="`fill-bit-plane-${p.plane}`"
      )
        td.center
          el-checkbox(
            v-model="p.fill"
            :label="p.plane.toString()"
          )
        td
          el-select(v-model="p.method")
            el-option(
              v-for="m in fillMethods"
              :key="`fill-bit-plane-${p.plane}-${m.name}`"
              :label="m.label"
              :value="m.name"
            )
        td.ca-filling-options
          div(v-show="p.method === 'random'")
            span.ca-filling-options-note density, ‰
            el-input-number(
              v-model="p.density"
              v-bind="fillDensity"
              controls-position="right"
            )
          div(v-show="p.method === 'copy'")
            span.ca-filling-options-note from plane
            el-select(v-model="p.copy.from" placeholder="")
              el-option(
                v-for="o in p.copy.options"
                :key="`fill-bit-plane-${p.plane}-copy-from-${o}`"
                :label="o"
                :value="o"
              )
</template>

<script>
import config from 'config';
import baseDialog from './base/';

export default {
  mixins: [ baseDialog ],
  data() {
    return {
      title: 'Cells field filling',
      width: '500px',
      bitPlanes: null,
      fillMethods: [
        { name: 'random', label: 'Random' },
        { name:   'copy', label:   'Copy' },
        { name: 'invert', label: 'Invert' },
        { name:   'all1', label:  'All 1' },
        { name:   'all0', label:  'All 0' },
      ],
      fillDensity: null,
    };
  },
  methods: {
    clickOK() {
      const
        invert = [],
        random = {},
        copy = {};

      this.bitPlanes.filter(n => n.fill).forEach((n) => {
        const plane = n.plane;

        switch (n.method) {
          case 'invert': invert.push(plane); break;
          case   'all1': random[plane] = this.fillDensity.max; break;
          case   'all0': random[plane] = this.fillDensity.min; break;
          case 'random': random[plane] = n.density; break;
          case   'copy': copy[plane] = n.copy.from; break;
        }
      });

      this.ca.fill({ invert, random, copy });
    },
  },
  created() {
    const
      cells = this.ca.cells,
      max = cells.randomFillDensityDescritization;

    this.bitPlanes = cells.bitPlanesList.map((n, i, planes) => ({
      plane: n,
      fill: true,
      method: 'random',
      density: max * config.DEFAULT_FILL_DENSITY | 0,
      copy: {
        from: null,
        options: planes.filter(p => p !== n),
      },
    }));

    this.fillDensity = {
      min: 0,
      max: max,
    };
  },
};
</script>

<style lang="scss" scoped>
th,
td {
  font-weight: normal;
  padding: 10px;

  &.center {
    text-align: center;
  }
}

.ca-filling-options {
  .el-select,
  .el-input-number {
    width: 100px;
  }

  .ca-filling-options-note {
    display: inline-block;
    width: 5em;
    vertical-align: middle;
  }
}
</style>
