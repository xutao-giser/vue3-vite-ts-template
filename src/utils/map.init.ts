import { mainConfig } from '@/store';
import * as Cesium from 'cesium';
import axios from 'axios';

class CesiumMap {
  viewer!: Cesium.Viewer;
  private center = [102.959256, 25.254609];
  constructor(container: string, config?: Cesium.Viewer.ConstructorOptions | undefined) {
    this.viewer = new Cesium.Viewer(container, {
      animation: false, // 是否创建动画小器件，左下角仪表
      timeline: false,  // 是否显示时间轴
      fullscreenButton: false,  // 是否显示全屏按钮
      navigationHelpButton: false,   // 是否显示右上角的帮助按钮
      sceneModePicker: false, // 是否显示3D/2D选择器
      geocoder: false,  // 是否显示geocoder小器件，右上角查询按钮
      homeButton: false,  // 是否显示Home按钮
      baseLayerPicker: false, // 是否显示图层选择器
      infoBox: false, // 是否显示信息框
      selectionIndicator: false,  // 是否显示选取指示器组件
      orderIndependentTranslucency: false,  //设置背景透明
      sceneMode: Cesium.SceneMode.SCENE3D, // 初始场景模式
      scene3DOnly: true, // 如果设置为true，则所有几何图形以3D模式绘制以节约GPU资源
      ...config
    });
    this.viewer.scene.moon.show = false;
    (this.viewer.cesiumWidget.creditContainer as any).style.display = 'none';
    this.cancelTileError();
    this.listenMousePosition();
  }

  destroy() {
    this.viewer.destroy();
  }

  disableControl() {
    this.viewer.scene.screenSpaceCameraController.enableZoom = false
    this.viewer.scene.screenSpaceCameraController.enableRotate = false
    this.viewer.scene.screenSpaceCameraController.enableTilt = false
  }

  enableControl() {
    this.viewer.scene.screenSpaceCameraController.enableZoom = true
    this.viewer.scene.screenSpaceCameraController.enableRotate = true
    this.viewer.scene.screenSpaceCameraController.enableTilt = true
  }

  /**加载完底图的回调，在构建对象时手动调用 */
  loadedBaseMap() {
    return new Promise(reject => {
      const helper = new Cesium.EventHelper();
      helper.add(this.viewer.scene.globe.tileLoadProgressEvent, function () {
        helper.removeAll();
        reject(null);
      });
    });
  }

  cancelTileError() {
    Cesium.TileProviderError.handleError = (previousError, _provider, event): any => {
      const error = previousError;
      if (event.numberOfListeners > 0) {
        event.raiseEvent(error);
      }
      return error;
    };
  }

  flyToPosition(
    lng: number,
    lat: number,
    height: number,
    callback?: Cesium.Camera.FlightCompleteCallback
  ) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      duration: 1,
      complete: callback
    });
  }

  flyToExtent(extent: number[], callback?: Cesium.Camera.FlightCompleteCallback) {
    this.viewer.camera.flyTo({
      duration: 1,
      destination: Cesium.Rectangle.fromDegrees(...extent),
      complete: callback
    });
  }

  flyToTarget(target: any, callback?: any) {
    const isDone = this.viewer.flyTo(target, {
      duration: 0,
      offset: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-90),
        range: 0.0
      }
    });
    callback(isDone);
  }

  setView(lng: number, lat: number, height?: number) {
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height)
    });
  }

  /**返回viewer */
  getViewer() {
    return this.viewer;
  }

  getCenter() {
    return this.center;
  }

  toHome(callback?: Cesium.Camera.FlightCompleteCallback) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(this.center[0], this.center[1], 25000000),
      duration: 1
    });
    callback && callback();
  }

  listenMousePosition(callback?: (position: { longitude: number; latitude: number }) => void) {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }
      callback && callback(this.cartesian3ToDegree(cartesian));
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  createPolygonPrimitive(geometry,name,color: Cesium.Color = Cesium.Color.RED) {
    const coords: number[] = [];
    const type = geometry.type;
    const coordinates =
      type === 'MultiPolygon' ? geometry.coordinates[0][0] : geometry.coordinates[0];
    coordinates.forEach((e: number[]) => {
      coords.push(...e);
    });
    const instance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(coords)
        )
      }),
      id:name
    })
    return new Cesium.Primitive({
      geometryInstances: instance,
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        aboveGround: true,
        material: Cesium.Material.fromType('Color', {
          color
        })
      })
    })
  }

  addPolygonGeojsonPrimitive(geojson,name:string,color: Cesium.Color = Cesium.Color.RED) {
    const collection = new Cesium.PrimitiveCollection();
    geojson.features.forEach(feature => {
      const { geometry } = feature;
      const primitive = this.createPolygonPrimitive(geometry,name,color)
      collection.add(primitive);
    });
    this.viewer.scene.primitives.add(collection)
    return collection
  }

  createPolylinePrimitive(geometry,name,color: Cesium.Color = Cesium.Color.RED) {
    const coords: number[] = [];
    const type = geometry.type;
    const coordinates =
      type === 'MultiLineString' || type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : geometry.coordinates[0];
    coordinates.forEach((e: number[]) => {
      coords.push(...e);
    });
    const instance = new Cesium.GeometryInstance({
      geometry: new Cesium.GroundPolylineGeometry({
        positions: Cesium.Cartesian3.fromDegreesArray(coords),
        width: 3
      }),
      id:name
    });
    return new Cesium.GroundPolylinePrimitive({
      geometryInstances: instance,
      appearance: new Cesium.PolylineMaterialAppearance({
        material: Cesium.Material.fromType('Color', {
          color
        })
      })
    });
  }

  addPolylineGeojsonPrimitive(geojson,name:string,color: Cesium.Color = Cesium.Color.RED) {
    const collection = new Cesium.PrimitiveCollection();
    geojson.features.forEach(feature => {
      const { geometry } = feature;
      const primitive = this.createPolylinePrimitive(geometry,name,color)
      collection.add(primitive);
    });
    this.viewer.scene.primitives.add(collection)
    return collection
  }

  addGeoserverWMTS(layer: string): Cesium.ImageryLayer {
    const provider = new Cesium.WebMapTileServiceImageryProvider({
      url: `${mainConfig.geoserverUrl}/geoserver/gwc/service/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER=${layer}&tileMatrixSet=EPSG:4326&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&format=image/vnd.jpeg-png&transparent=TRUE`,
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
    });
    return this.viewer.imageryLayers.addImageryProvider(provider);
  }

  addGeoserverLayer(layers: string, opt: any = {}, url = '', index?: number): Cesium.ImageryLayer {
    const provider = new Cesium.WebMapServiceImageryProvider({
      url: url ? url : `${mainConfig.geoserverUrl}/geoserver/wms`,
      layers,
      parameters: {
        service: 'WMS',
        format: 'image/png',
        transparent: true,
        ...opt
      }
    });
    return (index as number) >= 0
      ? this.viewer.imageryLayers.addImageryProvider(provider, index)
      : this.viewer.imageryLayers.addImageryProvider(provider);
  }

  removeService(service: Cesium.ImageryLayer, destroy?: boolean) {
    this.viewer.imageryLayers.remove(service, destroy);
  }

  removeTopService() {
    const layers = this.viewer.imageryLayers;
    if (layers.length > 2) {
      const topLayer = layers.get(layers.length - 1);
      this.viewer.imageryLayers.remove(topLayer);
    }
  }

  removeAllService() {
    const layers = this.viewer.imageryLayers;
    for (let i = 0; i < layers.length; i++) {
      if (i > 1) {
        this.viewer.imageryLayers.remove(layers.get(i));
      }
    }
    this.viewer.scene.groundPrimitives.removeAll();
    if (layers.length > 2) {
      this.removeAllService();
    }
  }

  removeSeviceByIndex(index: number) {
    const layer = this.viewer.imageryLayers.get(index);
    this.viewer.imageryLayers.remove(layer);
  }

  getImageLayersLength() {
    const layers = this.viewer.imageryLayers;
    return layers.length;
  }

  async getGeoserverLayerInfo(layer: string) {
    const url = `${mainConfig.geoserverUrl}/geoserver/wms?service=wms&request=GetCapabilities&LAYER=${layer}&format=application/json`;
    return axios.get(url);
  }

  addGeoJson(json: Cesium.GeoJsonDataSource, opts?: Cesium.GeoJsonDataSource.LoadOptions) {
    const datasource: any = Cesium.GeoJsonDataSource.load(json, opts);
    this.viewer.dataSources.add(datasource);
    return datasource;
  }

  private cartesian3ToDegree(cartesian3: Cesium.Cartesian3) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian3);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    return {
      longitude,
      latitude
    };
  }
}

export default CesiumMap;
