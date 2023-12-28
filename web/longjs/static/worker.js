// 通过importScripts引入.js文件
importScripts('libs/turf.min.js')
;(() => {
  console.time('worker计算点位')
  // 监听 main 并将缓冲区转移到 worker
  self.onmessage = function handleMessageFromMain(msg) {
    console.log('message from main received in worker:', msg.data)
    let resultPoints = []
    let [pointNumber, geometry] = msg.data
    let bbox = turf.bbox(geometry)
    let point = turf.randomPoint(pointNumber, { bbox })
    resultPoints = turf.pointsWithinPolygon(point, geometry)

    self.postMessage(resultPoints)
  }
  console.timeEnd('worker计算点位')
})()
