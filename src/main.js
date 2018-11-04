import Vue from 'vue';
import { Button, ButtonGroup, Dialog, Form, FormItem, Dropdown, DropdownMenu, DropdownItem, Autocomplete, Input, InputNumber, Checkbox, Select, Option, Card, ColorPicker } from 'element-ui';
import lang from 'element-ui/lib/locale/lang/en';
import locale from 'element-ui/lib/locale';
import Icon from 'vue-icon';
import App from './App.vue';
import store from './store/';


locale.use(lang);

Vue.use(Button);
Vue.use(ButtonGroup);
Vue.use(Dialog);
Vue.use(Form);
Vue.use(FormItem);
Vue.use(Dropdown);
Vue.use(DropdownMenu);
Vue.use(DropdownItem);
Vue.use(Autocomplete);
Vue.use(Input);
Vue.use(InputNumber);
Vue.use(Checkbox);
Vue.use(Select);
Vue.use(Option);
Vue.use(Card);
Vue.use(ColorPicker);
Vue.use(Icon, 'v-icon');


new Vue({
  el: '#app',
  store,
  render: h => h(App),
});
