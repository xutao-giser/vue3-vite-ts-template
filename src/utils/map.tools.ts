import * as Cesium from 'cesium';
import CesiumMap from './map.init';

export default class RotateMap {
  private viewer: Cesium.Viewer;
  private listener:EventListener;
  private previousTime = 0;
  constructor(map: CesiumMap) {
    this.viewer = map.getViewer();
    this.listener = () =>  {
      if (!this.viewer || this.viewer.scene.mode !== Cesium.SceneMode.SCENE3D) {
        return;
      }
      const currentTime = this.viewer.clock.currentTime.secondsOfDay
      const delta = (currentTime - this.previousTime) / 1000
      this.previousTime = currentTime
      this.viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -delta)
    }
  }

  start(speed?:number){
    this.viewer.clock.multiplier = speed || 100 //速度
    this.viewer.clock.shouldAnimate = true
    this.previousTime = this.viewer.clock.currentTime.secondsOfDay
    this.viewer.clock.onTick.addEventListener(this.listener)
  }

  stop() {
    if(!this.viewer){
      return
    }
    this.viewer.clock.onTick.removeEventListener(this.listener)
    this.viewer.clock.shouldAnimate = false
  }

}
