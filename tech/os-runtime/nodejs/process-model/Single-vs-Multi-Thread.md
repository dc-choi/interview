---
tags: [runtime, nodejs, thread, event-loop, interview]
status: done
verified_at: 2026-07-15
category: "OS & Runtime"
aliases: ["Single vs Multi Thread", "Node.js 싱글 스레드 vs 멀티 스레드"]
---

# Node.js는 싱글 스레드인가 멀티 스레드인가

면접에서 자주 나오는 질문. 정확한 답은 **기본 실행 컨텍스트의 이벤트 루프와 JavaScript callback은 한 스레드에서 실행되지만, 런타임은 libuv worker pool을 사용하고 `worker_threads`를 만들면 JavaScript도 여러 스레드에서 병렬 실행할 수 있다**는 것이다. 기준을 나눠 단계별로 정리한다.

## 1. 기본 모델: 메인 스레드 + OS 비동기 이벤트 시스템

기본 Node.js 실행 컨텍스트는 **하나의 메인 스레드**에서 이벤트 루프를 돌린다. 네트워크 I/O(HTTP 요청, DB 조회 등)의 경우, 이벤트 루프가 직접 블로킹하지 않고 OS의 비동기 이벤트 시스템을 사용한다.

| OS | 비동기 이벤트 시스템 |
|-----|-------------------|
| Linux | `epoll` |
| macOS/BSD | `kqueue` |
| Windows | `IOCP` |

동작 흐름:
1. 메인 스레드가 OS 커널에 "이 소켓에서 데이터 오면 알려줘" 라고 등록
2. 메인 스레드는 블로킹되지 않고 다음 작업을 계속 수행
3. OS가 이벤트 발생 시 완료를 알림 → 이벤트 루프가 콜백 실행

일반적인 소켓 네트워크 I/O는 libuv worker pool에 보내지 않고 각 이벤트 루프의 스레드에서 non-blocking socket과 OS poller를 사용한다.

## 2. 혼란의 원인: 파일 I/O와 libuv 스레드 풀

"그럼 `fs.readFile`은?" 여기서 멀티 스레드 이야기가 등장한다.

**문제**: 파일 I/O와 DNS 조회(`getaddrinfo`)는 OS마다 **통일된 비동기 API가 없다.** Linux의 AIO는 불완전하고, BSD는 별도 구현이 필요하며, 플랫폼마다 제약이 다르다.

**해결**: libuv는 **자체 스레드 풀(기본 4개)** 을 두고, 블로킹이 예상되는 작업을 워커 스레드에 위임한다. 메인 스레드는 워커 스레드에 일을 던지고 다음 작업을 계속한다.

스레드 풀에 위임되는 작업:
- 파일 시스템 작업 (`fs.readFile`, `fs.writeFile` 등)
- DNS 조회 (`dns.lookup` — `getaddrinfo` 기반)
- CPU 집약적 내장 작업 (`crypto.pbkdf2`, `zlib` 압축 등)
- 사용자 정의 C++ 애드온의 비동기 작업

→ 즉, Node.js **내부적으로는 멀티 스레드를 활용**한다. 이게 혼란의 원인이다.

이 스레드 풀은 **프로세스 전역에 하나만 존재하는 공유 리소스**다. 각 실행 컨텍스트가 자기 풀을 소유하는 게 아니다. Worker Threads를 생성해도 Worker마다 libuv 스레드 풀이 따로 생기지 않고, 모든 Worker와 메인 스레드가 **같은 프로세스 전역 풀을 공유**한다 (Worker는 독립된 V8 인스턴스와 이벤트 루프는 갖지만 libuv 스레드 풀은 소유하지 않는다). 그래서 파일 I/O, `crypto` 등을 여러 컨텍스트에서 동시에 던지면 기본 4개 슬롯을 두고 경합할 수 있다.

상세: [[libuv-Threading|libuv 스레드 풀]], [[Worker-Threads-Core|Worker Threads 핵심]]

## 3. 왜 여전히 "싱글 스레드"인가

### 개발자 관점
기본 실행 컨텍스트에서 callback과 애플리케이션 JavaScript는 메인 스레드에서 순차적으로 실행된다. libuv worker pool은 파일 I/O, DNS, 일부 crypto와 zlib 같은 네이티브 작업을 처리하며 애플리케이션 JavaScript를 실행하지 않는다. 다만 `worker_threads`로 만든 각 Worker는 독립된 JavaScript 실행 스레드와 이벤트 루프를 가지므로, 프로세스 전체의 JavaScript가 항상 메인 스레드 하나에서만 실행된다는 표현은 틀리다.

### 결정적 증거: CPU-bound 작업

```javascript
// 메인 스레드를 그대로 점유하는 코드
for (let i = 0; i < 1_000_000_000; i++) {
  // 복잡한 계산
}
```

이 코드를 기본 컨텍스트에서 그대로 실행하면 libuv worker pool로 위임되지 않는다. **해당 이벤트 루프의 JS 실행 스레드가 점유되기 때문에** 루프가 도는 동안 그 컨텍스트는 새 요청 callback을 처리하지 못한다. Worker로 옮기면 메인 이벤트 루프와 병렬로 실행할 수 있다.

**Java/Python 멀티 스레드 서버와의 대비:**
Java Tomcat처럼 요청당 스레드를 쓰는 모델에서는, 한 스레드가 CPU 연산에 묶여도 다른 스레드가 새 요청을 받을 수 있다. 기본 Node.js 서버는 요청당 스레드 구조가 아니므로, 메인 이벤트 루프에서 수행한 CPU 작업 하나가 그 컨텍스트의 요청 처리를 멈출 수 있다.

## 4. 결론

| 관점 | 스레드 수 |
|------|----------|
| 기본 실행 컨텍스트의 JS callback | **1개 (메인 스레드)** |
| 소켓 네트워크 I/O | libuv worker pool 미사용, 이벤트 루프와 OS poller가 처리 |
| 파일/DNS 등 일부 작업 | 기본 **4개**인 프로세스 전역 libuv worker pool |
| CPU 연산을 위한 JS 병렬 실행 | Worker마다 독립 실행 스레드 생성 |

**Node.js의 기본 이벤트 루프는 단일 스레드지만, Node.js 프로세스와 JavaScript 실행 능력 전체가 단일 스레드인 것은 아니다.**
각 이벤트 루프의 callback 실행은 직렬이므로 개발자는 **논블로킹 구조**를 의식해야 한다. CPU 집약적 작업은 Worker Threads로 오프로드하거나, `setImmediate` 기반 청킹으로 이벤트 루프 기아를 방지한다.

## 면접 답변 템플릿

> "Node.js의 기본 실행 컨텍스트에서는 이벤트 루프와 JavaScript callback이 메인 스레드 하나에서 실행됩니다. 파일 I/O와 일부 DNS, crypto, zlib 작업은 libuv의 전역 worker pool을 사용하고, 일반 소켓 I/O는 non-blocking socket과 OS poller를 사용합니다. CPU 집약적 JavaScript를 메인 컨텍스트에서 실행하면 이벤트 루프를 막지만, worker_threads를 사용하면 독립된 스레드에서 JavaScript를 병렬 실행할 수 있습니다. 따라서 단일 이벤트 루프와 프로세스 전체의 스레드 모델을 구분해 설명해야 합니다."

## 실전 사례: 대용량 데이터 처리의 함정

"싱글 스레드지만 내부는 멀티" 라는 모델이 현실에서 **어떻게 한계로 드러나는지** 전형적 사례:

**상황**: 60억 건 JSON 레코드를 MongoDB에서 읽어 변환 후 재삽입하는 마이그레이션.

**관찰**: Node.js 인스턴스가 **CPU 코어 1개를 100% 점유**한 상태로 진행되는데, MongoDB는 CPU 3%만 사용. 작업이 예상 시간의 수 배 소요.

**원인 분석**:
- JSON.parse, stringify는 **메인 스레드에서** 실행 (CPU bound)
- libuv 워커 풀은 파일 I/O, DNS에만 사용, JS 로직 실행 안 함
- 한 인스턴스가 한 코어만 쓰므로 **서버의 나머지 코어는 놀고 있음**

**해결 패턴** — 스레드 늘리기 대신 **수평 확장**:
- Kubernetes에 **25개 이상 Node.js 인스턴스** 배포
- 각 인스턴스가 서로 다른 파티션의 데이터를 처리
- 전체 클러스터의 모든 코어가 병렬 활용됨
- MongoDB도 병렬 쓰기 부하를 받으며 활용률 상승

**교훈**: Node.js의 "싱글 스레드"는 **잘 설계된 허구**. 진짜 성능은 이 특성을 이해하고 **경량 컨테이너의 수평 확장**으로 끌어내는 데서 나옴. Worker Threads도 옵션이지만, 운영, 배포 관점에선 인스턴스 증가가 대부분 더 단순하고 확장 용이.

## 관련 문서
- [[Node.js|Node.js Overview]]
- [[Event-Loop|이벤트 루프]]
- [[libuv|libuv]]
- [[libuv-Threading|libuv 스레드 풀, 스레딩]]
- [[Worker-Threads|워커 스레드]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop (멀티스레드 패턴)]]
- [[Async-IO|Async I/O]]
- [[Nodejs-Production-Readiness|Node.js 프로덕션 체크리스트]]

## 출처
- [Node.js 공식 문서 — Don't Block the Event Loop (or the Worker Pool)](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
- [Node.js API — Worker Threads](https://nodejs.org/api/worker_threads.html)
- [libuv 공식 문서 — Design overview](https://docs.libuv.org/en/stable/design.html)
- [Naver Financial — Node.js가 싱글스레드 서버라는 미신 (대용량 데이터 처리)](https://medium.com/naverfinancial/node-js%EA%B0%80-%EC%8B%B1%EA%B8%80%EC%8A%A4%EB%A0%88%EB%93%9C-%EC%84%9C%EB%B2%84%EB%9D%BC%EB%8A%94-%EB%AF%B8%EC%8B%A0-feat-node-js%EC%9D%98-%EB%8C%80%EC%9A%A9%EB%9F%89-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%B2%98%EB%A6%AC-cf1d651290be)
