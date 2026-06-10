---
tags: [runtime, nodejs]
status: index
category: "OS & Runtime"
aliases: ["Worker Threads", "워커 스레드"]
---

### 워커 스레드 (Worker Threads)
Node.js에서 CPU 집약적인 작업을 병렬로 처리하기 위한 모듈. (`worker_threads`)
주제별 상세는 아래 문서로 분리했다.

- [[Worker-Threads-Core|핵심 개념, libuv 스레드 풀과의 차이, 사용 예시, 통신 방식, 사용 판단 기준]]
- [[Worker-Threads-Comparison|Cluster와 child_process 비교, 3종 통합 매트릭스, 선택 결정 기준]]
- [[Worker-Threads-Patterns|setImmediate 인터리빙 기법과 추천 라이브러리 (piscina, workerpool, caf)]]

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[libuv]]
- [[Node.js]]
