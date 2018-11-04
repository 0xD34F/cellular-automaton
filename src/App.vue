<template lang="pug">
  #app
    main-menu
    cell-field(
      :field="ca.cells"
      :brush="brush"
      :scrollable="true"
      v-bind="viewOptions"
      ref="field"
      @zoom="$store.commit('setViewOptions', { cellSide: $event })"
    )
</template>

<script>
import { mapGetters } from 'vuex';
import mainMenu from './components/main-menu';
import cellField from './components/cell-field';
import config from 'config';

export default {
  components: {
    mainMenu,
    cellField,
  },
  computed: {
    ...mapGetters([ 'ca', 'rules', 'brush', 'viewOptions' ]),
  },
  created() {
    this.$store.commit('initCA', {
      xSize: config.DEFAULT_X_SIZE,
      ySize: config.DEFAULT_Y_SIZE,
      view: {
        setColors: (colors, noRender) => {
          this.$store.commit('setColors', colors);
          if (!noRender) {
            this.$nextTick(() => this.ca.view.render(true));
          }
        },
      },
    });
  },
  mounted() {
    window.addEventListener('resize', () => this.ca.view.refresh());

    this.$nextTick(() => {
      this.ca.view = this.$refs.field;
      this.ca.rule = this.rules.find(n => n.name === config.DEFAULT_RULE).code;
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
