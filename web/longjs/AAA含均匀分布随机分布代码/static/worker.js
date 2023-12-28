// 通过importScripts引入.js文件
importScripts('libs/turf.min.js')
;(() => {
  console.time('worker计算点位')
  // 监听 main 并将缓冲区转移到 worker
  self.onmessage = function handleMessageFromMain(msg) {
    console.log('message from main received in worker:', msg.data)
    let type = msg.data[0]
    let resultPoints = []
    if (type == 'random') {
      let [, pointNumber, bbox, geometry] = msg.data
      let i = 0
      while (i < pointNumber) {
        let point = turf.randomPoint(1, { bbox })
        let withinPoints = turf.pointsWithinPolygon(point, geometry)
        if (withinPoints?.features?.length) {
          resultPoints.push(withinPoints?.features[0])
          i++
        }
      }
    } else if (type == 'uniform') {
      let [, pointsArray, geometry] = msg.data
      let points = turf.points(pointsArray)
      resultPoints = turf.pointsWithinPolygon(points, geometry)
    }

    self.postMessage(resultPoints)
  }
  console.timeEnd('worker计算点位')
})()
