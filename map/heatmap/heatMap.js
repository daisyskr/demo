// import * as Cesium from 'cesium'
// import Prompt from './prompt/prompt'
// import './prompt/prompt.css'

/**
  * @description 热力图绘制及清除
  * @Remarks 三维热力图类，基于h337类扩展
  * @param {any} v - viewer
  * @param {object} option - 热力图配置项
  * @return {*}
  * @example
  ```ts
  //绘制热力图
  let heatmap = new Heatmap(viewer, {
    geojson: [],//热力图geojson数据
    radius: 15,//半径
    maxOpacity: 0.5,//最大透明度
    minOpacity: 0.5,//最小透明度
    blur: 0.8,//边缘模糊度
    baseHeight: 10,//基础高度
    is3D: false,//是否绘制为三维热力图
    primitiveType: "TRANGLE",//TRANGLE（面）或LINES（网格）POINTS LINES LINE_LOOP LINE_STRIP TRIANGLES TRIANGLE_STRIP TRIANGLE_FAN
    gradient: {
      "0.25": "#9999ff",
      "0.55": "#00ff00",
      "0.85": "yellow",
      "1": "red"
    },
    isLocation: false,//是否定位到热力图所在范围
    distance: { near: 0, far: 1500000 },
  }
  })
  //清除热力图
  heatmap.destroy()
  ```
 */
class Heatmap {
  /**
   * @param {Cesium.Viewer} viewer 地图viewer对象
   * @param {Object} opt 基础参数
   * @param {Array} opt.list 热力值数组
   * @param {Array} opt.radius 热力点半径
   * @param {Array} opt.baseHeight 最低高度
   * @param {Array} opt.gradient 颜色配置
   */
  // viewer: any
  opt = {
    geojson: [], //热力图geojson数据
    radius: 15, //半径
    maxOpacity: 0.5, //最大透明度
    minOpacity: 0.5, //最小透明度
    blur: 0.8, //边缘模糊度
    baseHeight: 10, //基础高度
    is3D: false, //是否绘制为三维热力图
    primitiveType: 'TRANGLE', //TRANGLE（面）或LINES（网格）POINTS LINES LINE_LOOP LINE_STRIP TRIANGLES TRIANGLE_STRIP TRIANGLE_FAN
    gradient: {
      0.25: '#9999ff',
      0.55: '#00ff00',
      0.85: 'yellow',
      1: 'red',
    },
    isLocation: false, //是否定位到热力图所在范围
    distance: { near: 0, far: 1500000 },
    showValue: true, //是否在鼠标滑过时显示热力值，默认false
  }
  list = []
  /*//ts
  dom: any
  id: any
  canvasw: any
  bound: any
  rect: any
  x_axios: any
  y_axios: any
  girthX: any
  girthY: any
  baseHeight: any
  is3D: boolean = false
  primitiveType: any
  heatmapInstance: any
  primitive: any
  hierarchy: any
  canvasW: any
  handler: any
  // pointsData: any
  extentRectangle: any
  providerImage: any
  entity: any
  popupHandler: any
  prompt: any
  */

  constructor(viewer, opt) {
    this.viewer = viewer
    if (this.opt) {
      this.opt = { ...this.opt, ...opt }
    }
    let geojson = opt.geojson || {}
    this.formatList(geojson)
    if (!this.list || !this.list.length) {
      console.log('热力图点位不得少于1个！')
      return
    }
    this.dom = undefined
    this.id = Number(new Date().getTime() + '' + Number(Math.random() * 1000).toFixed(0))
    this.canvasw = 200

    this.bound = undefined // 四角坐标
    this.rect = {} // 经纬度范围

    this.x_axios = undefined // x 轴
    this.y_axios = undefined // y 轴
    this.girthX = 0 // x轴长度
    this.girthY = 0 // y轴长度

    this.baseHeight = this.opt.baseHeight || 0
    this.is3D = this.opt.is3D || false

    this.createDom()
    let config = {
      container: document.getElementById(`heatmap-${this.id}`),
      radius: this.opt.radius || 0,
      maxOpacity: this.opt.maxOpacity || 0,
      minOpacity: this.opt.minOpacity || 0,
      blur: this.opt.blur || 0,
      gradient: this.opt.gradient || {
        '.1': 'blue',
        '.5': 'yellow',
        '.7': 'red',
        '.99': 'white',
      },
    }
    this.primitiveType = opt.primitiveType || 'TRIANGLES'
    this.heatmapInstance = window.h337.create(config)
    /**
     *@property {Cesium.Primitive} primitive 热力图图元
     */
    this.primitive = undefined
    this.init()
  }
  init() {
    this.viewer.scene.globe.depthTestAgainstTerrain = true
    this.hierarchy = []
    let minmaxCounter = new MinMaxCounter()
    for (let ind = 0; ind < this.list.length; ind++) {
      let position = Cesium.Cartesian3.fromDegrees(this.list[ind].lnglat[0], this.list[ind].lnglat[1], 0)
      this.hierarchy.push(position)

      minmaxCounter.update(this.list[ind].value)
    }
    let [minVal, maxVal] = minmaxCounter.result()
    this.computeBound(this.hierarchy)
    let points = []
    for (let i = 0; i < this.hierarchy.length; i++) {
      let p1 = this.hierarchy[i]
      const rete = this.computeRateInBound(p1)
      points.push({
        x: rete.x,
        y: rete.y,
        value: this.list[i].value,
      })
    }
    // this.pointsData = points
    // let valueArray = []
    // this.list.forEach(item => {
    //   valueArray.push(item.value)
    // })
    this.heatmapInstance.setData({
      max: maxVal,
      min: minVal,
      data: points,
    })
    // this.heatmapInstance.addData(points);
    if (!this.opt.is3D) {
      this.addEntity()
    } else {
      this.addPrimitive()
    }
    this.distanceDisplayFuc()
    // this.addPrimitive()
    // this.addPrimitive2()
    // this.addDynamicPrimitive()
    // this.addEntity()
    // this.addImageLayer()

    if (this.opt.showValue) {
      let _this = this
      _this.opt.moueseMove = function (res) {
        if (!res) {
          return _this.prompt && _this.prompt.setVisible(false)
        }
        _this.prompt && _this.prompt.setVisible(true)
        const value = `${res.value}`
        _this.prompt ||
          (_this.prompt = new Prompt(_this.viewer, {
            position: res.px,
            type: 2,
            content: value,
            // offset: {
            //   y: -40
            // },
            closeBtn: false,
          })),
          _this.prompt && _this.prompt.update(res.px, value)
      }
      _this.bindTooltip()
    }
  }
  //primitive方式加载可三维、网格式，但切换会闪烁，热力图会压盖绘制图形形成空矩形
  addPrimitive() {
    if (this.primitive) {
      this.viewer.scene.primitives.remove(this.primitive)
      this.primitive = undefined
    }
    let instance = new Cesium.GeometryInstance({
      geometry: this.createGeometry(),
      attributes: {
        // distanceDisplayCondition: new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(this.opt.distance.near, this.opt.distance.far)//此种方式控制显示距离异常，弃用，改用自己监听
      },
    })

    this.primitive = this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: instance,
        appearance: new Cesium.MaterialAppearance({
          material: new Cesium.Material({
            fabric: {
              type: 'Image',
              uniforms: {
                image: this.heatmapInstance.getDataURL(),
                // color: { red: 1, green: 1, blue: 1, alpha: 0.5 }
              },
            },
          }),
          translucent: true,
          flat: true,
        }),
        asynchronous: false,
        // debugShowBoundingVolume: true
      })
    )
    this.primitive.id = 'gs3d-heatmap'
  }
  addPrimitive2() {
    // if (this.primitive) {
    //   this.viewer.scene.primitives.remove(this.primitive);
    //   this.primitive = undefined;
    // }
    if (!this.primitive) {
      let instance = new Cesium.GeometryInstance({
        geometry: this.createGeometry(),
        attributes: {
          // distanceDisplayCondition: new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(this.opt.distance.near, this.opt.distance.far)//此种方式控制显示距离异常，弃用，改用自己监听
        },
      })

      this.primitive = this.viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: instance,
          appearance: new Cesium.MaterialAppearance({
            material: new Cesium.Material({
              fabric: {
                type: 'Image',
                uniforms: {
                  image: this.heatmapInstance.getDataURL(),
                },
              },
            }),
            translucent: true,
            flat: true,
          }),
          asynchronous: false,
          releaseGeometryInstances: false,
          debugShowBoundingVolume: true,
        })
      )
    } else {
      console.log(this.primitive)
      this.primitive.appearance.material.uniforms.image = this.heatmapInstance.getDataURL()
      // this.primitive.geometryInstances.geometry = this.createGeometry()//位置不会变
    }
    this.primitive.id = 'gs3d-heatmap'
  }
  //动态更新
  addDynamicPrimitive() {
    if (!this.primitive) {
      this.primitive = this.viewer.scene.primitives.add(
        new dynamicPrimitive({
          geometry: this.createGeometry(),
          image: this.heatmapInstance.getDataURL(),
        })
      )
      this.primitive.id = 'gs3d-heatmap'
    } else {
      let geometry = this.createGeometry()
      let image = this.heatmapInstance.getDataURL()
      this.primitive.geometry = geometry
      this.primitive.image = image
    }
  }
  //entity方式加载不闪烁，热力图不会压盖绘制图形，但无法三维、网格式
  addEntity() {
    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = undefined
    }

    this.entity = this.viewer.entities.add({
      name: 'gs3d-heatmap',
      rectangle: {
        coordinates: this.extentRectangle,
        material: new Cesium.ImageMaterialProperty({
          image: this.heatmapInstance.getDataURL(),
          transparent: true,
        }),
      },
    })
  }
  //provider方式加载不闪烁，热力图不会压盖绘制图形，但无法三维、网格式
  addImageLayer() {
    if (this.providerImage) {
      this.viewer.imageryLayers.remove(this.providerImage)
      this.providerImage = undefined
    }
    const url = this.heatmapInstance.getDataURL()

    const image = new Cesium.SingleTileImageryProvider({
      url: url,
      rectangle: this.extentRectangle,
    })
    this.providerImage = this.viewer.imageryLayers.addImageryProvider(image)
  }
  //根据距离控制显隐
  distanceDisplayFuc() {
    this.handler = () => {
      // 当前高度
      let height = this.viewer.camera.positionCartographic.height
      if (height >= this.opt.distance.near && height <= this.opt.distance.far) {
        this.primitive && (this.primitive.show = true)
        this.providerImage && (this.providerImage.show = true)
      } else {
        this.primitive && (this.primitive.show = false)
        this.providerImage && (this.providerImage.show = false)
      }
      // if (this.opt.isDynamic) {
      //   let rItem = this.opt.dynamicOption.find((item: any) => {
      //     return height <= item.height
      //   })
      //   if (this.opt.radius != rItem.radius) {
      //     this.opt.radius = rItem.radius
      //     this.heatmapInstance.addData(this.pointsData, rItem.radius);
      //     // this.heatmapInstance.setData({ data: this.pointsData, radius: rItem.radius });
      //   }
      // }
    }
    this.handler()
    this.viewer.camera.changed.addEventListener(this.handler)
  }
  //绑定热力值标签
  bindTooltip() {
    let _this = this
    this.popupHandler || (this.popupHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)),
      this.popupHandler.setInputAction(function (t) {
        const i = _this.viewer.scene.pick(t.endPosition)
        if (
          i &&
          ((i.primitive && 'gs3d-heatmap' == i.primitive.id) ||
            (typeof i.id == 'object' && 'gs3d-heatmap' == i.id.name))
        ) {
          const i = _this.viewer.scene.pickPosition(t.endPosition),
            n = _this.computeRateInBound(i)
          let r
          n && (r = _this.heatmapInstance.getValueAt(n))
          _this.opt.moueseMove &&
            _this.opt.moueseMove({
              value: r || '无数据',
              px: t.endPosition,
              position: i,
            })
        } else _this.opt.moueseMove && _this.opt.moueseMove(void 0)
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }
  //格式化传入的geojson，支持传入标准geojson或只传features
  formatList(geojson) {
    let _this = this
    let features
    if (geojson.type == 'FeatureCollection' || !!geojson.features) {
      features = geojson.features
    } else {
      features = geojson
    }
    features &&
      features.forEach((item) => {
        if (item.geometry.type !== 'Point') {
          item.geometry = _this.getCenterGeometry(item.geometry)
        }
        _this.list.push({
          lnglat: [item.geometry.coordinates[0], item.geometry.coordinates[1]],
          value: item.properties.value || 1,
        })
      })
  }
  getCenterGeometry(geometry) {
    let center, centerGeometry
    center = turf.centerOfMass(geometry)
    centerGeometry = center.geometry
    return centerGeometry
  }
  update(geojson) {
    this.list = []
    this.formatList(geojson)
    if (!this.list || !this.list.length) {
      console.log('热力图点位不得少于1个！')
      return
    }
    this.init()
  }
  /**
   * 销毁
   */
  destroy() {
    let dom = document.getElementById(`heatmap-${this.id}`)
    if (dom) dom.remove()
    if (this.handler) {
      this.viewer.camera.changed.removeEventListener(this.handler)
      this.handler = null
    }
    if (this.primitive) {
      this.viewer.scene.primitives.remove(this.primitive)
      this.primitive = undefined
    }
    if (this.providerImage) {
      this.viewer.imageryLayers.remove(this.providerImage)
      this.providerImage = undefined
    }
    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = undefined
    }
    this.popupHandler && this.popupHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    this.prompt && this.prompt.destroy()
  }

  // 计算当前坐标在范围中位置 换算为canvas中的像素坐标
  computeRateInBound(position) {
    if (!position) return
    let ctgc = Cesium.Cartographic.fromCartesian(position.clone())
    ctgc.height = 0
    position = Cesium.Cartographic.toCartesian(ctgc.clone())

    const p_origin = Cesium.Cartesian3.subtract(position.clone(), this.bound.leftTop, new Cesium.Cartesian3())
    const diffX = Cesium.Cartesian3.dot(p_origin, this.x_axios)
    const diffY = Cesium.Cartesian3.dot(p_origin, this.y_axios)
    return {
      x: Number((diffX / this.girthX) * this.canvasw).toFixed(0),
      y: Number((diffY / this.girthY) * this.canvasw).toFixed(0),
    }
  }

  computeBound(positions) {
    // 先转化为正方形
    if (!positions) return
    let boundingSphere = Cesium.BoundingSphere.fromPoints(positions, new Cesium.BoundingSphere())
    let center = boundingSphere.center
    const radius = boundingSphere.radius

    let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center.clone())
    let modelMatrix_inverse = Cesium.Matrix4.inverse(modelMatrix.clone(), new Cesium.Matrix4())
    let roate_y = new Cesium.Cartesian3(0, 1, 0)

    let rect = []
    for (let i = 45; i <= 360; i += 90) {
      let roateZ_mtx = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(i), new Cesium.Matrix3())
      let yaix_roate = Cesium.Matrix3.multiplyByVector(roateZ_mtx, roate_y, new Cesium.Cartesian3())
      yaix_roate = Cesium.Cartesian3.normalize(yaix_roate, new Cesium.Cartesian3())
      let third = Cesium.Cartesian3.multiplyByScalar(yaix_roate, radius, new Cesium.Cartesian3())
      let poi = Cesium.Matrix4.multiplyByPoint(modelMatrix, third.clone(), new Cesium.Cartesian3())

      rect.push(poi)
    }

    let lnglats = cartesiansToLnglats(rect, this.viewer)
    let minLat = Number.MAX_VALUE,
      maxLat = Number.MIN_VALUE,
      minLng = Number.MAX_VALUE,
      maxLng = Number.MIN_VALUE
    const length = rect.length
    for (let i = 0; i < length; i++) {
      const lnglat = lnglats[i]
      if (lnglat[0] < minLng) {
        minLng = lnglat[0]
      }
      if (lnglat[0] > maxLng) {
        maxLng = lnglat[0]
      }

      if (lnglat[1] < minLat) {
        minLat = lnglat[1]
      }
      if (lnglat[1] > maxLat) {
        maxLat = lnglat[1]
      }
    }

    const diff_lat = maxLat - minLat
    const diff_lng = maxLng - minLng

    // 放大正方形轮廓
    // this.rect.minLat = minLat - diff_lat / length;
    // this.rect.maxLat = maxLat + diff_lat / length;
    // this.rect.minLng = minLng - diff_lng / length;
    // this.rect.maxLng = maxLng + diff_lng / length;
    this.rect.minLat = minLat - diff_lat / 3
    this.rect.maxLat = maxLat + diff_lat / 3
    this.rect.minLng = minLng - diff_lng / 3
    this.rect.maxLng = maxLng + diff_lng / 3

    this.bound = {
      leftTop: Cesium.Cartesian3.fromDegrees(this.rect.minLng, this.rect.maxLat),
      leftBottom: Cesium.Cartesian3.fromDegrees(this.rect.minLng, this.rect.minLat),
      rightTop: Cesium.Cartesian3.fromDegrees(this.rect.maxLng, this.rect.maxLat),
      rightBottom: Cesium.Cartesian3.fromDegrees(this.rect.maxLng, this.rect.minLat),
    }

    this.x_axios = Cesium.Cartesian3.subtract(this.bound.rightTop, this.bound.leftTop, new Cesium.Cartesian3())
    this.x_axios = Cesium.Cartesian3.normalize(this.x_axios, new Cesium.Cartesian3())
    this.y_axios = Cesium.Cartesian3.subtract(this.bound.leftBottom, this.bound.leftTop, new Cesium.Cartesian3())
    this.y_axios = Cesium.Cartesian3.normalize(this.y_axios, new Cesium.Cartesian3())
    this.girthX = Cesium.Cartesian3.distance(this.bound.rightTop, this.bound.leftTop)
    this.girthY = Cesium.Cartesian3.distance(this.bound.leftBottom, this.bound.leftTop)

    this.extentRectangle = Cesium.Rectangle.fromDegrees(
      minLng - diff_lng / 3,
      minLat - diff_lat / 3,
      maxLng + diff_lng / 3,
      maxLat + diff_lat / 3
    )
    if (!!this.opt.isLocation) {
      this.viewer.camera.flyTo({
        destination: this.extentRectangle,
        // orientation: {
        //     heading: 6.28318530717956,
        //     pitch: -0.7853988554907718,
        //     roll: 0,
        // }
        // new Cesium.HeadingPitchRange(6.28318530717956, -0.7853988554907718, 50)
      })
    }
  }

  createGeometry() {
    let opt = this.getGrain()
    let attributes = new Cesium.GeometryAttributes()
    attributes.position = new Cesium.GeometryAttribute({
      componentDatatype: Cesium.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: opt.positions,
    })
    attributes.st = new Cesium.GeometryAttribute({
      componentDatatype: Cesium.ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: new Float32Array(opt.st),
    })
    let geometry = new Cesium.Geometry({
      attributes: attributes,
      indices: new Uint16Array(opt.indices),
      primitiveType: Cesium.PrimitiveType[this.primitiveType],
      boundingSphere: Cesium.BoundingSphere.fromVertices(opt.positions),
    })
    // let radius = Cesium.BoundingSphere.fromVertices(opt.positions).volume()
    return geometry
  }

  // 根据经纬度跨度和canvas的宽高 来计算顶点坐标及顶点法向量
  getGrain() {
    let canvasW = this.canvasW || 200
    let canvasH = this.canvasW || 200
    let maxLng = this.rect.maxLng
    let maxLat = this.rect.maxLat
    let minLng = this.rect.minLng
    let minLat = this.rect.minLat

    const granLng_w = (maxLng - minLng) / canvasW // 经度粒度
    const granLat_H = (maxLat - minLat) / canvasH // 经度粒度
    let positions = []
    let st = []
    let indices = []

    let points = []
    for (let i = 0; i < canvasW; i++) {
      let nowLng = minLng + granLng_w * i

      for (let j = 0; j < canvasH; j++) {
        let nowLat = maxLat - granLat_H * j
        const value = this.heatmapInstance.getValueAt({
          x: i,
          y: j,
        })
        let height = this.is3D ? this.baseHeight + value : this.baseHeight
        let cartesian3 = Cesium.Cartesian3.fromDegrees(nowLng, nowLat, height)
        positions.push(cartesian3.x, cartesian3.y, cartesian3.z)
        // st.push(i / canvasW, j / canvasH)
        st.push(i / canvasW, 1 - j / canvasH) //热力图取值y轴反转
        if (j != canvasH - 1 && i != canvasW - 1) {
          indices.push(i * canvasH + j, i * canvasH + j + 1, (i + 1) * canvasH + j)
          indices.push((i + 1) * canvasH + j, (i + 1) * canvasH + j + 1, i * canvasH + j + 1)
        }
      }
    }

    return {
      positions: positions,
      st: st,
      indices: indices,
    }
  }

  createDom() {
    this.dom = window.document.createElement('div')
    this.dom.id = `heatmap-${this.id}`
    this.dom.className = `heatmap`
    this.dom.style.width = this.canvasw + 'px'
    this.dom.style.height = this.canvasw + 'px'
    this.dom.style.position = 'absolute'
    this.dom.style.display = 'none'
    let mapDom = window.document.getElementById(this.viewer.container.id)

    mapDom.appendChild(this.dom)
  }
}
/**
 * 世界坐标转经纬度
 * @param {Cesium.Cartesian3 } cartesian 世界坐标
 * @param {Cesium.Viewer} viewer 当前viewer对象
 * @returns { Array } 经纬度坐标s
 */
const cartesianToLnglat = function (cartesian, viewer) {
  if (!cartesian) return []
  var lnglat = Cesium.Cartographic.fromCartesian(cartesian)
  var lat = Cesium.Math.toDegrees(lnglat.latitude)
  var lng = Cesium.Math.toDegrees(lnglat.longitude)
  var hei = lnglat.height
  return [lng, lat, hei]
}

/**
 * 世界坐标数组转经纬度数组
 * @param {Cesium.Cartesian3[]} cartesians 世界坐标数组
 * @param {Cesium.Viewer} viewer 当前viewer对象
 * @returns { Array } 经纬度坐标数组
 */
const cartesiansToLnglats = function (cartesians, viewer) {
  if (!cartesians || cartesians.length < 1) return
  if (!viewer) {
    console.log('缺少viewer对象')
    return
  }
  var arr = []
  for (var i = 0; i < cartesians.length; i++) {
    arr.push(cartesianToLnglat(cartesians[i], viewer))
  }
  return arr
}

class MinMaxCounter {
  // minNum: number
  // maxNum: number
  constructor() {
    this.minNum = Number.POSITIVE_INFINITY
    this.maxNum = Number.NEGATIVE_INFINITY
  }
  update(num) {
    if (num > this.maxNum) this.maxNum = num
    if (num < this.minNum) this.minNum = num
  }

  result() {
    return [this.minNum, this.maxNum]
  }
}

//暂不可用，先使用html中的动态绘制方法
class dynamicPrimitive {
  constructor(options) {
    this.geometry = options.geometry
    this.image = options.image

    this._geometry = undefined
    this._image = ''
  }
  update = function (context, frameState, commandList) {
    if (!(this.geometry !== this._geometry || this.image !== this._image)) {
      if (this._primitive) {
        this._primitive.update(context, frameState, commandList)
      }
      return
    }
    this._geometry = this.geometry
    this._image = this.image

    this._primitive && this._primitive.destroy()
    let instance = new Cesium.GeometryInstance({
      geometry: this.geometry,
      attributes: {
        // distanceDisplayCondition: new Cesium.DistanceDisplayConditionGeometryInstanceAttribute(this.opt.distance.near, this.opt.distance.far)//此种方式控制显示距离异常，弃用，改用自己监听
      },
    })
    this._primitive = new Cesium.Primitive({
      geometryInstances: instance,
      appearance: new Cesium.MaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            type: 'Image',
            uniforms: {
              image: this.image,
            },
          },
        }),
        translucent: true,
        flat: true,
      }),
      asynchronous: false,
    })
    if (!this._primitive) return
    this._primitive.update(context, frameState, commandList)
  }

  isDestroyed = function () {
    return false
  }

  destroy = function () {
    this._primitive = this._primitive && this._primitive.destroy()
    return Cesium.destroyObject(this)
  }
}

// export default Heatmap
