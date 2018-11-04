<template lang="pug">
  .controls
    el-button(
      @click="start"
      v-show="!run"
      title="Run"
    )
      v-icon(name="play")
    el-button(
      @click="stop"
      v-show="run"
      title="Stop"
    )
      v-icon(name="pause")
    el-input-number(
      v-model="skipGenerations"
      v-bind="config.SKIP_GENERATIONS"
      :disabled="run"
      :controls="false"
      style="width: 130px"
    )
      el-button(
        @click="skip(skipGenerations)"
        :disabled="run"
        title="Skip generations"
        slot="append"
      )
        v-icon(name="skip-forward")
    el-button(
      @click="back"
      title="Return to the initial configuration"
    )
      v-icon(name="skip-back")
    el-button(
      @click="saveImage"
      title="Save cells field as image"
    )
      v-icon(name="download")
    el-button-group
      el-button(
        v-for="m in modes"
        :key="m.name"
        :type="viewOptions.mode === m.name ? 'primary' : ''"
        :disabled="run && m.disableOnRun"
        :title="m.title"
        @click="$store.commit('setViewOptions', { mode: m.name })"
      )
        v-icon(:name="m.icon")
    el-button-group
      el-button(
        @click="ca.rotateCounterclockwise()"
        title="Rotate counterclockwise"
      )
        v-icon(name="rotate-ccw")
      el-button(
        @click="ca.rotateClockwise()"
        title="Rotate clockwise"
      )
        v-icon(name="rotate-cw")
    el-button-group
      el-button(
        @click="openDialog('field-fill')"
        :disabled="run"
        title="Cells field filling"
      ) Fill...
      el-button(
        @click="ca.clear()"
        :disabled="run"
        title="Cells field clear"
      ) Clear
    el-dropdown(
      @command="openDialog"
      trigger="click"
    )
      el-button
        v-icon(name="settings")
      el-dropdown-menu(slot="dropdown")
        el-dropdown-item(command="field-settings") Field
        el-dropdown-item(command="speed") Speed
        el-dropdown-item(command="colors") Colors
        el-dropdown-item(command="brush") Brush
        el-dropdown-item(command="rule" :disabled="run") Rule
    component(
      v-for="d in dialogs"
      :key="d"
      :is="d"
      :show="d === openedDialog"
      @close="openedDialog = null"
    )
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import dialogs from '@/components/dialogs/';
import config from 'config';

export default {
  components: {
    ...dialogs,
  },
  data() {
    return {
      skipGenerations: 1,
      config,
      modes: [
        { name: 'edit',     title: 'Edit',     icon: 'edit', disableOnRun: true },
        { name: 'shift',    title: 'Shift',    icon: 'move' },
        { name: 'zoom.in',  title: 'Zoom out', icon: 'zoom-in' },
        { name: 'zoom.out', title: 'Zoom in',  icon: 'zoom-out' },
      ],
      dialogs: Object.keys(dialogs),
      openedDialog: null,
    };
  },
  computed: {
    ...mapGetters([ 'ca', 'run', 'viewOptions' ]),
  },
  methods: {
    ...mapActions([ 'start', 'stop', 'back', 'skip' ]),
    openDialog(name) {
      this.openedDialog = `dialog-${name}`;
    },
    saveImage() {
      /*
       * отдельный canvas - чтобы результирующее изображение содержало
       * только данные из view.imageData; актуально для случаев, когда
       * размеры view.imageData меньше, чем размеры wrapper'а
       */
      const
        canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        image = this.ca.view.imageData;

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.putImageData(image, 0, 0);

      const a = document.createElement('a');
      a.href = canvas.toDataURL();
      a.download = `${Date.now().toString()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  },
};
</script>
