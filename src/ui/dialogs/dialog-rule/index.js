import config from 'config';
import ca, { CA } from 'ca';
import toastr from 'toastr';
import './style.scss';


export default {
  template: `
<div id="ca-rule" title="Rule">
  <div class="controls">
    <input id="ca-rule-name">
    <button id="ca-rule-save" title="Save rule into localStorage">
      <span class="ui-icon ui-icon-disk"></span>
    </button>
    <button id="ca-rule-delete" title="Delete rule from localStorage">
      <span class="ui-icon ui-icon-trash"></span>
    </button>
    <textarea id="ca-rule-code" autofocus></textarea>
  </div>
</div>`,
  width: '80%',
  create() {
    var $this = $(this);

    $this.find('#ca-rule-name').inputWithButton({
      icon: 'ui-icon-close',
      title: 'Clear rule name',
      placeholder: 'enter rule name...',
      click() {
        this.val('');
      }
    }).autocomplete({
      source(request, response) {
        var term = request.term.toLowerCase();

        response(CA.Rules.get().filter(n => !!n.name.toLowerCase().match(term)).map(n => ({
          matched: n.name.replace(new RegExp(`(${request.term})`, 'i'), '<span class="matched-text">$1</span>'),
          label: n.name,
          value: n.code,
          predefined: n.predefined
        })));
      },
      select(e, ui) {
        $(this).val(ui.item.label);
        $('#ca-rule-code').val(ui.item.value);

        return false;
      }
    }).data('ui-autocomplete')._renderItem = function(ul, item) {
      var $item = $('<div></div>').html(item.matched);
      if (item.predefined) {
        $item.addClass('predefined-rule');
      }

      return $('<li></li>').data('item.autocomplete', item).append($item).appendTo(ul);
    };

    $this.find('#ca-rule-save').button().click(function() {
      var result = CA.Rules.save($('#ca-rule-name').val(), $('#ca-rule-code').val());
      toastr[result.status ? 'success' : 'error'](result.message);
    }).end().find('#ca-rule-delete').button().click(function() {
      var result = CA.Rules.del($('#ca-rule-name').val());
      toastr[result.status ? 'success' : 'error'](result.message);
    });

    $this.find('#ca-rule-code').keydown(function(e) {
      if (e.keyCode === 9) {
        var
          start = this.selectionStart,
          end = this.selectionEnd,
          $this = $(this),
          value = $this.val(),
          tab = Array(5).join(' ');

        $this.val(value.substring(0, start) + tab + value.substring(end));

        this.selectionStart = this.selectionEnd = start + tab.length;

        e.preventDefault();
      }
    });
  },
  open() {
    $('#ca-rule-code').val(ca.rule);
  },
  ok() {
    try {
      ca.rule = $('#ca-rule-code').val();
    } catch (e) {
      toastr.error(e.message || e);
      return false;
    }
  }
};
