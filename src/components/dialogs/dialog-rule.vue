<template lang="pug">
  extends ./base/template.pug
  block body
    .controls
      el-autocomplete(
        v-model="ruleName"
        :fetch-suggestions="getRuleNames"
        :debounce="0"
        placeholder="enter rule name..."
        @select="onRuleSelect"
      )
        span(
          slot-scope="{ item }"
          v-html="highlightMatched(item)"
          :class="{ 'predefined-rule': item.predefined }"
        )
        el-button(slot="append" @click="ruleName = ''")
          v-icon(name="x")
      el-button(@click="saveRule" title="Save rule into localStorage")
        v-icon(name="save")
      el-button(@click="deleteRule" title="Delete rule from localStorage")
        v-icon(name="trash")
      el-input(
        id="ca-rule-code"
        v-model="ruleCode"
        :autosize="ruleCodeSizes"
        @keydown.native.tab.prevent="onTab"
        type="textarea"
      )
</template>

<script>
import { mapGetters } from 'vuex';
import { Notification } from 'element-ui';

export default {
  data() {
    return {
      title: 'Rule',
      width: '80%',
      ruleCodeSizes: {
        minRows: 6,
        maxRows: 15,
      },
      ruleName: '',
      ruleCode: '',
    };
  },
  computed: {
    ...mapGetters([ 'rules' ]),
  },
  methods: {
    onOpen() {
      this.ruleCode = this.ca.rule;
    },
    getRuleNames(queryString, cb) {
      const q = queryString.toLowerCase();

      cb(this.rules.filter(n => !!n.name.toLowerCase().match(q)).map(n => ({
        value: n.name,
        code: n.code,
        predefined: n.predefined,
      })));
    },
    highlightMatched(item) {
      return item.value.replace(new RegExp(`(${this.ruleName})`, 'i'), '<span class="matched-text">$1</span>');
    },
    onRuleSelect(rule) {
      this.ruleCode = rule.code;
    },
    onTab(e) {
      const
        el = e.target,
        start = el.selectionStart,
        end = el.selectionEnd,
        value = this.ruleCode,
        tab = Array(3).join(' ');

      this.ruleCode = value.slice(0, start) + tab + value.slice(end);

      this.$nextTick(() => el.selectionStart = el.selectionEnd = start + tab.length);
    },
    saveRule() {
      this.$store.dispatch('saveRule', {
        name: this.ruleName,
        code: this.ruleCode,
      }).then(result => {
        Notification({
          type: result.status ? 'success' : 'error',
          message: result.message,
          dangerouslyUseHTMLString: true,
        });
      });
    },
    deleteRule() {
      this.$store.dispatch('deleteRule', this.ruleName).then(result => {
        Notification({
          type: result.status ? 'success' : 'error',
          message: result.message,
          dangerouslyUseHTMLString: true,
        });
      });
    },
    clickOK() {
      try {
        this.ca.rule = this.ruleCode;
      } catch (e) {
        Notification({
          type: 'error',
          message: e.message || e,
          dangerouslyUseHTMLString: true,
        });

        return false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
/deep/ #ca-rule-code {
  font-family: monospace;
  margin-top: 10px;
}

.el-autocomplete-suggestion__list li span {
  color: #000;

  &.predefined-rule {
    color: #888;
  }

  /deep/ .matched-text {
    text-decoration: underline;
    font-weight: bold;
  }
}
</style>
