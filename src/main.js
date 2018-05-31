import $ from 'jquery';
import './ui/';
import ca from 'ca';

import './main.scss';


$(window).on('resize', function() {
  ca.view.refresh();
});

$(document).ready(function() {
  $(document).trigger('ca-stop');

  $('.ui-helper-hidden').removeClass('ui-helper-hidden');

  ca.view.refresh();
});
