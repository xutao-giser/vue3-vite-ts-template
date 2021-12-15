import { App } from 'vue';
import {
  ElTag,
  ElSkeleton,
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElScrollbar,
  ElButton,
  ElCol,
  ElRow,
  ElSpace,
  ElDivider,
  ElCard,
  ElDropdown,
  ElDialog,
  ElMenu,
  ElMenuItem,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInput,
  ElForm,
  ElFormItem,
  ElPopper,
  ElTooltip,
  ElPagination,
  ElAlert,
  ElRadioButton,
  ElRadioGroup
} from 'element-plus';
import 'element-plus/lib/theme-chalk/index.css'

export default (app: App<Element>) => {
  app.use(ElButton)
    .use(ElTag)
    .use(ElSkeleton)
    .use(ElBreadcrumb)
    .use(ElBreadcrumbItem)
    .use(ElScrollbar)
    .use(ElCol)
    .use(ElRow)
    .use(ElSpace)
    .use(ElDivider)
    .use(ElCard)
    .use(ElDropdown)
    .use(ElDialog)
    .use(ElMenu)
    .use(ElMenuItem)
    .use(ElDropdownItem)
    .use(ElDropdownMenu)
    .use(ElIcon)
    .use(ElInput)
    .use(ElForm)
    .use(ElFormItem)
    .use(ElTooltip)
    .use(ElPagination)
    .use(ElAlert)
    .use(ElPopper)
    .use(ElRadioButton)
    .use(ElRadioGroup)
}
