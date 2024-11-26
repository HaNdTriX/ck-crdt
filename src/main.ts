import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { CkeditorPlugin } from '@ckeditor/ckeditor5-vue'

createApp(App).use(CkeditorPlugin).mount('#app')
