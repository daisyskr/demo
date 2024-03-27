// 通过importScripts引入.js文件
importScripts('../../static/libs/turf.min.js')
;(() => {
  console.time('worker计算点位')
  // 监听 main 并将缓冲区转移到 worker
  self.onmessage = function handleMessageFromMain(msg) {
    console.log('message from main received in worker:', msg.data)
    let [number, bbox] = msg.data
    let points = turf.randomPoint(number, { bbox })
    self.postMessage(points)
  }
  console.timeEnd('worker计算点位')
})()
