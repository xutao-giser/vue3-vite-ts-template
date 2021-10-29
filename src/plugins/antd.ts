import type { App } from 'vue';
import {
  Select,
  Input,
  DatePicker,
  Upload,
  Button,
  Checkbox,
  Radio,
  Image,
  Popover,
  //Pagination,
  Modal,
  Menu,
  Dropdown,
  Form
} from 'ant-design-vue'
import 'ant-design-vue/dist/antd.less'

export default (app: App<Element>) => {
  app.use(Select)
    .use(Button)
    .use(Input)
    .use(Radio)
    .use(DatePicker)
    .use(Upload)
    .use(Modal)
    .use(Menu)
    .use(Form)
    .use(Image)
    .use(Dropdown)
    .use(Popover)
    .use(Checkbox);
};
