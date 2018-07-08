<template lang="pug">
  extends ./base/template.pug
  block body
    el-card(id="ca-field-sizes")
      div(slot="header") Sizes
      el-form(label-width="100px")
        el-form-item(
          v-for="o in sizesOptions"
          :key="o.name"
          :label="o.label"
        )
          el-input-number(
            v-model="formData[o.name]"
            :min="o.min"
            :max="o.max"
            :disabled="run && o.disableOnRun"
            controls-position="right"
          )
    el-card(id="ca-field-planes")
      div(slot="header") Show bit planes
      el-form(label-width="40px")
        el-form-item(
          v-for="p in bitPlanes"
          :key="`show-bit-plane-${p.plane}`"
        )
          el-checkbox(
            v-model="p.show"
            :label="p.plane.toString()"
          )
</template>

<script>
import { mapGetters } from 'vuex';
import config from 'config';
import baseDialog from './base/';

export default {
  name: 'ca-field-settings',
  mixins: [ baseDialog ],
  data() {
    return {
      title: 'Cell field settings',
      width: '480px',
      formData: {},
      sizesOptions: [
        { name: 'xSize',      label: 'Field width',  ...config.X_SIZE, disableOnRun: true },
        { name: 'ySize',      label: 'Field height', ...config.Y_SIZE, disableOnRun: true },
        { name: 'cellSide',   label: 'Cell side',    ...config.CELL_SIDE },
        { name: 'cellBorder', label: 'Cell border',  ...config.CELL_BORDER },
      ],
      bitPlanes: null,
    };
  },
  computed: {
    ...mapGetters([ 'run' ]),
  },
  methods: {
    onOpen() {
      this.bitPlanes.forEach(n => n.show = !!(this.ca.view.showBitPlanes & (1 << n.plane)));
      this.formData = this.ca.sizes;
    },
    clickOK() {
      this.ca.view.showBitPlanes = this.bitPlanes.reduce((show, n) => show | (n.show << n.plane), 0);
      this.ca.sizes = this.formData;
    },
  },
  created() {
    this.bitPlanes = this.ca.cells.bitPlanesList.map(n => ({
      plane: n,
      show: true,
    }));
  },
};
</script>

<style scoped>
.el-card {
  display: inline-block;
  margin: 0 10px;
}

.el-input-number {
  width: 100px;
}

#ca-field-sizes {
  width: 250px;
}

#ca-field-planes {
  width: 140px;
}
</style>
