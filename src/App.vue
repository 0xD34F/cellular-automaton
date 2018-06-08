<template>
  <div id="app">
    <div class="controls">
      <el-button @click="ca.start()" v-show="!run"><v-icon name="play" /></el-button>
      <el-button @click="ca.stop()" v-show="run"><v-icon name="pause" /></el-button>
      <el-input v-model="skipGenerations" :disabled="run" style="width: 120px">
        <el-button slot="append" @click="skip" :disabled="run"><v-icon name="skip-forward" /></el-button>
      </el-input>
      <el-button @click="ca.back()" title="Return to the initial configuration"><v-icon name="skip-back" /></el-button>
      <el-button @click="saveImage" title="Save cells field as image"><v-icon name="download" /></el-button>
      <el-button-group>
        <el-button
          v-for="m in modes"
          :key="m.name"
          :type="caViewMode === m.name ? 'primary' : ''"
          :disabled="run && m.disableOnRun"
          @click="setMode(m.name)"
        >
          <v-icon :name="m.icon" />
        </el-button>
      </el-button-group>
      <el-button-group>
        <el-button @click="ca.rotateCounterclockwise()" title="Rotate counterclockwise" size="mini"><v-icon name="rotate-ccw" /></el-button>
        <el-button @click="ca.rotateClockwise()" title="Rotate clockwise" size="mini"><v-icon name="rotate-cw" /></el-button>
      </el-button-group>
      <el-button @click="openDialog('ca-brush')">Brush...</el-button>
      <el-button @click="openDialog('ca-colors')">Colors...</el-button>
      <el-button @click="openDialog('ca-field')" title="Cells field settings">Field...</el-button>
      <el-button-group>
        <el-button @click="openDialog('ca-filling')" :disabled="run" title="Cells field filling">Fill...</el-button>
        <el-button @click="ca.clear()" :disabled="run" title="Cells field clear">Clear</el-button>
      </el-button-group>
      <el-button @click="openDialog('ca-speed')">Speed...</el-button>
      <el-button @click="openDialog('ca-rule')" :disabled="run">Rule...</el-button>
    </div>
  </div>
</template>

<script>
import $ from 'jquery';
import './ui/';
import { limitation } from 'utils';
import ca from 'ca';
import config from 'config';


export default {
  name: 'app',
  data() {
    return {
      run: false,
      skipGenerations: 1,
      ca,
      caViewMode: ca.view.mode,
      modes: [
        { name: 'edit',     title: 'Edit',     icon: 'edit', disableOnRun: true },
        { name: 'shift',    title: 'Shift',    icon: 'move' },
        { name: 'zoom.in',  title: 'Zoom out', icon: 'zoom-in' },
        { name: 'zoom.out', title: 'Zoom in',  icon: 'zoom-out' },
      ],
    };
  },
  methods: {
    openDialog(name) {
      $(`#${name}`).confirmDialog('open');
    },
    skip() {
      this.ca.newGeneration(this.skipGenerations);
    },
    setMode(mode) {
      this.ca.view.mode = mode;
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
        image = ca.view.imageData;

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
  watch: {
    skipGenerations(val) {
      this.$nextTick(() => {
        this.skipGenerations = limitation(parseInt(val, 10), config.SKIP_GENERATIONS_MIN, config.SKIP_GENERATIONS_MAX);
      });
    },
  },
  mounted() {
    window.addEventListener('resize', () => this.ca.view.refresh());
    document.addEventListener('ca-start', () => this.run = true);
    document.addEventListener('ca-stop', () => this.run = false);
    document.addEventListener('cell-field-mode', (e) => {
      if (e.detail === ca.view) {
        this.caViewMode = ca.view.mode;
      }
    });

    $(document).ready(() => {
      $(document).trigger('ca-stop');

      $('.ui-helper-hidden').removeClass('ui-helper-hidden');

      this.ca.view.refresh();
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

#toast-container > div {
  border-radius: 0;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.el-button + .el-button {
  margin-left: unset;
}

.icon {
  width: 24px;
}

.controls {
  padding: 15px 10px;
  width: 100%;
  box-sizing: border-box;
  flex: 0;

  > * {
    vertical-align: top;
    margin: 5px 1px 5px 0;
  }

  .el-button {
    padding: 6px 12px;
    height: 40px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .el-input-group {
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

.ca-state-select {
  .ca-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 5px;
    border: 1px solid transparent;

    .ca-state-name {
      display: inline-block;
      font-size: 18px;
      margin-right: 5px;
      font-family: "Lucida Console", monospace;
    }

    .ca-state-color {
      display: inline-block;
      vertical-align: top;
      margin-right: 5px;
      width: 16px;
      height: 16px;
      border: 1px solid black;
      box-sizing: border-box;
    }
  }
}

button,
input,
textarea,
select,
li,
.ui-selectmenu-button {
  outline: 0;
  border: 1px solid rgb(197, 197, 197);
}

.ui-button {
  padding: 6px 6px 4px 6px;
}

.ui-autocomplete {
  max-height: 300px;
  overflow-x: hidden;
  overflow-y: auto;
}

.ui-menu {
  &,
  li,
  .ui-menu-item-wrapper {
    list-style: none;
    border: 0;
    margin: 0;
    padding: 0;
  }
}

.ui-visual-focus,
.ui-state-focus {
  box-shadow: none;
}

.ui-corner {
  &-all,
  &-top,
  &-right,
  &-left,
  &-bottom,
  &-tr {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0;
  }
}
</style>
