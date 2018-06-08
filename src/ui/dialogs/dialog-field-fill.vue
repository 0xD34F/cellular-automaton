<template>
  <el-dialog :visible.sync="visible" title="Cells field filling" width="520px">
    <table style="table-layout: fixed;">
      <tr>
        <th width="65px">Bit plane</th>
        <th width="125px">Method</th>
        <th width="185px"></th>
        <th width="25px">Fill</th>
      </tr>
      <tr v-for="p in bitPlanes">
        <td class="center">{{p.plane}}</td>
        <td>
          <el-select v-model="p.method">
            <el-option
              v-for="m in fillMethods"
              :label="m.label"
              :value="m.name"
            />
          </el-select>
        </td>
        <td class="ca-filling-options">
          <div v-show="p.method === 'random'">
            <span class="ca-filling-options-note">density, ‰</span>
            <el-input-number
              v-model="p.density"
              v-bind="fillDensity"
              controls-position="right"
            />
          </div>
          <div v-show="p.method === 'copy'">
            <span class="ca-filling-options-note">from plane</span>
            <el-select v-model="p.copy.from" placeholder="">
              <el-option
                v-for="o in p.copy.options"
                :label="o"
                :value="o"
              />
            </el-select>
          </div>
        </td>
        <td class="center">
          <el-checkbox v-model="p.fill" />
        </td>
      </tr>
    </table>
    <span slot="footer" class="dialog-footer">
      <el-button type="primary" @click="clickOK">OK</el-button>
      <el-button @click="clickCancel">Cancel</el-button>
    </span>
  </el-dialog>
</template>

<script>
import ca from 'ca';
import config from 'config';

export default {
  name: 'ca-field-fill',
  props: [ 'show' ],
  data() {
    const max = ca.cells.randomFillDensityDescritization;

    return {
      bitPlanes: ca.cells.bitPlanesList.map((n, i, planes) => ({
        plane: n,
        fill: true,
        method: 'random',
        density: max * config.DEFAULT_FILL_DENSITY | 0,
        copy: {
          from: null,
          options: planes.filter(p => p !== n),
        },
      })),
      fillMethods: [
        { name: 'random', label: 'Random' },
        { name:   'copy', label:   'Copy' },
        { name: 'invert', label: 'Invert' },
        { name:   'all1', label:  'All 1' },
        { name:   'all0', label:  'All 0' },
      ],
      fillDensity: {
        min: 0,
        max: max,
      },
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

      ca.fill({ invert, random, copy });

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
