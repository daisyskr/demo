import Entitys from './entitys.js'
//鼠标拖动，支持entity和primitive，拖拽primitive时必须传id
export default class dragEntity {
  /*callback返回三种类型，对应被拖拽实体的三种状态，
  'move-drag'：实体被拖拽时实时回调，即拖着实体移动时
  'per-stop-drag'：每次实体拖拽暂时结束时的回调，即左键松开
  'stop-drag'：所有实体拖拽全部结束时的回调，即拖拽完成，拖拽事件销毁
  */
  constructor(val) {
    val.viewer = val?.viewer ?? variable.viewer
    this.callback = val.callback ?? (() => {})
    this.viewer = val.viewer
    this.movedCartesian = []
    this.movedPosition = []
    this.currentId = ''
    this.currentPointId = ''
    this.leftDownFlag = false
    this.pick = null //储存实体
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
    this.entitys = new Entitys(this.viewer)
    if (!this.resultTip) this.resultTip = this.entitys.createMsgTip()
    document.body.style.cursor = 'pointer'
    this.handlers()
  }
  handlers() {
    this.leftDownAction()
    this.mouseMoveAction()
    this.leftUpAction()
    this.rightClickAction()
  }
  leftDownAction() {
    let _this = this
    _this.handler.setInputAction(function (movement) {
      let pick = _this.viewer.scene.pick(movement.position)
      if (Cesium.defined(pick) && (pick.id || pick.primitive)) {
        _this.currentId = typeof pick.id == 'string' ? pick.id : pick.id?.id
        _this.currentPointId = typeof pick.id == 'string' ? pick.id : pick.id?.id || pick?.id?._id
        _this.pick = pick
        _this.leftDownFlag = true
        _this.viewer.scene.screenSpaceCameraController.enableRotate = false //锁定相机
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
  }
  mouseMoveAction(tip = '左键拖动，右键停止') {
    let _this = this
    _this.handler.setInputAction(function (movement) {
      let cartesian = null
      let ray = _this.viewer.camera.getPickRay(movement.endPosition)
      cartesian = _this.viewer.scene.globe.pick(ray, _this.viewer.scene)
      _this.entitys.showTip(_this.resultTip, true, cartesian, tip)
      if (_this.leftDownFlag === true && _this.pick != null) {
        typeof _this.pick.id == 'object' && (_this.pick.id.position = cartesian) //此处根据具体entity来处理，也可能是pointDraged.id.position=cartesian;
        typeof _this.pick.id == 'string' && (_this.pick.primitive.position = cartesian)
        let currentItem = _this.movedCartesian.find((item) => {
          return item.id == _this.currentId
        })
        if (currentItem) {
          currentItem.cartesian = cartesian
        } else {
          _this.movedCartesian.push({
            id: _this.currentId,
            pointId: _this.currentPointId,
            cartesian: cartesian,
          })
        }
        _this.callback('move-drag')
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }
  leftUpAction() {
    let _this = this
    _this.handler.setInputAction(function (movement) {
      if (_this.leftDownFlag === true && _this.pick != null) {
        _this.leftDownFlag = false
        _this.pointDraged = null
        _this.viewer.scene.screenSpaceCameraController.enableRotate = true //解锁相机
        _this.callback('per-stop-drag')
      }
    }, Cesium.ScreenSpaceEventType.LEFT_UP)
  }
  rightClickAction() {
    let _this = this
    _this.handler.setInputAction(function (movement) {
      _this.destroyAction()
      _this.callback('stop-drag')
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }
  //清除鼠标事件
  destroyAction() {
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN)
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP)
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    this.entitys.remove(this.resultTip)
    this.resultTip = null
    document.body.style.cursor = 'default'
  }
  getMovedPosition() {
    this.movedPosition = []
    let ellipsoid = this.viewer.scene.globe.ellipsoid
    // for (let key in this.movedCartesian) {
    //   let cartographic = ellipsoid.cartesianToCartographic(this.movedCartesian[key])
    //   let lat = Cesium.Math.toDegrees(cartographic.latitude)
    //   let lon = Cesium.Math.toDegrees(cartographic.longitude)
    //   let alt = cartographic.height
    //   this.movedPosition[key] = [lon, lat]
    // }

    this.movedCartesian.forEach((item) => {
      let cartographic = ellipsoid.cartesianToCartographic(item.cartesian)
      let lat = Cesium.Math.toDegrees(cartographic.latitude)
      let lon = Cesium.Math.toDegrees(cartographic.longitude)
      let alt = cartographic.height
      this.movedPosition.push({
        id: item.id,
        pointId: item.pointId,
        coordinate: [lon, lat],
      })
    })
    return this.movedPosition
  }
  // 鼠标拾取三维坐标点
  getCatesian3FromPX(px) {
    var picks = this.viewer.scene.drillPick(px)
    this.viewer.render()
    var cartesian
    var isOn3dtiles = false
    for (var i = 0; i < picks.length; i++) {
      if (picks[i].primitive instanceof Cesium.Cesium3DTileset) {
        //模型上拾取
        isOn3dtiles = true
      }
    }
    if (isOn3dtiles) {
      cartesian = this.viewer.scene.pickPosition(px)
    } else {
      var ray = this.viewer.camera.getPickRay(px)
      if (!ray) return null
      cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene)
    }
    return cartesian
  }
}
