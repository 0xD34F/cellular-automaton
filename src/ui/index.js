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

$(document).ready(function() {
  $('#app').append(ca.view.element);
});
