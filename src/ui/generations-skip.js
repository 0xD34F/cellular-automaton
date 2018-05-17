import $ from 'jquery';
import config from 'config';
import ca from 'ca';
import { limitation } from 'utils';


export default {
  init() {
  	$('#skip').click(function() {
      ca.newGeneration($(this).parent().find('input').val());
    }).parent().find('input').width(50).on('input', function() {
      var
        $this = $(this),
        val = parseInt($this.val(), 10);

      $this.val(limitation(val, config.SKIP_GENERATIONS_MIN, config.SKIP_GENERATIONS_MAX));
    }).val(config.SKIP_GENERATIONS_MIN);
  }
};
