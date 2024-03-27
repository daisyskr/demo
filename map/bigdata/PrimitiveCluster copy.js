/*
 * @Description: <点聚合>
 * @version: 1.0.0
 * @Author: YangYuzhuo
 * @Date: 2024-01-02 11:08:52
 * @LastEditors: YangYuzhuo
 * @LastEditTime: 2024-03-26 14:10:56
 * Copyright 2024
 * listeners
 */
// import centroid from '@turf/centroid'
// import BaseEffect from './BaseEffect.js'
// import { colored_user } from '../kit-assets/base64'
// import { light_blue_bkg } from '../kit-assets/base64'
// import { dark_blue_bkg } from '../kit-assets/base64'
// import { orange_bkg } from '../kit-assets/base64'
// import { red_bkg } from '../kit-assets/base64'

import PrimitiveClusterBase from './PrimitiveClusterBase.js'

const defaultOption = {
  data: [],
  delay: 500,
  pixelRange: 60,
  minimumClusterSize: 2,
  originImageSize: 64,
  poiStyle: {
    image: './static/images/colored_user.png',
    width: 32,
    height: 32,
    showlabel: true,
    label: 'name',
    labelStyle: {
      font: 'bold 15px Microsoft YaHei',
      verticalOrigin: 'CENTER',
      horizontalOrigin: 'LEFT',
      pixelOffset: [15, 0],
      style: 'FILL',
      showBackground: true,
      backgroundColor: '#50b2b7',
    },
  },
  interval: [
    {
      interval: [2, 10],
      image: './static/images/light_blue_bkg.png',
      width: 40,
      height: 40,
    },
    {
      interval: [11, 50],
      image: './static/images/dark_blue_bkg.png',
      width: 48,
      height: 48,
    },
    {
      interval: [51, 100],
      image: './static/images/orange_bkg.png',
      width: 56,
      height: 56,
    },
    {
      interval: [101, 9999999999],
      image: './static/images/red_bkg.png',
      width: 72,
      height: 72,
    },
  ],
}
export default class PrimitiveCluster {
  constructor(viewer) {
    if (!Cesium.defined(viewer)) throw new Error('viewer is not undefined!')
    this.type = 'EntityCluster'
    this.viewer = viewer
    this._show = true
    this.dataSource = null
    this.handler = null
    this.option = null
  }

  /**
   * 绘制点聚合
   * @param {*} options 配置参数
   * @example
      let opt = {
        data: [
          {
            geometry: {
              coordinates: [125.37992411686133, 43.82840936317525],
              type: 'Point',
            },
            properties: {
              height: 3, //高度，默认0
              name: '李悦麒',
              image:'static/images/boy'//poi图片，优先使用此properties中的image，若无则取poiStyle.image
            },
          },
        ],
        delay: 500, //防抖定时器
        pixelRange: 60, //聚合范围，默认60
        minimumClusterSize: 2, //最小聚合数，默认2
        originImageSize: 64, //背景图片原始尺寸，默认64
        poiStyle: {
          //poi配置
          image: '/cluster/icons/poi.png', //poi图片，优先使用此data[i].properties.image，若无则取此poiStyle.image
          width: 32, //poi图片宽
          height: 32, //poi图片高
          showlabel: true, //是否显示文字label
          label: 'name', //文字内容：显示data中的指定属性
          labelStyle: {
            font: 'bold 15px Microsoft YaHei', //字体
            verticalOrigin: 'CENTER', // 竖直对齐方式，默认"CENTER"，可选"CENTER"||"BOTTOM"||"BASELINE"||"TOP"
            horizontalOrigin: 'LEFT', // 水平对齐方式，默认"LEFT"，可选"CENTER"||"LEFT"||"RIGHT"
            pixelOffset: [15, 0], // 偏移量
            style: 'FILL', //文本样式，默认"FILL"，可选"FILL"||"OUTLINE"||"FILL_AND_OUTLINE"
            showBackground: true, //设置文本背景
            backgroundColor: '#50b2b7', //设置文本背景颜色,
          },
        },
        //配置聚合区间及图片
        interval: [
          {
            interval: [2, 10], //聚合区间，min =< num < max
            image: '/cluster/icons/cluster_1.png', //聚合气泡背景图片
            width: 40, //聚合气泡宽
            height: 40, //聚合气泡高
          },
          {
            interval: [11, 50],
            image: '/cluster/icons/cluster_2.png',
            width: 48,
            height: 48,
          },
          {
            interval: [51, 100],
            image: '/cluster/icons/cluster_3.png',
            width: 56,
            height: 56,
          },
          {
            interval: [101, 9999999999],
            image: '/cluster/icons/cluster_4.png',
            width: 72,
            height: 72,
          },
        ],
      }
      draw(opt)
   *
   */
  draw(opt) {
    if (!opt?.data?.length) {
      console.log('请传入聚合数据')
      return
    }
    opt = { ...defaultOption, ...opt }
    opt.poiStyle = { ...defaultOption.poiStyle, ...opt.poiStyle }
    opt.poiStyle.labelStyle = { ...defaultOption.poiStyle.labelStyle, ...opt.poiStyle.labelStyle }
    this.option = opt

    const primitives = this.viewer.scene.primitives.add(new Cesium.PrimitiveCollection())
    const billboardCollection = new Cesium.BillboardCollection()
    const labelCollection = new Cesium.LabelCollection()
    this.primitiveCluster = new PrimitiveClusterBase()
    primitives.add(this.primitiveCluster)
    this.primitiveCluster._billboardCollection = billboardCollection
    this.primitiveCluster._labelCollection = labelCollection

    this.addData(this.option.data)
    this.#initCluster()
  }
  /**
   * 添加聚合数据
   * @param {*} data
   * @example
   * let data = [
        {
          geometry: {
            coordinates: [125.37992411686133, 43.82840936317525],
            type: 'Point',
          },
          properties: {
            height: 3, //高度，默认0
            name: '李悦麒',
            image:'static/images/boy'//poi图片，优先使用此properties中的image，若无则取poiStyle.image
          },
        },
      ],
   */
  addData(data) {
    if (!this.primitiveCluster) {
      console.log('请先初始化Cluster实例')
      return
    }
    let { image, width, height, showlabel, label, labelStyle } = this.option.poiStyle
    let { font, verticalOrigin, horizontalOrigin, pixelOffset, style, showBackground, backgroundColor } = labelStyle
    let _this = this
    data.forEach((item) => {
      if (item?.geometry?.coordinates?.length) {
        let { geometry, properties = {} } = item
        let center = geometry.type == 'Point' ? { geometry } : turf.centroid({ type: 'Feature', geometry })
        let z = Number(properties?.height) || 0
        _this.primitiveCluster._billboardCollection.add({
          position: Cesium.Cartesian3.fromDegrees(...center.geometry.coordinates, z),
          image: properties?.image || image,
          width,
          height,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
        if (showlabel && label) {
          _this.primitiveCluster._labelCollection.add({
            position: Cesium.Cartesian3.fromDegrees(...center.geometry.coordinates, z),
            text: properties[label],
            font,
            verticalOrigin: Cesium.VerticalOrigin[verticalOrigin],
            horizontalOrigin: Cesium.HorizontalOrigin[horizontalOrigin],
            pixelOffset: new Cesium.Cartesian2(...pixelOffset),
            style: Cesium.LabelStyle[style],
            showBackground,
            backgroundColor: Cesium.Color.fromCssColorString(backgroundColor),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          })
        }
      } else {
        console.log('坐标数据缺失')
      }
    })
  }
  /**
   * 重置聚合数据，重置为空
   */
  resetData() {
    this.dataSource && this.dataSource.entities.removeAll()
  }

  #initCluster() {
    let _this = this
    // 设置聚合参数
    this.primitiveCluster.enabled = true //开启聚合功能
    let { delay, pixelRange, minimumClusterSize, originImageSize, interval } = this.option
    this.primitiveCluster.delay = delay
    this.primitiveCluster.pixelRange = pixelRange
    this.primitiveCluster.minimumClusterSize = minimumClusterSize
    this.primitiveCluster._initialize(this.viewer.scene)

    this.handler = function (clusteredEntities, cluster) {
      // 关闭自带的显示聚合数量的标签
      cluster.label.show = false
      cluster.billboard.show = true
      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM

      // 根据聚合数量的多少设置不同层级的图片以及大小
      interval.forEach((item) => {
        if (clusteredEntities.length >= item.interval[0] && clusteredEntities.length < item.interval[1]) {
          cluster.billboard.image = _this.#combineIconAndLabel(
            item.image,
            clusteredEntities.length,
            originImageSize || 64
          )
          cluster.billboard.width = item.width || 48
          cluster.billboard.height = item.height || 48
        }
      })
      cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY //防止billboard被建筑遮盖
    }
    // 添加监听函数
    this.primitiveCluster.clusterEvent.addEventListener(this.handler)
  }

  #combineIconAndLabel(url, label, size) {
    // 创建画布对象
    let canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    let ctx = canvas.getContext('2d')
    let resource = Cesium.Resource
    let promise = new resource.fetchImage(url).then((image) => {
      // 异常判断
      try {
        ctx.drawImage(image, 0, 0)
      } catch (e) {
        console.log(e)
      }
      // 渲染字体
      // font属性设置顺序：font-style, font-variant, font-weight, font-size, line-height, font-family
      ctx.fillStyle = Cesium.Color.WHITE.toCssColorString()
      ctx.font = 'bold 20px Microsoft YaHei'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, size / 2, size / 2)

      return canvas
    })
    return promise
  }

  /**
   * 定位到对象
   */
  // flyTo() {
  //   this.dataSource?.entities.values && this.viewer.flyTo(this.dataSource.entities.values)
  // }

  /**
   * 销毁对象
   */
  destroy() {
    this.handler && this.primitiveCluster.clusterEvent.removeEventListener(this.handler)
    this.primitiveCluster && this.viewer.scene.primitives.remove(this.primitiveCluster)
    this.primitiveCluster = null
    this.handler = null
    this.type = null
    this.option = null
  }

  /**
   * 设置显示/隐藏
   * @param {boolean} bool
   */
  set show(bool) {
    this._show = bool
    if (this.primitiveCluster) {
      this.primitiveCluster.show = bool
    }
  }
  get show() {
    return this._show
  }
}
