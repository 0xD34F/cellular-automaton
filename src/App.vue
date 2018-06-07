<template>
  <div id="app">
    <div class="controls">
      <button @click="ca.start()" class="ca-start-hide"><span class="ui-icon ui-icon-play"></span></button>
      <button @click="ca.stop()" class="ca-start-show"><span class="ui-icon ui-icon-pause"></span></button>
      <input id="skip">
      <button id="back" @click="ca.back()" title="Return to the initial configuration"><span class="ui-icon ui-icon-seek-prev"></span></button>
      <button id="save-as-image" title="Save cells field as image"><span class="ui-icon ui-icon-disk"></span></button>
      <div id="cell-field-mode"></div>
      <div class="toolbar">
        <button @click="ca.rotateCounterclockwise()" title="Rotate counterclockwise"><span class="ui-icon ui-icon-triangle-1-w"></span></button>
        <button @click="ca.rotateClockwise()" title="Rotate clockwise"><span class="ui-icon ui-icon-triangle-1-e"></span></button>
      </div>
      <button @click="openDialog('ca-brush')">Brush...</button>
      <button @click="openDialog('ca-colors')">Colors...</button>
      <button @click="openDialog('ca-field')" title="Cells field settings">Field...</button>
      <div class="toolbar">
        <button @click="openDialog('ca-filling')" class="ca-start-disable" title="Cells field filling">Fill...</button>
        <button @click="ca.clear()" class="ca-start-disable" title="Cells field clear">Clear</button>
      </div>
      <button @click="openDialog('ca-speed')">Speed...</button>
      <button @click="openDialog('ca-rule')" class="ca-start-disable">Rule...</button>
    </div>
  </div>
</template>

<script>
import $ from 'jquery';
import './ui/';
import ca from 'ca';


export default {
  name: 'app',
  data() {
    return {
      ca
    };
  },
  methods: {
    openDialog(name) {
      $(`#${name}`).confirmDialog('open');
    }
  },
  mounted() {
    window.addEventListener('resize', () => this.ca.view.refresh());

    $(document).ready(() => {
      $(document).trigger('ca-stop');

      $('.ui-helper-hidden').removeClass('ui-helper-hidden');

      this.ca.view.refresh();
    });
  }
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

.controls {
  padding: 15px 10px;
  width: 100%;
  box-sizing: border-box;
  flex: 0;

  > * {
    vertical-align: top;
    margin: 5px 1px 5px 0;
  }

  > .ui-controlgroup > .ui-controlgroup-item {
    margin-right: -1px;
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

.ui-controlgroup[role="toolbar"] {
  margin-right: 3px;

  .ui-checkboxradio-label.ui-state-active {
    &,
    &:hover {
      z-index: 99;
    }

    &:hover .ui-icon,
    .ui-icon {
      background-image: url(../node_modules/jquery-ui/themes/base/images/ui-icons_ffffff_256x240.png);
    }
  }
}
</style>
