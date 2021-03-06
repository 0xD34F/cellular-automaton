import { mapGetters } from 'vuex';

export default {
  props: [ 'show' ],
  data() {
    return {
      title: '',
      width: '300px',
      resetLabel: '',
    };
  },
  computed: {
    ...mapGetters([ 'ca' ]),
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
    clickReset() {},
  },
};
