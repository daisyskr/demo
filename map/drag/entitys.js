// import * as Cesium from 'cesium'
export default class Entitys {
  constructor(viewer) {
    this.entitysAction = viewer.entities
  }
  add(entity) {
    return this.entitysAction.add(entity)
  }
  remove(entity) {
    this.entitysAction.remove(entity)
  }
  removeAll() {
    this.entitysAction.removeAll()
  }
  createEntity() {
    return new Cesium.Entity()
  }

  /**
   * 提示信息实体
   * createMsgTip
   * showTip 控制器
   */
  createMsgTip() {
    let _tipId = 'msg-tip-tool'
    let _resultTip = this.entitysAction.getById(_tipId)
    if (!_resultTip) {
      _resultTip = this.entitysAction.add({
        id: _tipId,
        name: '鼠标提示信息实体',
        label: {
          fillColor: Cesium.Color.YELLOW,
          showBackground: true,
          font: '14px monospace',
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(15, 20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    }
    return _resultTip
  }
  /**
   * 提示框
   * @param {*} bShow
   * @param {*} position
   * @param {*} message
   */
  showTip(label, bShow, position, message, effectOptions) {
    label.show = bShow
    if (bShow) {
      if (position) label.position = position
      if (message) label.label.text = message
      if (effectOptions) {
        for (let key in effectOptions) {
          if (label.key) {
            label.key = effectOptions[key]
          }
        }
      }
    }
  }
}
