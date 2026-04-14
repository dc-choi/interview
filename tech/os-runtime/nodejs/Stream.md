---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["Stream", "스트림"]
---

# 스트림 (Stream)

데이터를 청크(chunk) 단위로 처리하는 추상 인터페이스. 전체 데이터를 메모리에 올리지 않고도 대용량 데이터를 처리할 수 있으며, 모든 스트림은 EventEmitter의 인스턴스이다.

## 하위 문서

- [[Stream-Types|스트림 타입과 배압]] — Readable/Writable/Duplex/Transform 4가지 타입, 배압(Backpressure), highWaterMark, pipe() 기본
- [[Stream-Advanced|스트림 고급 패턴]] — EventEmitter 아키텍처, Web Streams vs Node Streams, pipeline() 에러 안전, cork/uncork 배칭

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[libuv]]
- [[Node.js]]
