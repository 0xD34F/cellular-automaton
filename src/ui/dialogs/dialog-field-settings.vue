<template>
  <el-dialog
    :visible.sync="visible"
    title="Cells field settings"
    width="480px"
    @open="onOpen"
  >
    <el-card id="ca-field-sizes">
      <div slot="header">Sizes</div>
      <el-form label-width="100px">
        <el-form-item
          v-for="o in sizesOptions"
          :key="o.name"
          :label="o.label"
        >
          <el-input-number
            v-model="formData[o.name]"
            :min="o.min"
            :max="o.max"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
    </el-card>
    <el-card id="ca-field-planes">
      <div slot="header">Show bit planes</div>
      <el-form label-width="40px">
        <el-form-item
          v-for="p in bitPlanes"
          :key="`show-bit-plane-${p.plane}`"
          :label="p.plane.toString()"
        >
          <el-checkbox v-model="p.show" />
        </el-form-item>
      </el-form>
    </el-card>
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
  name: 'ca-field-settings',
  props: [ 'show' ],
  data() {
    return {
      formData: {},
      sizesOptions: [
        { name: 'xSize',      label: 'Field width',  min: config.X_SIZE_MIN,      max: config.X_SIZE_MAX },
        { name: 'ySize',      label: 'Field height', min: config.Y_SIZE_MIN,      max: config.Y_SIZE_MAX },
        { name: 'cellSide',   label: 'Cell side',    min: config.CELL_SIDE_MIN,   max: config.CELL_SIDE_MAX },
        { name: 'cellBorder', label: 'Cell border',  min: config.CELL_BORDER_MIN, max: config.CELL_BORDER_MAX },
      ],
      bitPlanes: ca.cells.bitPlanesList.map(n => ({
        plane: n,
        show: true,
      })),
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
      this.bitPlanes.forEach(n => n.show = !!(ca.view.showBitPlanes & (1 << n.plane)));
      this.formData = ca.sizes;
    },
    clickOK() {
      ca.view.showBitPlanes = this.bitPlanes.reduce((show, n) => show | (n.show << n.plane), 0);
      ca.sizes = this.formData;

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
