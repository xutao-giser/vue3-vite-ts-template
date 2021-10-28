import type { App } from 'vue';
import {
  // Table,
  // Card,
  // Avatar,
  Select,
  // Breadcrumb,
  // Tag,
  // Descriptions,
  Input,
  DatePicker,
  Upload,
  Button,
  //Tree,
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
    //.use(Breadcrumb)
    .use(Button)
    .use(Input)
    .use(Radio)
    .use(DatePicker)
    .use(Upload)
    //.use(Descriptions)
    .use(Modal)
    .use(Menu)
    .use(Form)
    .use(Image)
    .use(Dropdown)
    .use(Popover)
    //.use(Pagination)
    .use(Checkbox);
};
