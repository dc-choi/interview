---
tags: [runtime, nodejs, async, io, security]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Async I/O", "비동기 I/O"]
---

# Async I/O

## Blocking vs Non-Blocking

| 구분 | 설명 |
|------|------|
| Blocking | Node.js 프로세스에서 JS 실행이 비-JS 작업(I/O) 완료까지 기다림. 이벤트 루프가 JS를 계속 실행할 수 없음 |
| Non-Blocking | I/O 작업이 백그라운드에서 처리되고 완료 시 콜백으로 결과를 받음 |

- Node.js 표준 라이브러리의 모든 I/O 메서드는 논블로킹 비동기 버전을 제공
- Sync로 끝나는 메서드가 블로킹 대응 메서드

### 동시성과 처리량
- Node.js의 JS 실행은 싱글 스레드이므로 동시성 = 이벤트 루프가 다른 작업 완료 후 JS 콜백을 실행할 수 있는 용량
- 예: 요청당 50ms 중 45ms가 DB I/O → 논블로킹 선택 시 요청당 45ms를 다른 요청 처리에 활용
- 블로킹 vs 논블로킹 선택만으로 용량에 **상당한 차이**

## 이벤트 루프를 차단하지 마세요

Node.js는 적은 수의 스레드로 많은 클라이언트를 처리. 두 가지 유형의 스레드가 존재:
- **이벤트 루프** (메인 스레드): JS 콜백 및 비차단 I/O 처리
- **워커 풀** (스레드 풀, libuv): "비싼" 작업 처리 (블로킹 I/O, CPU 집약적 작업)

### 경험 법칙
주어진 시간에 각 클라이언트와 관련된 작업이 "작을" 때 Node.js는 빠르다.

### 차단의 결과
- **성능**: 무거운 작업을 정기적으로 수행하면 처리량(요청/초) 저하
- **보안**: 특정 입력에 스레드가 차단되면 악의적 클라이언트가 DoS 공격 가능

### 이벤트 루프에서 실행되는 코드
- 초기화 단계: 모듈 require, 이벤트 콜백 등록
- 이후: 들어오는 클라이언트 요청에 적절한 콜백 실행
- 콜백은 동기적으로 실행되고 완료 후 비동기 요청을 등록할 수 있음

### 워커 풀에서 실행되는 코드 (libuv)

**I/O 집약적:**
- dns.lookup(), dns.lookupService()
- fs.FSWatcher()와 명시적 동기식을 제외한 모든 파일 시스템 API

**CPU 집약적:**
- crypto.pbkdf2(), crypto.scrypt(), crypto.randomBytes(), crypto.randomFill(), crypto.generateKeyPair()
- 명시적 동기식을 제외한 모든 zlib API

## 이벤트 루프 차단 유형

### REDOS (정규식 서비스 거부)
- 취약한 정규식은 기하급수적 O(2^n) 시간이 소요될 수 있음
- 불일치 시 여러 경로를 시도하면서 기하급수적 동작이 트리거됨

**취약한 정규식 피하기:**
- (a+)*와 같은 중첩 한정자 피하기
- (a|a)*와 같은 겹치는 OR절 피하기
- (a.*)\1과 같은 역참조 사용하지 않기
- 단순 문자열 일치는 indexOf 사용 (O(n) 보장)

### JSON DOS
- JSON.parse/stringify는 입력 크기가 크면 오래 걸릴 수 있음
- 50MB 문자열 stringify에 0.7초, parse에 1.3초
- 클라이언트 객체를 다루는 경우 크기에 주의

### Node.js 핵심 모듈의 동기식 API
서버에서 사용하지 말아야 할 동기식 API:
- crypto: randomBytes(동기), randomFillSync, pbkdf2Sync
- zlib: inflateSync, deflateSync
- fs: 모든 동기식 파일 시스템 API
- child_process: spawnSync, execSync, execFileSync

## 복잡한 계산 해결 방법

### 파티셔닝
- 계산을 분할하여 각각 이벤트 루프에서 실행하되 정기적으로 다른 보류 이벤트에 턴 부여
- 간단한 작업(배열 반복 등)에 적합

### 오프로딩
- 이벤트 루프에서 워커 풀로 작업을 옮김
- 멀티 코어의 이점을 활용 가능
- 통신 비용(직렬화/역직렬화) 오버헤드 있으나 다중 코어 이점으로 상쇄
- 방법: C++ 애드온, Worker Threads, Child Process, Cluster

### CPU 바운드 vs I/O 바운드 작업 분리
- CPU 집약적: 워커가 예약된 동안만 진행. 논리 코어 수보다 많은 워커는 낭비
- I/O 집약적: 응답 대기 중 다른 워커가 요청 가능. 코어 수보다 많아도 OK
- 별도의 계산 워커 풀을 유지하는 것이 좋음

## 워커 풀 차단 방지

### 작업 시간 변동 최소화
- 긴 작업은 워커 풀 크기를 효과적으로 줄임
- 각 작업을 비슷한 비용의 하위 작업으로 분할 (작업 파티셔닝)
- 짧은/긴 작업을 구분하여 별도 워커 풀로 라우팅하는 것도 방법

## 보안 모범 사례 (Node.js)

### HTTP DoS (CWE-400)
- 리버스 프록시로 캐싱/로드밸런싱/IP 블랙리스트
- 서버 타임아웃 구성 (headersTimeout, requestTimeout, keepAliveTimeout)
- 호스트당 및 총 오픈 소켓 수 제한
- **슬로우로리스 공격**: 요청을 느리게 조각화하여 전송, 동시 연결 최대치 도달

### HTTP 요청 스머핑 (CWE-444)
- 프론트엔드(프록시)와 백엔드가 모호한 HTTP 요청을 다르게 해석하는 것을 악용
- insecureHTTPParser 옵션 사용 금지, HTTP/2 종단 간 사용

### 타이밍 공격 (CWE-208)
- 응답 시간 측정으로 민감 정보 유추 (비밀번호 길이/값 추측)
- crypto.timingSafeEqual 사용 (상수 시간 비교)
- 비밀번호 비교에 scrypt 사용

### 프로토타입 오염 (CWE-1321)
- __proto__, constructor, prototype을 악용하여 JS 객체에 프로퍼티 삽입
- Object.create(null)로 프로토타입 없이 생성
- Object.freeze()로 프로토타입 고정
- --disable-proto 플래그 사용

### 공급망 공격
- --ignore-scripts로 임의 스크립트 실행 방지
- 특정 버전 고정 + 잠금 파일 사용
- npm install 대신 **npm ci** 사용
- package.json 종속성 이름 오타 확인

## 프로파일링

- Node.js 자체 V8 내장 프로파일러 제공
- --prof 옵션으로 틱 파일 생성 → --prof-process로 분석
- 동기식 로직을 비동기로 바꾸면 성능 향상 가능 (이벤트 루프가 묶이지 않음)

## NODE_ENV

- NODE_ENV를 production으로 설정하면:
  - express: 로깅 최소화, 더 많은 캐싱, 템플릿 엔진 캐시
  - 많은 라이브러리가 NODE_ENV를 인식하여 최적화 적용

## 관련 문서
- [[Event-Loop|Node.js Event Loop]]
- [[Thread-vs-Event-Loop|Thread vs Event Loop]]
- [[Backpressure|스트림 배압]]
- [[Concurrency-and-Process|동시성과 프로세스]]
