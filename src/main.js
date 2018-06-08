import Vue from 'vue';
import Element from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import locale from 'element-ui/lib/locale/lang/en';
import Icon from 'vue-icon';
import App from './App.vue';

Vue.use(Element, { locale });
Vue.use(Icon, 'v-icon');


new Vue({
  el: '#app',
  render: h => h(App)
});
