import * as Cesium from 'cesium'

export default class ClusterLayer {
  viewer: Cesium.Viewer
  clusterLayer!:Cesium.DataSource | any
  constructor (viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.clusterLayer = null as any
  }

  addData (pois: {x:number,y:number,label:string}[]) {
    if (pois instanceof Array) {
      this.clusterLayer = new Cesium.CustomDataSource()
      pois.forEach(element => {
        const entity = this.createEntity(element)
        this.clusterLayer.entities.add(entity)
      })
      const dataSourcePromise = this.viewer.dataSources.add(this.clusterLayer)
      dataSourcePromise.then(dataSource => {
        dataSource.clustering.enabled = true
        dataSource.clustering.pixelRange = 15
        dataSource.clustering.clusterPoints = false
        dataSource.clustering.minimumClusterSize = 3
        this.customStyle(dataSource)
      })
      return this
    } else {
      console.error('参数错误')
    }
  }

  addKmlData(url:string){
    this.clusterLayer = Cesium.KmlDataSource.load(url,{
      camera: this.viewer.scene.camera,
      canvas: this.viewer.scene.canvas
    });
    const dataSourcePromise = this.viewer.dataSources.add(
      this.clusterLayer
    );

    dataSourcePromise.then(dataSource => {
      dataSource.clustering.enabled = true
      dataSource.clustering.pixelRange = 15
      dataSource.clustering.clusterPoints = false
      dataSource.clustering.minimumClusterSize = 3
      this.customStyle(dataSource)
    })
    return this
  }

  createEntity (poi: { x: number; y: number; label: string }) {
    const { x, y, label } = poi
    const width = 250,height = 50
    const drawImage = (label:string) => {
      const canvas = document.createElement('canvas');
      canvas.width = width
      canvas.height = height
      const ctx:any = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(width/2, 15, 15, 0, Math.PI*2);
      ctx.fillStyle  = '#1afa29';
      ctx.fill();
      // 填充文字
      ctx.font = 'bold 15px Heiti'; 
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('企',width/2,15);
      ctx.fillText(label,width/2,40);
      return canvas
    }
    const img = drawImage(label).toDataURL('image/jpg')
    const entity = new Cesium.Entity({
      position: Cesium.Cartesian3.fromDegrees(x, y),
      // label: { //文字标签
      //   text: label,
      //   font: 'bold 5px',// 15pt monospace
      //   style: Cesium.LabelStyle.FILL,
      //   fillColor: Cesium.Color.WHITE,
      //   pixelOffset: new Cesium.Cartesian2(0,20),   //偏移量
      //   showBackground: false,
      //   scaleByDistance: new Cesium.NearFarScalar(1000, 0.8, 8000, 1),
      //   heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      // },
      billboard: {
        //图标
        image:img,
        width: width,
        height: height,
        scaleByDistance: new Cesium.NearFarScalar(1000, 0.8, 8000, 1),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    })
    return entity
  }

  customStyle (clusterLayer: Cesium.CustomDataSource) {
    const drawImage = (label:string|number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 50
      canvas.height = 50
      const ctx:any = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(25, 25, 20, 0, Math.PI*2);
      ctx.lineWidth=5;
      ctx.strokeStyle  = 'white';
      ctx.stroke();

      // 画红色的圆
      ctx.beginPath();
      ctx.arc(25, 25, 18, 0, Math.PI*2);
      ctx.fillStyle  = 'orange';
      ctx.fill();

      // 填充文字
      ctx.font = 'bold 16pt Microsoft YaHei'; 
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label,25,25);
      ctx.closePath();
      return canvas
    }
    
    clusterLayer.clustering.clusterEvent.addEventListener((clusteredEntities: any[], cluster: any) => {
      const img = drawImage(clusteredEntities.length).toDataURL('image/jpg')
      cluster.label.show = false
      cluster.billboard.show = true
      cluster.billboard.id = cluster.label.id;
      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
      cluster.billboard.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
      cluster.billboard.heightReference= Cesium.HeightReference.CLAMP_TO_GROUND;
      cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      cluster.billboard.image = img
    })

    // force a re-cluster with the new styling
    const pixelRange = clusterLayer.clustering.pixelRange
    clusterLayer.clustering.pixelRange = 0
    clusterLayer.clustering.pixelRange = pixelRange
  }

  removeData(){
    this.viewer.dataSources.remove(this.clusterLayer)
    //this.viewer.dataSources.removeAll()
  }

  setVisible(status:boolean){
    this.clusterLayer.show = status
  }
}
