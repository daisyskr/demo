/*
 * @Description: <点聚合>
 * @version: 1.0.0
 * @Author: YangYuzhuo
 * @Date: 2024-01-02 11:08:52
 * @LastEditors: YangYuzhuo
 * @LastEditTime: 2024-01-03 16:56:29
 * Copyright 2024
 * listeners
 */
import centroid from '@turf/centroid'
import BaseEffect from './BaseEffect'
import { colored_user } from '../kit-assets/base64'
import { light_blue_bkg } from '../kit-assets/base64'
import { dark_blue_bkg } from '../kit-assets/base64'
import { orange_bkg } from '../kit-assets/base64'
import { red_bkg } from '../kit-assets/base64'

const defaultOption = {
  data: [],
  pixelRange: 60,
  minimumClusterSize: 2,
  originImageSize: 64,
  poiStyle: {
    image: colored_user,
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
      image: light_blue_bkg,
      width: 40,
      height: 40,
    },
    {
      interval: [11, 50],
      image: dark_blue_bkg,
      width: 48,
      height: 48,
    },
    {
      interval: [51, 100],
      image: orange_bkg,
      width: 56,
      height: 56,
    },
    {
      interval: [101, 9999999999],
      image: red_bkg,
      width: 72,
      height: 72,
    },
  ],
}
export default class Cluster extends BaseEffect {
  constructor(viewer) {
    super(viewer)
    this.type = 'Cluster'
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

    let _this = this
    this.dataSource = new Cesium.CustomDataSource('cluster')
    let dataSourcePromise = this._v.dataSources.add(this.dataSource)
    this.addData(this.option.data)
    dataSourcePromise.then(function (e) {
      _this.#initCluster()
    })
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
    if (!this.dataSource) {
      console.log('请先初始化Cluster实例')
      return
    }
    let { image, width, height, showlabel, label, labelStyle } = this.option.poiStyle
    let { font, verticalOrigin, horizontalOrigin, pixelOffset, style, showBackground, backgroundColor } = labelStyle
    let _this = this
    data.forEach((item) => {
      if (item?.geometry?.coordinates?.length) {
        let { geometry, properties = {} } = item
        let center = geometry.type == 'Point' ? { geometry } : centroid({ type: 'Feature', geometry })
        let z = Number(properties?.height) || 0
        let param = {
          properties: properties,
          position: Cesium.Cartesian3.fromDegrees(...center.geometry.coordinates, z),
          billboard: {
            image: properties?.image || image,
            width,
            height,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }
        if (showlabel && label) {
          param.label = {
            text: properties[label],
            font,
            verticalOrigin: Cesium.VerticalOrigin[verticalOrigin],
            horizontalOrigin: Cesium.HorizontalOrigin[horizontalOrigin],
            pixelOffset: new Cesium.Cartesian2(...pixelOffset),
            style: Cesium.LabelStyle[style],
            showBackground,
            backgroundColor: Cesium.Color.fromCssColorString(backgroundColor),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        }
        _this.dataSource.entities.add(new Cesium.Entity(param))
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
    this.dataSource.clustering.enabled = true
    let { pixelRange, minimumClusterSize, originImageSize, interval } = this.option
    this.dataSource.clustering.pixelRange = pixelRange
    this.dataSource.clustering.minimumClusterSize = minimumClusterSize

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
    this.dataSource.clustering.clusterEvent.addEventListener(this.handler)
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
  flyTo() {
    this.dataSource?.entities.values && this._v.flyTo(this.dataSource.entities.values)
  }

  /**
   * 销毁对象
   */
  destroy() {
    this.handler && this.dataSource.clustering.clusterEvent.removeEventListener(this.handler)
    this.dataSource && this._v.dataSources.remove(this.dataSource)
    this.dataSource = null
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
    if (this.dataSource) {
      this.dataSource.show = bool
    }
  }
}
