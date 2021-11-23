import { Cartesian3, ScreenSpaceEventHandler, Viewer, LabelGraphics,Entity } from 'cesium';
import * as Cesium from 'cesium';
import CesiumMap from './map.init';

const tipLabelStyle: LabelGraphics.ConstructorOptions = {
  showBackground: true,
  font: '10px sans-serif',
  fillColor: Cesium.Color.WHITE,
  backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
  pixelOffset: new Cesium.Cartesian2(20, 0),
  disableDepthTestDistance: Number.POSITIVE_INFINITY
};

function cartesian3ToDegree(cartesian: Cartesian3) {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    height: cartographic.height
  };
}

function degreeToCartesian3(longitude: number, latitude: number, height?: number) {
  return Cartesian3.fromDegrees(longitude, latitude, height);
}

export class DrawTool {
  private viewer: Viewer;
  private polygonEntity!: Entity;
  private handler!: ScreenSpaceEventHandler | null;
  private polygonCoords: Cartesian3[] = [];
  private tipEntity: Entity = new Entity();

  constructor(map: CesiumMap) {
    this.viewer = map.getViewer();

    // 取消双击事件-追踪该位置
    this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
  }
  drawPolygon(cb?: (arr: number[][], area: number) => void) {
    if (this.handler) {
      return;
    }
    this.clearPolygon();
    this.tipEntity = this.viewer.entities.add({
      name: 'tip',
      label: {
        text: '单击开始绘制',
        ...tipLabelStyle
      }
    });
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.polygonEntity = this.viewer.entities.add({
      name: 'polygon',
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          return {
            positions: this.polygonCoords
          };
        }, false),
        material: Cesium.Color.fromCssColorString('#00E1FF').withAlpha(0.2)
      },
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return this.polygonCoords.concat(this.polygonCoords[0]);
        }, false),
        material: Cesium.Color.fromCssColorString('#00E1FF'),
        width: 2,
        clampToGround: true
      }
    });

    this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.position);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }

      if (this.polygonCoords.length == 0) {
        this.polygonCoords.push(cartesian.clone());
      }
      this.polygonCoords.push(cartesian);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.handler.setInputAction(movement => {
      const ray = this.viewer.camera.getPickRay(movement.endPosition);
      const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
      if (!cartesian || !Cesium.defined(cartesian)) {
        //跳出地球时异常
        return;
      }
      if (this.polygonCoords.length > 1) {
        this.polygonCoords.pop();
        this.polygonCoords.push(cartesian);
        (this.tipEntity as any).label.text = '右键结束';
        (this.tipEntity as any).label.heightReference = 20;
      }
      (this.tipEntity as any).position = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    this.handler.setInputAction(() => {
      this.viewer.entities.remove(this.tipEntity);
      this.destoryHandler();
      if (this.polygonCoords.length < 4) {
        this.viewer.entities.remove(this.polygonEntity);
      } else {
        this.polygonCoords.pop();
      }
      if (cb) {
        const arr: number[][] = [];
        this.polygonCoords.forEach(e => {
          const p = cartesian3ToDegree(e);
          arr.push([p.longitude, p.latitude]);
        });
        const area =
          this.polygonCoords.length > 0 && (this.getArea(this.polygonCoords) / 1000000).toFixed(2);
        cb(arr, Number(area));
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
  private destoryHandler() {
    if (this.handler) {
      this.handler.destroy(); //关闭事件句柄
      this.handler = null;
    }
  }

  private getArea(positions: Cartesian3[]) {
    console.log(positions, 'positions');

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

  clearPolygon() {
    this.destoryHandler();
    this.polygonCoords = [];
    if (this.polygonEntity) {
      this.viewer.entities.remove(this.polygonEntity);
    }
    if (this.tipEntity) {
      this.viewer.entities.remove(this.tipEntity);
    }
  }
}
