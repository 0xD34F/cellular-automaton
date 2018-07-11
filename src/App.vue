<template lang="pug">
  #app
    .controls
      el-button(@click="start" v-show="!run")
        v-icon(name="play")
      el-button(@click="stop" v-show="run")
        v-icon(name="pause")
      el-input-number(
        v-model="skipGenerations"
        v-bind="config.SKIP_GENERATIONS"
        :disabled="run"
        :controls="false"
        style="width: 130px"
      )
        el-button(slot="append" @click="skip(skipGenerations)" :disabled="run")
          v-icon(name="skip-forward")
      el-button(@click="back" title="Return to the initial configuration")
        v-icon(name="skip-back")
      el-button(@click="saveImage" title="Save cells field as image")
        v-icon(name="download")
      el-button-group(v-if="ca.view")
        el-button(
          v-for="m in modes"
          :key="m.name"
          :type="ca.view.mode === m.name ? 'primary' : ''"
          :disabled="run && m.disableOnRun"
          @click="ca.view.mode = m.name"
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
          @click="openDialog('ca-field-fill')"
          :disabled="run"
          title="Cells field filling"
        ) Fill...
        el-button(
          @click="ca.clear()"
          :disabled="run"
          title="Cells field clear"
        ) Clear
      el-dropdown(@command="openDialog" trigger="click")
        el-button
          v-icon(name="settings")
        el-dropdown-menu(slot="dropdown")
          el-dropdown-item(command="ca-field-settings") Field
          el-dropdown-item(command="ca-speed") Speed
          el-dropdown-item(command="ca-colors") Colors
          el-dropdown-item(command="ca-brush") Brush
          el-dropdown-item(command="ca-rule" :disabled="run") Rule
    div(
      v-for="d in dialogs"
      :key="d"
      :is="d"
      :show="d === openedDialog"
      @close="openedDialog = null"
    )
    cell-field(
      :field="ca.cells"
      :brush="brush"
      v-bind="$store.state.automaton.viewOptions"
      ref="field"
    )
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import dialogs from './ui/dialogs/';
import cellField from './ui/cell-field';
import { limitation } from 'utils';
import config from 'config';
import store from './store/';

export default {
  name: 'app',
  store,
  components: {
    ...dialogs,
    cellField,
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
    ...mapGetters([ 'ca', 'run', 'rules', 'brush' ]),
  },
  methods: {
    ...mapActions([ 'start', 'stop', 'back', 'skip' ]),
    openDialog(name) {
      this.openedDialog = name;
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
  mounted() {
    window.addEventListener('resize', () => this.ca.view.refresh());

    this.$nextTick(() => {
      this.ca.view = this.$refs.field;
      this.ca.rule = this.rules.find(n => n.name === this.config.DEFAULT_RULE).code;
      this.$forceUpdate();
    });
  },
};
</script>

<style lang="scss">
html, body {
  margin: 0;
  font-family: sans-serif;
  height: 100%;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.el-dialog__body {
  padding: 10px 20px;
}

.el-notification__content {
  margin: 5px 10px 0 0;
}

.el-form-item__content {
  /* Firefox fix */
  height: 40px;
}

.el-color-dropdown {
  .el-color-dropdown__btns {
    .el-button {
      display: none;
    }
  }
}

.icon {
  width: 24px;
}

.controls {
  padding: 10px 10px;
  width: 100%;
  box-sizing: border-box;
  flex: 0;

  > .el-dropdown,
  > .el-button,
  > .el-button-group,
  > .el-input-group,
  > .el-input-number,
  > .el-autocomplete {
    vertical-align: top;
    margin: 5px 10px 5px 0;
  }

  .el-button {
    padding: 6px 12px;
    height: 40px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .el-input-number {
    display: inline-flex;
  }

  .el-input-group {
    display: inline-table;

    .el-input-group__append {
      .el-button {
        margin: -1px -20px;

        &.is-disabled {
          &,
          &:focus,
          &:hover {
            background-color: unset;
          }
        }
      }
    }
  }
}
</style>
