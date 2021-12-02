<template>
  <div ref="map" id="map_container" class="w-full h-full m-0 p-0">
    <slot />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  onUnmounted,
  getCurrentInstance
} from 'vue'
import * as Cesium from 'cesium'
import CesiumMap from '@/utils/map.init'

export default defineComponent({
  name: 'Map',
  props: {
    useDefaultRenderLoop: {
      type: Boolean,
      default: true
    },
    showRenderLoopErrors: {
      type: Boolean,
      default: false
    },
    automaticallyTrackDataSourceClocks: {
      type: Boolean,
      default: true
    },
    globalViewerMountOnWindow: {
      type: Boolean,
      default: true,
      required: false
    },
    cesiumToken: {
      type: String,
      default: ''
    },
    depthTestAgainstTerrain: {
      type: Boolean,
      default: false
    },
    shadows: {
      type: Boolean,
      default: false
    },
    terrainShadows: {
      type: Number,
      default: Cesium.ShadowMode.RECEIVE_ONLY
    }
  },
  setup(props) {
    const DEFAULT_OPT = {
      // clock: new Cesium.Clock(), // 用于控制当前时间的时钟对象
      // selectedImageryProviderViewModel: undefined, // 当前图像图层的显示模型，仅baseLayerPicker设为true有意义
      // imageryProviderViewModels: Cesium.createDefaultImageryProviderViewModels(), // 可供BaseLayerPicker选择的图像图层ProviderViewModel数组
      // selectedTerrainProviderViewModel: undefined, // 当前地形图层的显示模型，仅baseLayerPicker设为true有意义
      // terrainProviderViewModels: Cesium.createDefaultTerrainProviderViewModels(), // 可供BaseLayerPicker选择的地形图层ProviderViewModel数组
      imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
        url: 'https://{s}.tianditu.gov.cn/img_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=img&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=2bd8e21e1841956852e386219700d737',
        layer: 'img_w',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'GoogleMapsCompatible',
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
        maximumLevel: 18
      }), // 图像图层提供者，仅baseLayerPicker设为false有意义
      // terrainProvider: undefined, // 地形图层提供者，仅baseLayerPicker设为false有意义
      terrainProvider: Cesium.createWorldTerrain(), 
      // fullscreenElement: document.body, // 全屏时渲染的HTML元素,
      useDefaultRenderLoop: props.useDefaultRenderLoop, // 如果需要控制渲染循环，则设为true
      // targetFrameRate: undefined, // 使用默认render loop时的帧率
      showRenderLoopErrors: props.showRenderLoopErrors, // 如果设为true，将在一个HTML面板中显示渲染错误信息
      // automaticallyTrackDataSourceClocks: true, // 自动追踪最近添加的数据源的时钟设置
      // contextOptions: undefined, // 传递给Scene对象的上下文参数（scene.options）
      // mapProjection: new Cesium.WebMercatorProjection(), //地图投影体系
      // dataSources: new Cesium.DataSourceCollection() // 需要进行可视化的数据源的集合
      shadows: props.shadows,
      terrainShadows: props.terrainShadows,
      skyBox: new Cesium.SkyBox({
        sources: {
          positiveX: 'skyBox/left.jpg',
          negativeX: 'skyBox/right.jpg',
          positiveY: 'skyBox/down.jpg',
          negativeY: 'skyBox/up.jpg',
          positiveZ: 'skyBox/front.jpg',
          negativeZ: 'skyBox/back.jpg'
        }
      })// 用于渲染星空的SkyBox对象
    }
    const addTiandituLabelLayer = (viewer: Cesium.Viewer): void => {
      const provider = new Cesium.WebMapTileServiceImageryProvider({
        url: 'https://{s}.tianditu.gov.cn/cia_c/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=cia&tileMatrixSet=c&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk=feff991159823907566acaa7273472ea',
        layer: 'img',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'c',
        tileMatrixLabels: [
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
          '13',
          '14',
          '15',
          '16',
          '17',
          '18'
        ],
        tilingScheme: new Cesium.GeographicTilingScheme(),
        credit: new Cesium.Credit('天地图全球影像服务'),
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
        maximumLevel: 18
      })

      provider.readyPromise.then(() => {
        const layer = viewer.imageryLayers.addImageryProvider(provider)
        viewer.imageryLayers.raiseToTop(layer)
      })
    }
    const { appContext : { config: { globalProperties:ctx } } } = getCurrentInstance() as any

    const initMap = (): Cesium.Viewer => {
      ctx.$map = new CesiumMap('map_container',DEFAULT_OPT)
      const viewer = ctx.$map.viewer
      ctx.$map.toHome()
      return viewer
    }

    onMounted(() => {
      const viewer = initMap()
      addTiandituLabelLayer(viewer)
    })

    onUnmounted(() => {
      ctx.$map.destroy()
    })

    return {
      initMap
    }
  }
})
</script>
