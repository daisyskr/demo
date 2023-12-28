var CesiumHeatmapGL = (function (Cesium, createWebGLHeatmap) {
  function CHGL(chglviewer, geojson, option) {
    this._viewer = chglviewer
    this._option = option
    if (geojson) {
      switch (typeof geojson) {
        case 'string':
          this.loadGeojson(geojson)
          break
        case 'object':
          this.initHeatmap(geojson)
          break

        default:
          break
      }
    }
  }

  CHGL.prototype.loadGeojson = function (url) {
    getJSON(
      url,
      function (data) {
        this.initHeatmap(data)
      }.bind(this)
    )
  }
  CHGL.prototype.initHeatmap = function (data) {
    let _this = this
    var lonmin = 1000
    var lonmax = -1000
    var latmin = 1000
    var latmax = -1000
    data.features.forEach(function (feature) {
      var lon = feature.geometry.coordinates[0]
      var lat = feature.geometry.coordinates[1]
      lonmin = lon < lonmin ? lon : lonmin
      latmin = lat < latmin ? lat : latmin
      lonmax = lon > lonmax ? lon : lonmax
      latmax = lat > latmax ? lat : latmax
    })
    var xrange = lonmax - lonmin
    var yrange = latmax - latmin
    var extent = { xMin: lonmin - xrange / 10, yMin: latmin - yrange / 10, xMax: lonmax + xrange / 10, yMax: latmax + yrange / 10 }
    var heatmapcanvas = document.createElement('canvas')
    document.body.appendChild(heatmapcanvas)
    heatmapcanvas.width = 1000
    heatmapcanvas.height = parseInt((1000 / (extent.xMax - extent.xMin)) * (extent.yMax - extent.yMin))
    try {
      var heatmap = (this._heatmap = createWebGLHeatmap({ canvas: heatmapcanvas, intensityToAlpha: true }))
    } catch (error) {
      console.error(error)
    }
    let minVal, maxVal
    let valArray = []
    data.features.forEach(item => {
      if (item.properties && _this._option && _this._option.valName) {
        if (typeof item.properties[_this._option.valName] == 'number') {
          valArray.push(item.properties[_this._option.valName])
        }
      }
    })
    minVal = Math.min(...valArray)
    maxVal = Math.max(...valArray)

    data.features.forEach(function (feature) {
      var x = ((feature.geometry.coordinates[0] - extent.xMin) / (extent.xMax - extent.xMin)) * heatmapcanvas.clientWidth
      var y = (-(feature.geometry.coordinates[1] - extent.yMin) / (extent.yMax - extent.yMin) + 1) * heatmapcanvas.clientHeight
      let intensity
      let { size, valName } = _this._option || {}
      size = size || 20
      if (valName && feature.properties) {
        intensity = ((feature.properties[_this._option.valName] - minVal) / (maxVal - minVal)) * 0.1
        if (intensity == 0) {
          intensity = 0.0001
        }
      } else {
        intensity = 0.05
      }
      heatmap.addPoint(x, y, size, intensity)
    })
    heatmap.adjustSize()
    heatmap.update()
    heatmap.display()
    this.drawHeatmapRect(heatmapcanvas, extent)
    this._viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(extent.xMin, extent.yMin, extent.xMax, extent.yMax)
    })
  }

  CHGL.prototype.drawHeatmapRect = function (canvas, extent) {
    var image = convertCanvasToImage(canvas)
    this._worldRectangle = this._viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.RectangleGeometry({
            rectangle: Cesium.Rectangle.fromDegrees(extent.xMin, extent.yMin, extent.xMax, extent.yMax),
            vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
          })
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
          aboveGround: false
        }),
        show: true
      })
    )
    this._worldRectangle.appearance.material = new Cesium.Material({
      fabric: {
        type: 'Image',
        uniforms: {
          image: image.src
        }
      }
    })
  }

  CHGL.prototype.updateHeatmap = function () {
    this._heatmap.adjustSize()
    this._heatmap.update()
    this._heatmap.display()

    var image = convertCanvasToImage(this._heatmap.canvas)
    this._worldRectangle.appearance.material.uniforms.image = image.src
    //  = new Cesium.Material({
    // 	fabric : {
    // 		type : 'Image',
    // 		uniforms : {
    // 			image : image.src
    // 		}
    // 	}
    // });
  }

  CHGL.prototype.multiply = function (value) {
    this._heatmap.multiply(value)
    this.updateHeatmap()
  }

  CHGL.prototype.clamp = function (min, max) {
    this._heatmap.clamp(min, max)
    this.updateHeatmap()
  }

  CHGL.prototype.blur = function () {
    this._heatmap.blur()
    this.updateHeatmap()
  }

  function convertCanvasToImage(canvas) {
    var image = new Image()
    image.src = canvas.toDataURL('image/png')
    return image
  }

  function getJSON(url, callback) {
    const xhr = new XMLHttpRequest()
    xhr.responseType = 'json'
    xhr.open('get', url, true)
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        callback(xhr.response)
      } else {
        throw new Error(xhr.statusText)
      }
    }
    xhr.send()
  }

  return CHGL
})(window.Cesium || {}, window.createWebGLHeatmap || {})
