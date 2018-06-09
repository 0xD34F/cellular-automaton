<template lang="pug">
  include template.pug
</template>

<script>
export default {
  props: [ 'show' ],
  data() {
    return {
      title: '',
      width: '300px',
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
    onOpen() {},
    onClickOK() {
      if (!(this.clickOK instanceof Function) || (this.clickOK() !== false)) {
        this.close();
      }
    },
    onClickCancel() {
      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>

<style lang="scss">
.el-dialog {
  .el-button {
    margin-left: 5px;
  }
}
</style>
