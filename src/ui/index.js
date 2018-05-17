import $ from 'jquery';

import 'jquery-ui/ui/core';
import 'jquery-ui/ui/widgets/autocomplete';
import 'jquery-ui/ui/widgets/button';
import 'jquery-ui/ui/widgets/spinner';
import 'jquery-ui/ui/widgets/selectmenu';
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/autocomplete.css';
import 'jquery-ui/themes/base/button.css';
import 'jquery-ui/themes/base/controlgroup.css';
import 'jquery-ui/themes/base/spinner.css';
import 'jquery-ui/themes/base/selectmenu.css';
import 'jquery-ui/themes/base/theme.css';

import 'jscolor-picker';

import 'toastr/toastr.scss';

import ca from 'ca';

import dialogs from './dialogs/';
import cellFieldModeSwitch from './cell-field-mode';
import generationsSkip from './generations-skip';


$.extend($.ui.autocomplete.prototype.options, {
  delay: 0,
  minLength: 0,
  create() {
    $(this).click(function() {
      $(this).autocomplete('search');
    });
  }
});

$.widget('ui.spinner', $.ui.spinner, {
  _create() {
    this.element.attr('maxlength', this.options.max.toString(10).length);

    return this._super();
  }
});


$(document).ready(function() {
  dialogs.init();
  cellFieldModeSwitch.init();
  generationsSkip.init();

  $('.toolbar').buttonset();

  $('.content > .controls')
    .find('button').button().end()
    .on('click.ca-dialog', '[data-dialog]', function() {
      $(`#${$(this).attr('data-dialog')}`).confirmDialog('open');
    })
    .on('click.ca-action', '[data-action]', function() {
      ca[$(this).attr('data-action')]();
    });


  $('#save-as-image').click(function() {
    ca.view.download();
  });
}).on({
  'ca-start'() {
    $('.ca-start-disable').addClass('ui-state-disabled');
    $('.ca-start-hide').hide();
    $('.ca-start-show').show();
  },
  'ca-stop'() {
    $('.ca-start-disable').removeClass('ui-state-disabled');
    $('.ca-start-hide').show();
    $('.ca-start-show').hide();
  }
});
