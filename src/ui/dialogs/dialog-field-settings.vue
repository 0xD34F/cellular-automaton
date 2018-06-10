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
import config from 'config';
import ca from 'ca';
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
        { name: 'xSize',      label: 'Field width',  ...config.X_SIZE },
        { name: 'ySize',      label: 'Field height', ...config.Y_SIZE },
        { name: 'cellSide',   label: 'Cell side',    ...config.CELL_SIDE },
        { name: 'cellBorder', label: 'Cell border',  ...config.CELL_BORDER },
      ],
      bitPlanes: ca.cells.bitPlanesList.map(n => ({
        plane: n,
        show: true,
      })),
    };
  },
  methods: {
    onOpen() {
      this.bitPlanes.forEach(n => n.show = !!(ca.view.showBitPlanes & (1 << n.plane)));
      this.formData = ca.sizes;
    },
    clickOK() {
      ca.view.showBitPlanes = this.bitPlanes.reduce((show, n) => show | (n.show << n.plane), 0);
      ca.sizes = this.formData;
    },
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
