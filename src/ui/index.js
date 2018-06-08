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

import ca from 'ca';
import { limitation } from 'utils';

import './settings-table/';

import dialogs from './dialogs/';


$.widget('ui.spinner', $.ui.spinner, {
  _create() {
    const {
      element,
      options
    } = this;

    element.on('input', function() {
      element.val(limitation(parseInt(element.val(), 10), options.min, options.max));
    });

    return this._super();
  }
});


$(document).ready(function() {
  dialogs.init();

  $('#app').append(ca.view.element);
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
