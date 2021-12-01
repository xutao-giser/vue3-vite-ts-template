import * as Cesium from 'cesium';
import { Cartesian3, Cartographic, Entity, ScreenSpaceEventHandler, Viewer } from 'cesium';
import CesiumMap from './map.init';
import { throttle } from 'lodash-es';

let floatingPoint: Entity;
const point = {
  pixelSize: 8,
  color: Cesium.Color.WHITE,
  outlineColor: Cesium.Color.RED,
  outlineWidth: 2,
  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  disableDepthTestDistance: Number.POSITIVE_INFINITY
};
const labelStyle = {
  font: '18px',
  fillColor: Cesium.Color.BLACK,
  style: Cesium.LabelStyle.FILL,
  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  pixelOffset: new Cesium.Cartesian2(0, -15),
  showBackground: true,
  backgroundColor: Cesium.Color.WHITE,
  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  disableDepthTestDistance: Number.POSITIVE_INFINITY
};

const tipLabelStyle = {
  showBackground: true,
  font: '10px sans-serif',
  fillColor: Cesium.Color.WHITE,
  style: Cesium.LabelStyle.FILL,
  backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
  pixelOffset: new Cesium.Cartesian2(20, 0),
  scaleByDistance: undefined,
  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  disableDepthTestDistance: Number.POSITIVE_INFINITY
};

export class MeasureTool {
  private viewer: Viewer;
  private handler!: ScreenSpaceEventHandler | null;
  private positionsDic: { [key: string]: Cartesian3[] } = {};
  private pointArr: string[] = [];
  private distance = 0;
  private tipEntity!: Entity;
  constructor(map: CesiumMap) {
    this.viewer = map.getViewer();

    // 取消双击事件-追踪该位置
    this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
  }

  enableDistanceMode() {
    // this.clear()
    if (this.handler) {
      return;
    }
    this.tipEntity = this.viewer.entities.add({
      name: 'tip',
      label: {
        text: '单击确定起点',
        ...tipLabelStyle
      }
    });
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    const entity = this.viewer.entities.add({
      name: '直线',
      polyline: {
        positions: new Cesium.CallbackProperty(() => this.positionsDic[entity.id], false),
        material: Cesium.Color.ORANGERED.withAlpha(0.7),
        width: 3,
        clampToGround: true
      }
    });
    this.positionsDic[entity.id] = [];

    this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }
      if (this.positionsDic[entity.id].length > 1) {
        this.positionsDic[entity.id].pop();
        this.positionsDic[entity.id].push(cartesian);
      }

      (this.tipEntity as any).position = new Cesium.CallbackProperty(function () {
        return cartesian;
      }, false);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const clickEvent:any = this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.position);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }
      if (this.positionsDic[entity.id].length == 0) {
        this.positionsDic[entity.id].push(cartesian.clone());
        floatingPoint = this.viewer.entities.add({
          name: '空间距离',
          position: cartesian,
          point,
          label: {
            text: '起点',
            ...labelStyle
          }
        });
        this.pointArr.push(floatingPoint.id);
        this.positionsDic[entity.id].push(cartesian);
        (this.tipEntity as any).label.text = '右键结束';
      } else {
        this.positionsDic[entity.id].push(cartesian);
        this.getSpaceDistance(this.positionsDic[entity.id]);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    throttle(clickEvent,400)

    this.handler.setInputAction(() => {
      this.positionsDic[entity.id].pop(); //最后一个点无效
      if (this.positionsDic[entity.id].length === 1) {
        this.pointArr.pop();
        this.viewer.entities.remove(floatingPoint);
      }
      this.distance = 0;
      this.viewer.entities.remove(this.tipEntity);
      this.destoryHandler();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  enableAreaMode() {
    if (this.handler) {
      return;
    }
    this.tipEntity = this.viewer.entities.add({
      name: 'tip',
      label: {
        text: '单击确定起点',
        ...tipLabelStyle
      }
    });
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    const entity = this.viewer.entities.add({
      name: '多边形',
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          return {
            positions: this.positionsDic[entity.id]
          };
        }, false),
        material: Cesium.Color.BLUE.withAlpha(0.3)
      },
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.positionsDic[entity.id].concat(this.positionsDic[entity.id][0]);
        }, false),
        material: Cesium.Color.BLUE.withAlpha(0.5),
        width: 3,
        clampToGround: true
      }
    });
    this.positionsDic[entity.id] = [];

    this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }
      if (this.positionsDic[entity.id].length > 1) {
        this.positionsDic[entity.id].pop();
        this.positionsDic[entity.id].push(cartesian);
      }
      //(this.tipEntity as any).position = cartesian
      (this.tipEntity as any).position = new Cesium.CallbackProperty(function () {
        return cartesian;
      }, false);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    const clickEvent:any = this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.position);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }

      if (this.positionsDic[entity.id].length == 0) {
        this.positionsDic[entity.id].push(cartesian.clone());
      }
      this.positionsDic[entity.id].push(cartesian);
      (this.tipEntity as any).label.text = '右键结束';
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    throttle(clickEvent, 400);

    this.handler.setInputAction(() => {
      this.viewer.entities.remove(this.tipEntity);
      if (this.positionsDic[entity.id].length < 4) {
        this.removeEntity(entity.id);
      } else {
        this.positionsDic[entity.id].pop();
        const area = this.getArea(this.positionsDic[entity.id]);
        //console.log(this.getGravityCenter(this.positionsDic[entity.id]))
        const displayArea =
          area > 10000 ? `${(area / 1000000).toFixed(2)} km²` : `${area.toFixed(2)} m²`;

        floatingPoint = this.viewer.entities.add({
          name: '面积',
          position: this.getGravityCenter(this.positionsDic[entity.id]),
          point,
          label: {
            text: displayArea,
            ...labelStyle
          }
        });
        this.pointArr.push(floatingPoint.id);
      }
      this.destoryHandler();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  private destoryHandler() {
    if (this.handler) {
      this.handler.destroy(); //关闭事件句柄
      this.handler = null;
    }
  }

  removeEntity(id: string) {
    this.viewer.entities.removeById(id);
  }

  clear() {
    Object.keys(this.positionsDic).forEach(id => {
      this.removeEntity(id);
    });
    this.positionsDic = {};
    this.pointArr.forEach(id => {
      this.removeEntity(id);
    });
    this.pointArr = [];
    if (this.tipEntity) {
      this.viewer.entities.remove(this.tipEntity);
    }
    this.destoryHandler();
    console.log('清除');
  }

  private getSpaceDistance(positions: Cartesian3[]) {
    //只计算最后一截，与前面累加
    //因move和鼠标左击事件，最后两个点坐标重复
    const i = positions.length - 3;
    const point1cartographic = Cesium.Cartographic.fromCartesian(positions[i]);
    const point2cartographic = Cesium.Cartographic.fromCartesian(positions[i + 1]);
    this.getTerrainDistance(
      point1cartographic,
      point2cartographic,
      positions[positions.length - 1]
    );
  }

  private getTerrainDistance(
    point1cartographic: Cartographic,
    point2cartographic: Cartographic,
    position: Cartesian3
  ) {
    const geodesic = new Cesium.EllipsoidGeodesic();
    geodesic.setEndPoints(point1cartographic, point2cartographic);
    const s = geodesic.surfaceDistance;
    const cartoPts = [point1cartographic];
    for (let jj = 1000; jj < s; jj += 1000) {
      //分段采样计算距离
      const cartoPt = geodesic.interpolateUsingSurfaceDistance(jj);
      //                console.log(cartoPt);
      cartoPts.push(cartoPt);
    }
    cartoPts.push(point2cartographic);
    //返回两点之间的距离
    const promise = Cesium.sampleTerrain(this.viewer.terrainProvider, 12, cartoPts);
    (Cesium as any).when(promise, (updatedPositions: Cartographic[]) => {
      // positions height have been updated.
      // updatedPositions is just a reference to positions.
      for (let jj = 0; jj < updatedPositions.length - 1; jj++) {
        const geoD = new Cesium.EllipsoidGeodesic();
        geoD.setEndPoints(updatedPositions[jj], updatedPositions[jj + 1]);
        let innerS = geoD.surfaceDistance;
        innerS = Math.sqrt(
          Math.pow(innerS, 2) +
            Math.pow(updatedPositions[jj + 1].height - updatedPositions[jj].height, 2)
        );
        this.distance += innerS;
      }

      //在三维场景中添加Label
      const textDisance = (this.distance / 1000.0).toFixed(2) + ' km';
      floatingPoint = this.viewer.entities.add({
        name: '贴地距离',
        position,
        point,
        label: {
          text: textDisance,
          ...labelStyle
        }
      });
      this.pointArr.push(floatingPoint.id);
    });
  }

  private getArea(positions: Cartesian3[]) {
    const x: number[] = [0];
    const y: number[] = [0];
    const geodesic = new Cesium.EllipsoidGeodesic();
    const radiansPerDegree = Math.PI / 180.0; //角度转化为弧度(rad)
    //数组x,y分别按顺序存储各点的横、纵坐标值
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];
      const point1cartographic = Cesium.Cartographic.fromCartesian(p1);
      const point2cartographic = Cesium.Cartographic.fromCartesian(p2);
      geodesic.setEndPoints(point1cartographic, point2cartographic);
      const s = geodesic.surfaceDistance;
      // console.log(s, p2.y - p1.y, p2.x - p1.x)
      const lat1 = point2cartographic.latitude * radiansPerDegree;
      const lon1 = point2cartographic.longitude * radiansPerDegree;
      const lat2 = point1cartographic.latitude * radiansPerDegree;
      const lon2 = point1cartographic.longitude * radiansPerDegree;
      let angle = -Math.atan2(
        Math.sin(lon1 - lon2) * Math.cos(lat2),
        Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)
      );
      if (angle < 0) {
        angle += Math.PI * 2.0;
      }
      console.log('角度：' + (angle * 180) / Math.PI);

      y.push(Math.sin(angle) * s + y[i]);
      x.push(Math.cos(angle) * s + x[i]);
    }

    let sum = 0;
    for (let i = 0; i < x.length - 1; i++) {
      sum += x[i] * y[i + 1] - x[i + 1] * y[i];
    }
    // console.log(x, y)

    return Math.abs(sum + x[x.length - 1] * y[0] - x[0] * y[y.length - 1]) / 2;
  }

  private getGravityCenter(positions: Cartesian3[]) {
    let area = 0;
    let gravityLat = 0;
    let gravityLng = 0;
    const degrees: { longitude: number; latitude: number }[] = [];
    positions.forEach(e => {
      degrees.push(this.cartesian3ToDegree(e));
    });

    degrees.push(this.cartesian3ToDegree(positions[0]));

    for (let i = 0; i < degrees.length - 1; i++) {
      const lat = degrees[i].latitude;
      const lng = degrees[i].longitude;
      const nextLat = degrees[i + 1].latitude;
      const nextLng = degrees[i + 1].longitude;
      const tempArea = (nextLat * lng - nextLng * lat) / 2;
      area += tempArea;
      gravityLat += (tempArea * (lat + nextLat)) / 3;
      gravityLng += (tempArea * (lng + nextLng)) / 3;
    }

    gravityLat = gravityLat / area;
    gravityLng = gravityLng / area;

    return Cesium.Cartesian3.fromDegrees(gravityLng, gravityLat);
  }

  private cartesian3ToDegree(cartesian3: Cartesian3) {
    const cartographic = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian3);

    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    return {
      longitude,
      latitude
    };
  }
}
