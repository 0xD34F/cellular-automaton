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
          slot-scope="item"
          v-html="highlightMatched(item)"
          :class="{ 'predefined-rule': item.item.predefined }"
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
import ca, { CA } from 'ca';
import baseDialog from './base/';

export default {
  name: 'ca-rule',
  mixins: [ baseDialog ],
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
  methods: {
    onOpen() {
      this.ruleCode = ca.rule;
    },
    getRuleNames(queryString, cb) {
      var q = queryString.toLowerCase();

      cb(CA.Rules.get().filter(n => !!n.name.toLowerCase().match(q)).map(n => ({
        value: n.name,
        code: n.code,
        predefined: n.predefined,
      })));
    },
    highlightMatched({ item }) {
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
        tab = Array(5).join(' ');

      this.ruleCode = value.slice(0, start) + tab + value.slice(end);

      this.$nextTick(() => el.selectionStart = el.selectionEnd = start + tab.length);
    },
    saveRule() {
      const result = CA.Rules.save(this.ruleName, this.ruleCode);

      this.$notify({
        type: result.status ? 'success' : 'error',
        message: result.message,
        dangerouslyUseHTMLString: true,
      });
    },
    deleteRule() {
      const result = CA.Rules.del(this.ruleName);

      this.$notify({
        type: result.status ? 'success' : 'error',
        message: result.message,
        dangerouslyUseHTMLString: true,
      });
    },
    clickOK() {
      try {
        ca.rule = this.ruleCode;
      } catch (e) {
        this.$notify({
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
