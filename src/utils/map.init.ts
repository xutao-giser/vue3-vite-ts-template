import { mainConfig } from '@/store'
import * as Cesium from 'cesium'
import axios from 'axios'

class CesiumMap {
  viewer!: Cesium.Viewer
  private center = [102.959256, 25.254609]
  private primitiveBound!: Cesium.GroundPolylinePrimitive
  constructor(
    container: string,
    config?: Cesium.Viewer.ConstructorOptions | undefined
  ) {
    this.viewer = new Cesium.Viewer(container, {
      animation: false,
      timeline: false,
      fullscreenButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      geocoder: false,
      homeButton: false,
      baseLayerPicker: false,
      infoBox: false,
      selectionIndicator: false,
      orderIndependentTranslucency: false,
      ...config
    })
    const viewer: any = this.viewer
    // viewer.scene.sun.show = false
    viewer.scene.moon.show = false
    viewer._cesiumWidget._creditContainer.style.display = 'none'
    this.cancelTileError()
    this.listenMousePosition()
  }

  destroy() {
    this.viewer.destroy()
  }

  /**加载完底图的回调，在构建对象时手动调用 */
  loadedBaseMap() {
    return new Promise(reject => {
      const helper = new Cesium.EventHelper()
      helper.add(this.viewer.scene.globe.tileLoadProgressEvent, function () {
        helper.removeAll()
        reject(null)
      })
    })
  }

  cancelTileError(){
    Cesium.TileProviderError.handleError = (
      previousError,
      _provider,
      event
    ): any => {
      const error = previousError
      if (event.numberOfListeners > 0) {
        event.raiseEvent(error)
      }
      return error
    }
  }

  flyTo(
    lng: number,
    lat: number,
    height: number,
    callback?: Cesium.Camera.FlightCompleteCallback
  ) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      duration: 1,
      complete: callback
    })
  }

  setView(lng: number, lat: number, height?: number) {
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height)
    })
  }

  locateExtent(extent: number[]) {
    this.viewer.camera.flyTo({
      duration: 1,
      destination: Cesium.Rectangle.fromDegrees(...extent)
    })
  }

  /**返回viewer */
  getViewer() {
    return this.viewer
  }

  getCenter() {
    return this.center
  }

  toHome(callback?: Cesium.Camera.FlightCompleteCallback) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        this.center[0],
        this.center[1],
        25000000
      ),
      duration: 1
    })
    callback && callback()
  }

  listenMousePosition(
    callback?: (position: { longitude: number; latitude: number }) => void
  ) {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas)
    handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition)

      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene)
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return
      }
      callback && callback(this.cartesian3ToDegree(cartesian))
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  addGeoserverWMTS(layer: string): Cesium.ImageryLayer {
    const provider = new Cesium.WebMapTileServiceImageryProvider({
      url:`${mainConfig.geoserverUrl}/geoserver/gwc/service/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=${layer}&tileMatrixSet=EPSG:4326&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=image/vnd.jpeg-png&transparent=TRUE`,
      layer,
      style: 'default',
      tileMatrixSetID: 'EPSG:4326',
      tileMatrixLabels: [
        'EPSG:4326:0',
        'EPSG:4326:1',
        'EPSG:4326:2',
        'EPSG:4326:3',
        'EPSG:4326:4',
        'EPSG:4326:5',
        'EPSG:4326:6',
        'EPSG:4326:7',
        'EPSG:4326:8',
        'EPSG:4326:9',
        'EPSG:4326:10',
        'EPSG:4326:11',
        'EPSG:4326:12',
        'EPSG:4326:13',
        'EPSG:4326:14',
        'EPSG:4326:15',
        'EPSG:4326:16',
        'EPSG:4326:17',
        'EPSG:4326:18'
      ],
      maximumLevel: 18,
      tilingScheme: new Cesium.GeographicTilingScheme({
        //此处很重要，经度和纬度直接映射到X和Y
        numberOfLevelZeroTilesX: 2, //X方向上水平为0的图块数瓷砖树。
        numberOfLevelZeroTilesY: 1
      })
    })
    return this.viewer.imageryLayers.addImageryProvider(provider)
  }

  addGeoserverLayer(
    layers: string,
    url = '',
    opt: any = {},
    index?: number
  ): Cesium.ImageryLayer {
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: url ? url : `${mainConfig.geoserverUrl}/geoserver/wms`,
      layers,
      parameters: {
        service: 'WMS',
        format: 'image/png',
        transparent: true,
        ...opt
      }
    })
    return (index as number) >= 0
      ? this.viewer.imageryLayers.addImageryProvider(provider, index)
      : this.viewer.imageryLayers.addImageryProvider(provider)
  }

  removeService(service: Cesium.ImageryLayer, destroy?: boolean) {
    this.viewer.imageryLayers.remove(service, destroy)
  }

  removeTopService() {
    const layers = this.viewer.imageryLayers
    if (layers.length > 2) {
      const topLayer = layers.get(layers.length - 1)
      this.viewer.imageryLayers.remove(topLayer)
    }
  }

  removeAllService(){
    const layers = this.viewer.imageryLayers
    for(let i=0;i<layers.length;i++){
      if(i > 1){
        this.viewer.imageryLayers.remove(layers.get(i))
      }
    }
    this.viewer.scene.groundPrimitives.removeAll()
    if(layers.length > 2){
      this.removeAllService()
    }
  }

  removeSeviceByIndex(index:number) {
    const layer = this.viewer.imageryLayers.get(index)
    this.viewer.imageryLayers.remove(layer)
  }

  removeTopPrimitive() {
    const layers = this.viewer.scene.groundPrimitives
    if (layers.length > 0) {
      const topLayer = layers.get(layers.length - 1)
      this.viewer.scene.groundPrimitives.remove(topLayer)
    }
  }

  getImageLayersLength(){
    const layers = this.viewer.imageryLayers
    return layers.length
  }

  async getGeoserverLayerInfo(layer: string) {
    const url = `${mainConfig.geoserverUrl}/geoserver/wms?service=wms&request=GetCapabilities&LAYER=${layer}&format=application/json`
    return axios.get(url)
  }

  async loadGeoJson(path = '') {
    const dataPath = path ? path : `/config/map.yunnan.json`
    return axios.get(dataPath)
  }

  addGeoJson(json: Cesium.GeoJsonDataSource, opts?: Cesium.GeoJsonDataSource.LoadOptions) {
    const datasource: any = Cesium.GeoJsonDataSource.load(json, opts)
    this.viewer.dataSources.add(datasource)
  }

  loadBound(feature:any) {
    const coordinates = feature.geometry.coordinates[0][0]
    const arr: number[] = []
    coordinates.forEach((e: number[]) => {
      arr.push(...e)
    })
    const instance = new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray(arr),
        width: 3
      })
    })
    this.primitiveBound = new Cesium.GroundPolylinePrimitive({
      geometryInstances: instance,
      appearance: new Cesium.PolylineMaterialAppearance({
        material: Cesium.Material.fromType('Color', {
          color: Cesium.Color.RED
        })
      }),
      show: true
    })
    this.viewer.scene.groundPrimitives.add(this.primitiveBound)
  }

  showBound() {
    this.primitiveBound.show = true
  }

  hideBound() {
    this.primitiveBound.show = false
  }

  private cartesian3ToDegree(cartesian3: Cesium.Cartesian3) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian3)

    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    return {
      longitude,
      latitude
    }
  }
}

export default CesiumMap
