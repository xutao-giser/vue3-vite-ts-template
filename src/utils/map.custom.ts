import * as Cesium from 'cesium'

export function addCustom3DTileset(
  url: string,
  viewer: Cesium.Viewer,
  style: Cesium.Cesium3DTileStyle
) {
  const tilesets = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
      url: url //切片url
    })
  )
  tilesets.readyPromise.then(function (
    tileset:
      | Cesium.Entity
      | Cesium.Entity[]
      | Cesium.EntityCollection
      | Cesium.DataSource
      | Cesium.ImageryLayer
      | Cesium.Cesium3DTileset
      | Cesium.TimeDynamicPointCloud
      | Promise<
          | Cesium.Entity
          | Cesium.Entity[]
          | Cesium.EntityCollection
          | Cesium.DataSource
          | Cesium.ImageryLayer
          | Cesium.Cesium3DTileset
          | Cesium.TimeDynamicPointCloud
        >
  ) {
    tileset.style = style
    tileset.tileVisible.addEventListener((tile: { content: any }) => {
      const content = tile.content
      const featuresLength = content.featuresLength
      for (let i = 0; i < featuresLength; i += 2) {
        const feature = content.getFeature(i)
        const model = feature.content._model

        if (model && model._sourcePrograms && model._rendererResources) {
          Object.keys(model._sourcePrograms).forEach(key => {
            const program = model._sourcePrograms[key]
            const fragmentShader =
              model._rendererResources.sourceShaders[program.fragmentShader]
            let vPosition = ''
            if (fragmentShader.indexOf('v_positionEC;') !== -1) {
              vPosition = 'v_positionEC'
            } else if (fragmentShader.indexOf('v_pos;') !== -1) {
              vPosition = 'v_pos'
            }
            const color = `vec4(${feature.color.toString()})`

            // 自定义着色器
            model._rendererResources.sourceShaders[program.fragmentShader] = `
                      varying vec3 ${vPosition};
                      void main(void){
                          /* 渐变效果*/
                          vec4 v_helsing_position = czm_inverseModelView * vec4(${vPosition},1);  // 眼睛坐标解算出模型坐标
                          float stc_pl = fract(czm_frameNumber / 120.0) * 3.14159265 * 2.0;     //取小数部分
                          float stc_sd = v_helsing_position.z / 50.0 + sin(stc_pl) * 0.1;
                          gl_FragColor = ${color};    // 基础颜色
                          gl_FragColor *= vec4(stc_sd, stc_sd, stc_sd, 1.0);     //按模型高度进行颜色变暗处理
                          /* 扫描线 */
                          float glowRange = 360.0;    // 光环的移动范围(高度)，最高到360米
                          float stc_a13 = fract(czm_frameNumber / 360.0);     //计算当前着色器的事件，帧率
                          //float stc_h = clamp(v_stcVertex.z / glowRange, 0.0, 1.0);
                          float stc_h = clamp(v_helsing_position.z / glowRange, 0.0, 1.0);    // 归一化
                          stc_a13 = abs(stc_a13 - 0.5) * 2.0;
                          float stc_diff = step(0.005, abs(stc_h - stc_a13));  //根据时间来计算颜色差异
                          gl_FragColor.rgb += gl_FragColor.rgb * (3.0 - stc_diff);    //原有颜色加上颜色差异值提高亮度
                      }
                  `
          })
          // 让系统重新编译着色器
          model._shouldRegenerateShaders = true
        }
      }
    })
    viewer.flyTo(tileset)
  })
}

export class PostStageMangner {
  viewer: any
  rainPostStage: null
  snowPostStage: null
  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.rainPostStage = null
    this.snowPostStage = null
  }

  clear() {
    if (this.rainPostStage) {
      this.viewer.scene.postProcessStages.remove(this.rainPostStage)
      this.rainPostStage = null
    }
    if (this.snowPostStage) {
      this.viewer.scene.postProcessStages.remove(this.snowPostStage)
      this.snowPostStage = null
    }
  }

  showRain() {
    /* eslint-disable */
    // 下雨效果
    const fs = `
        uniform sampler2D colorTexture;
        varying vec2 v_textureCoordinates;
        float hash(float x){
            return fract(sin(x*133.3)*13.13);
        }
        void main(void){
            float time = czm_frameNumber / 120.0;
            vec2 resolution = czm_viewport.zw;
            vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
            vec3 c=vec3(.6,.7,.8);
            float a=-.4;
            float si=sin(a),co=cos(a);
            uv*=mat2(co,-si,si,co);
            uv*=length(uv+vec2(0,4.9))*.3+1.;
            float v=1.-sin(hash(floor(uv.x*100.))*2.);
            float b=clamp(abs(sin(20.*time*v+uv.y*(5./(2.+v))))-.95,0.,1.)*20.;
            c*=v*b;         // 屏幕上雨的颜色
            gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(c,1), 0.5);  //将雨和三维场景融合
        }

    `
    /* eslint-enable */
    const postStage = new Cesium.PostProcessStage({
      fragmentShader: fs,
      uniforms: {
        highlight() {
          return new Cesium.Color(1.0, 1.0, 1.0, 0.5)
        }
      }
    })
    this.rainPostStage = this.viewer.scene.postProcessStages.add(postStage)
  }

  showSnow() {
    const fs = `
        uniform sampler2D colorTexture; //输入的场景渲染照片
        varying vec2 v_textureCoordinates;
        
        float snow(vec2 uv,float scale)
        {
            float time = czm_frameNumber / 60.0;
            float w=smoothstep(1.,0.,-uv.y*(scale/10.));if(w<.1)return 0.;
            uv+=time/scale;uv.y+=time*2./scale;uv.x+=sin(uv.y+time*.5)/scale;
            uv*=scale;vec2 s=floor(uv),f=fract(uv),p;float k=3.,d;
            p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;d=length(p);k=min(d,k);
            k=smoothstep(0.,k,sin(f.x+f.y)*0.01);
            return k*w;
        }
        
        void main(void){
            vec2 resolution = czm_viewport.zw;
            vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);
            vec3 finalColor=vec3(0);
            //float c=smoothstep(1.,0.3,clamp(uv.y*.3+.8,0.,.75));
            float c = 0.0;
            c+=snow(uv,30.)*.0;
            c+=snow(uv,20.)*.0;
            c+=snow(uv,15.)*.0;
            c+=snow(uv,10.);
            c+=snow(uv,8.);
            c+=snow(uv,6.);
            c+=snow(uv,5.);
            finalColor=(vec3(c)); //屏幕上雪的颜色
            gl_FragColor = mix(texture2D(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.5);  //将雪和三维场景融合
        
        }
    `
    const postStage = new Cesium.PostProcessStage({
      fragmentShader: fs,
      uniforms: {
        highlight() {
          return new Cesium.Color(1.0, 1.0, 1.0, 0.5)
        }
      }
    })
    this.snowPostStage = this.viewer.scene.postProcessStages.add(postStage)
  }
}

export function addFlyLine(coords: number[], viewer: Cesium.Viewer, width: 10) {
  //这里通过算法得到曲线
  const mm = parabola(coords)
  const polyline = new Cesium.PolylineGeometry({
    positions: mm,
    width: width
  })
  const instance = new Cesium.GeometryInstance({
    geometry: polyline,
    id: 'flyline'
  })

  //添加至场景
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: [instance],
      appearance: getFlylineMaterial(),
      releaseGeometryInstances: false,
      compressVertices: false
    })
  )

  function computeFlyline(point1 = [-75, 39], point2 = [-175, 39], h = 500000) {
    const flyline = getBSRxyz(...point1, ...point2, h)
    return flyline
    // 将数据转换为cesium polyline positions格式
    function getBSRxyz(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      h: number
    ) {
      const arr3d = getBSRPoints(x1, y1, x2, y2, h)
      const arrAll = []
      for (const ite of arr3d) {
        arrAll.push(ite[0])
        arrAll.push(ite[1])
        arrAll.push(ite[2])
      }
      return Cesium.Cartesian3.fromDegreesArrayHeights(arrAll)
    }
    function getBSRPoints(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      h: number
    ) {
      const point1 = [y1, 0]
      const point2 = [(y2 + y1) / 2, h]
      const point3 = [y2, 0]
      const arr = getBSR(point1, point2, point3)
      const arr3d = []
      for (let i = 0; i < arr.length; i++) {
        const x = ((x2 - x1) * (arr[i][0] - y1)) / (y2 - y1) + x1
        arr3d.push([x, arr[i][0], arr[i][1]])
      }
      return arr3d
    }
    // 生成贝塞尔曲线
    function getBSR(point1, point2, point3) {
      const ps = [
        { x: point1[0], y: point1[1] },
        { x: point2[0], y: point2[1] },
        { x: point3[0], y: point3[1] }
      ]
      // 100 每条线由100个点组成
      const guijipoints = CreateBezierPoints(ps, 100)
      return guijipoints
    }
    // 贝赛尔曲线算法
    // 参数：
    // anchorpoints: [{ x: 116.30, y: 39.60 }, { x: 37.50, y: 40.25 }, { x: 39.51, y: 36.25 }]
    function CreateBezierPoints(anchorpoints, pointsAmount) {
      const points = []
      for (let i = 0; i < pointsAmount; i++) {
        const point = MultiPointBezier(anchorpoints, i / pointsAmount)
        points.push([point.x, point.y])
      }
      return points
    }
    function MultiPointBezier(points, t) {
      const len = points.length
      let x = 0,
        y = 0
      const erxiangshi = function (start, end) {
        let cs = 1,
          bcs = 1
        while (end > 0) {
          cs *= start
          bcs *= end
          start--
          end--
        }
        return cs / bcs
      }
      for (let i = 0; i < len; i++) {
        const point = points[i]
        x +=
          point.x *
          Math.pow(1 - t, len - 1 - i) *
          Math.pow(t, i) *
          erxiangshi(len - 1, i)
        y +=
          point.y *
          Math.pow(1 - t, len - 1 - i) *
          Math.pow(t, i) *
          erxiangshi(len - 1, i)
      }
      return { x: x, y: y }
    }
  }

  function parabola(twoPoints: number[]) {
    //抛物线绘制
    let s = []
    const startPoint = [twoPoints[0], twoPoints[1], 0] //起点的经度、纬度
    s = s.concat(startPoint)
    const step = 80 //线的多少，越多则越平滑(但过多浏览器缓存也会占用越多)
    const heightProportion = 0.125 //最高点和总距离的比值
    const dLon = (twoPoints[2] - startPoint[0]) / step //经度差值
    const dLat = (twoPoints[3] - startPoint[1]) / step //纬度差值
    const deltaLon:number = dLon * Math.abs(111000 * Math.cos(twoPoints[1])) //经度差(米级)
    const deltaLat:number = dLat * 111000 //纬度差(米),1纬度相差约111000米
    const endPoint = [0, 0, 0] //定义一个端点（后面将进行startPoint和endPoint两点画线）
    const heigh:number =
      (
        step *
        Math.sqrt(deltaLon * deltaLon + deltaLat * deltaLat) *
        heightProportion
      ).toFixed(0) * 2
    const x2 = 10000 * Math.sqrt(dLon * dLon + dLat * dLat) //小数点扩大10000倍，提高精确度
    const a = heigh / (x2 * x2)
    function y(x, height) {
      return height - a * x * x
    }
    for (let i = 1; i <= step; i++) {
      //逐“帧”画线
      endPoint[0] = startPoint[0] + dLon //更新end点经度
      endPoint[1] = startPoint[1] + dLat //更新end点纬度
      const x = x2 * ((2 * i) / step - 1) //求抛物线函数x
      endPoint[2] = y(x, heigh).toFixed(0) * 1 //求end点高度
      s = s.concat(endPoint)

      // end点变为start点
      startPoint[0] = endPoint[0]
      startPoint[1] = endPoint[1]
      startPoint[2] = endPoint[2]
    }
    return Cesium.Cartesian3.fromDegreesArrayHeights(s)
  }

  function getFlylineMaterial() {
    // 创建材质，在MaterialAppearance中若不添加基础材质，模型将会透明
    const material = new Cesium.Material.fromType('Color')
    material.uniforms.color = Cesium.Color.ORANGE
    // 飞线效果-飞线间隔，宽度2
    const fragmentShaderSource = `         
      varying vec2 v_st;    
      varying float v_width;    
      varying float v_polylineAngle;
      varying vec4 v_positionEC;
      varying vec3 v_normalEC;
      void main()
      {
          vec2 st = v_st;
          // 箭头飞线，宽度 8
          float xx = fract(st.s*10.0 + st.t  - czm_frameNumber/60.0);
          if (st.t<0.5) {
              xx = fract(st.s*10.0 - st.t - czm_frameNumber/60.0);
          }
          float r = 0.0;
          float g = xx;
          float b = xx;
          float a = xx;

          // 飞线边框
          if (st.t>0.8||st.t<0.2) {
              g = 1.0;
              b = 1.0;
              a = 0.4;
          }

          gl_FragColor = vec4(r,g,b,a);
      }`
    // 自定义材质
    const aper = new Cesium.PolylineMaterialAppearance({
      material: material,
      translucent: true,
      vertexShaderSource: `
        #define CLIP_POLYLINE 
        void clipLineSegmentToNearPlane(
            vec3 p0,
            vec3 p1,
            out vec4 positionWC,
            out bool clipped,
            out bool culledByNearPlane,
            out vec4 clippedPositionEC)
        {
            culledByNearPlane = false;
            clipped = false;
            vec3 p0ToP1 = p1 - p0;
            float magnitude = length(p0ToP1);
            vec3 direction = normalize(p0ToP1);
            float endPoint0Distance =  czm_currentFrustum.x + p0.z;
            float denominator = -direction.z;
            if (endPoint0Distance > 0.0 && abs(denominator) < czm_epsilon7)
            {
                culledByNearPlane = true;
            }
            else if (endPoint0Distance > 0.0)
            {
                float t = endPoint0Distance / denominator;
                if (t < 0.0 || t > magnitude)
                {
                    culledByNearPlane = true;
                }
                else
                {
                    p0 = p0 + t * direction;
                    p0.z = min(p0.z, -czm_currentFrustum.x);
                    clipped = true;
                }
            }
            clippedPositionEC = vec4(p0, 1.0);
            positionWC = czm_eyeToWindowCoordinates(clippedPositionEC);
        }
        vec4 getPolylineWindowCoordinatesEC(vec4 positionEC, vec4 prevEC, vec4 nextEC, float expandDirection, float width, bool usePrevious, out float angle)
        {
            #ifdef POLYLINE_DASH
            vec4 positionWindow = czm_eyeToWindowCoordinates(positionEC);
            vec4 previousWindow = czm_eyeToWindowCoordinates(prevEC);
            vec4 nextWindow = czm_eyeToWindowCoordinates(nextEC);
            vec2 lineDir;
            if (usePrevious) {
                lineDir = normalize(positionWindow.xy - previousWindow.xy);
            }
            else {
                lineDir = normalize(nextWindow.xy - positionWindow.xy);
            }
            angle = atan(lineDir.x, lineDir.y) - 1.570796327;
            angle = floor(angle / czm_piOverFour + 0.5) * czm_piOverFour;
            #endif
            vec4 clippedPrevWC, clippedPrevEC;
            bool prevSegmentClipped, prevSegmentCulled;
            clipLineSegmentToNearPlane(prevEC.xyz, positionEC.xyz, clippedPrevWC, prevSegmentClipped, prevSegmentCulled, clippedPrevEC);
            vec4 clippedNextWC, clippedNextEC;
            bool nextSegmentClipped, nextSegmentCulled;
            clipLineSegmentToNearPlane(nextEC.xyz, positionEC.xyz, clippedNextWC, nextSegmentClipped, nextSegmentCulled, clippedNextEC);
            bool segmentClipped, segmentCulled;
            vec4 clippedPositionWC, clippedPositionEC;
            clipLineSegmentToNearPlane(positionEC.xyz, usePrevious ? prevEC.xyz : nextEC.xyz, clippedPositionWC, segmentClipped, segmentCulled, clippedPositionEC);
            if (segmentCulled)
            {
                return vec4(0.0, 0.0, 0.0, 1.0);
            }
            vec2 directionToPrevWC = normalize(clippedPrevWC.xy - clippedPositionWC.xy);
            vec2 directionToNextWC = normalize(clippedNextWC.xy - clippedPositionWC.xy);
            if (prevSegmentCulled)
            {
                directionToPrevWC = -directionToNextWC;
            }
            else if (nextSegmentCulled)
            {
                directionToNextWC = -directionToPrevWC;
            }
            vec2 thisSegmentForwardWC, otherSegmentForwardWC;
            if (usePrevious)
            {
                thisSegmentForwardWC = -directionToPrevWC;
                otherSegmentForwardWC = directionToNextWC;
            }
            else
            {
                thisSegmentForwardWC = directionToNextWC;
                otherSegmentForwardWC =  -directionToPrevWC;
            }
            vec2 thisSegmentLeftWC = vec2(-thisSegmentForwardWC.y, thisSegmentForwardWC.x);
            vec2 leftWC = thisSegmentLeftWC;
            float expandWidth = width * 0.5;
            if (!czm_equalsEpsilon(prevEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1) && !czm_equalsEpsilon(nextEC.xyz - positionEC.xyz, vec3(0.0), czm_epsilon1))
            {
                vec2 otherSegmentLeftWC = vec2(-otherSegmentForwardWC.y, otherSegmentForwardWC.x);
                vec2 leftSumWC = thisSegmentLeftWC + otherSegmentLeftWC;
                float leftSumLength = length(leftSumWC);
                leftWC = leftSumLength < czm_epsilon6 ? thisSegmentLeftWC : (leftSumWC / leftSumLength);
                vec2 u = -thisSegmentForwardWC;
                vec2 v = leftWC;
                float sinAngle = abs(u.x * v.y - u.y * v.x);
                expandWidth = clamp(expandWidth / sinAngle, 0.0, width * 2.0);
            }
            vec2 offset = leftWC * expandDirection * expandWidth * czm_pixelRatio;
            return vec4(clippedPositionWC.xy + offset, -clippedPositionWC.z, 1.0) * (czm_projection * clippedPositionEC).w;
        }
        vec4 getPolylineWindowCoordinates(vec4 position, vec4 previous, vec4 next, float expandDirection, float width, bool usePrevious, out float angle)
        {
            vec4 positionEC = czm_modelViewRelativeToEye * position;
            vec4 prevEC = czm_modelViewRelativeToEye * previous;
            vec4 nextEC = czm_modelViewRelativeToEye * next;
            return getPolylineWindowCoordinatesEC(positionEC, prevEC, nextEC, expandDirection, width, usePrevious, angle);
        }

        attribute vec3 position3DHigh;
        attribute vec3 position3DLow;
        attribute vec3 prevPosition3DHigh;
        attribute vec3 prevPosition3DLow;
        attribute vec3 nextPosition3DHigh;
        attribute vec3 nextPosition3DLow;
        attribute vec2 expandAndWidth;
        attribute vec2 st;
        attribute float batchId;

        varying float v_width;
        varying vec2 v_st;
        varying float v_polylineAngle;
        
        varying vec4 v_positionEC;
        varying vec3 v_normalEC;
        void main()
        {
        float expandDir = expandAndWidth.x;
        float width = abs(expandAndWidth.y) + 0.5;
        bool usePrev = expandAndWidth.y < 0.0;

        vec4 p = czm_computePosition();
        vec4 prev = czm_computePrevPosition();
        vec4 next = czm_computeNextPosition();
        
        float angle;
        vec4 positionWC = getPolylineWindowCoordinates(p, prev, next, expandDir, width, usePrev, angle);
        gl_Position = czm_viewportOrthographic * positionWC;
        
        v_width = width;
        v_st.s = st.s;
        v_st.t = st.t;
        // v_st.t = czm_writeNonPerspective(st.t, gl_Position.w);
        v_polylineAngle = angle;


        
        vec4 eyePosition = czm_modelViewRelativeToEye * p;
        v_positionEC =  czm_inverseModelView * eyePosition;      // position in eye coordinates
        //v_normalEC = czm_normal * normal;                         // normal in eye coordinates
        }

      `,
      fragmentShaderSource: fragmentShaderSource
    })
    return aper
  }
}
