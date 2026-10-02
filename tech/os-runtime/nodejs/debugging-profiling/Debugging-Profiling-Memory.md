---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["메모리 프로파일링", "메모리 진단", "Profiling Memory"]
---

# 디버깅 & 프로파일링 — 프로파일링과 메모리 진단

도구 선택과 디버깅 기본은 [[Debugging-Profiling-Tools|도구 선택과 디버깅]]에서 먼저 확인할 것.

## 프로파일링
V8 프로파일러는 실행 중 스택을 샘플링한다. summary에서 JavaScript, native와 GC 비중을 확인하고 bottom-up에서 비용이 큰 함수의 호출자를 추적한다. native 함수가 넓게 나타나도 시작점은 JavaScript의 동기 API 호출일 수 있다.

### 내장 프로파일러 사용
```bash
NODE_ENV=production node --prof app.js              # 틱 파일 생성
node --prof-process isolate-0xnnnn-v8.log > processed.txt  # 분석
```

### 예시: 동기 → 비동기 암호 해싱
아래 수치는 Node.js 가이드의 과거 ApacheBench 예시다. 직접 측정한 값이 아니며 하드웨어와 부하 조건에 따라 달라진다. 코드는 실행 위치 비교용이며 비밀번호 해싱 파라미터 권장값이 아니다. 비동기로 바꿔도 연산량은 남고 스레드풀 포화가 새로운 병목이 될 수 있다.

```js
// 동기식 (이벤트 루프 차단) — 5.33 req/s
const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');

// 비동기식 (이벤트 루프 해방) — 19.46 req/s (3.65배 개선)
crypto.pbkdf2(password, salt, 10000, 512, 'sha512', (err, hash) => { /* ... */ });
```

| 메트릭 | 동기식 | 비동기식 | 개선 |
|--------|--------|---------|------|
| 초당 요청 | 5.33 | 19.46 | **3.65배** |
| 평균 응답 시간 | 3754ms | 1027ms | **73% 감소** |

### Linux Perf
```bash
# 1. perf로 프로파일 기록
perf record -e cycles:u -g -- node --perf-basic-prof app.js

# 2. 스크립트 출력
perf script > perfs.out
```

| 플래그 | 설명 |
|--------|------|
| `--perf-basic-prof` | JS 함수 이름을 perf에서 볼 수 있도록 매핑 |
| `--perf-basic-prof-only-functions` | 출력 최소화, 오버헤드 감소 |
| `--interpreted-frames-native-stack` | V8 파이프라인 변경 대응 (v10+) |

**실행 중인 프로세스 샘플링**
```bash
perf record -F99 -p <확인한-PID> -g -- sleep 3  # 대상 PID를 확인한 뒤 3초 기록
```

Node의 perf 옵션이 만드는 `/tmp/perf-PID.map`은 JIT 주소와 이름의 매핑이고, `perf record`의 표본은 `perf.data`에 기록된다. 서로 다른 산출물이다. 매핑 파일 크기, 권한과 수집 overhead를 확인한다. 함수명이 누락되면 V8 버전, unwind와 symbol 설정을 조사한다.

## 메모리 진단
```
증상: 지속적인 메모리 사용량 증가, 프로세스 충돌/재시작, GC 활동 증가로 응답 시간 저하.
Node.js는 가비지 컬렉션 언어이므로, 참조가 남아있는 객체는 수집되지 않아 메모리 누수가 발생한다.
```

### 누수의 일반적 패턴

| 패턴 | 증상 | 대응 |
|------|------|------|
| **전역 변수에 데이터 누적** | 모듈 스코프 Map/Array에 push만 하고 정리 X | TTL, LRU 캐시 또는 명시 정리 |
| **EventEmitter 리스너 누적** | 같은 emitter에 리스너 반복 등록 (`on` 누적) | `once` 사용 또는 `off`/`removeListener` |
| **클로저가 큰 객체 캡처** | 핸들러 함수가 큰 변수를 참조해 GC 막음 | 필요한 필드만 추출, 핸들러 분리 |
| **타이머 미정리** | `setInterval` 등록 후 해제 X | `clearInterval`, OnDestroy 정리 |
| **HTTP 요청 미종료** | 응답 안 끝나서 socket, 헤더 잔존 | timeout, `req.destroy()` |
| **Buffer 풀 슬라이스 장기 보관** | 현행 v24.18.0+/v26.3.0+에서는 64KiB 풀 전체가 GC 안 됨. 이전 릴리스 기본값은 8KiB | `allocUnsafeSlow` 또는 복사본 |

```ts
// ❌ 리스너 누적
setInterval(() => {
  emitter.on('data', handler);   // 매 1초마다 새 리스너 → 메모리 폭증
}, 1000);

// ✅ 한 번만 처리할 소비자는 한 번만 등록
emitter.once('data', handler);

// 반복 소비자를 제거할 때는 같은 함수 참조로 해제
emitter.on('data', handler);
emitter.off('data', handler);
```

`emitter.setMaxListeners(N)` 기본 10 — 초과 시 `MaxListenersExceededWarning` 경고 출력 (좋은 1차 신호).

### Heap Snapshot
특정 시점의 메모리 상태를 캡처하여 어떤 객체가 메모리를 점유하고 있는지 분석한다.
```js
const v8 = require('node:v8');

// 프로그래매틱 스냅샷 생성
v8.writeHeapSnapshot();  // 파일로 저장됨

// Chrome DevTools에서 분석:
// Memory 탭 → Load → 스냅샷 파일 로드
// Comparison 뷰로 두 스냅샷 간 차이 비교 (누수 객체 식별)
```

Heap snapshot 생성 중에는 main thread가 멈추고 heap 크기만큼 추가 memory가 필요할 수 있다. 운영 instance에서 바로 실행하면 응답 중단이나 OOM으로 process가 종료될 수 있으므로 traffic을 분리한 instance와 충분한 memory 여유에서 실행한다.

부팅과 초기 캐시 할당이 끝난 뒤 기준 스냅샷을 만들고 의심 작업을 반복한 후 두 번째 스냅샷을 비교한다. 양의 크기 차이뿐 아니라 retainer 경로와 정리 후에도 남는 객체를 확인한다. 힙 스냅샷에는 민감한 값이 포함될 수 있어 접근과 보관을 제한한다.

### Heap Profiler (Allocation Sampling)
```
Chrome DevTools Memory 탭에서:
- Allocation instrumentation on timeline: 시간에 따른 할당 패턴 추적
- Allocation sampling: instrumentation보다 가벼운 sampling 기반 분석. 운영 적용 전 overhead를 통제된 환경에서 측정
```

할당 profiler는 시간 구간의 할당 위치를, snapshot은 특정 시점의 생존 객체와 참조 관계를 보여 준다. 할당량이 많은 함수가 곧 누수 원인인 것은 아니다.

### GC 추적
```bash
node --trace-gc app.js   # GC 이벤트를 콘솔에 출력
```
```
출력 예:
[44547:0x02f0] 65 ms: Scavenge 2.3 (3.0) -> 1.9 (4.0) MB, 0.5 / 0.0 ms

해석: Scavenge(Young Generation GC) — 2.3MB → 1.9MB로 회수, 소요 0.5ms
```

```js
// 프로그래매틱 모니터링
const v8 = require('node:v8');
const stats = v8.getHeapStatistics();
console.log(stats.used_heap_size);        // 사용 중인 힙 크기
console.log(stats.total_heap_size);       // 전체 힙 크기
console.log(stats.heap_size_limit);       // 힙 최대 크기
```

## Flame Graph

프레임의 폭은 해당 스택에 포함된 표본의 비중이고 높이는 호출 깊이다. 일반 flame graph의 가로 위치는 시간 순서가 아니다. 넓은 프레임의 자식과 self 비용을 구분하며 색상만으로 병목을 판정하지 않는다.

### 0x 패키지 (가장 간편)
```bash
npm install -g 0x
0x -- node app.js       # Ctrl+C 뒤 <pid>.0x/flamegraph.html 생성
0x --open -- node app.js # 생성 뒤 브라우저에서 바로 열기
```

### Linux Perf 기반 (상세 분석)
```bash
# 1. perf로 기록
perf record -e cycles:u -g -- node --perf-basic-prof app.js

# 2. 스크립트 추출
perf script > perfs.out

# 3. Flame Graph 생성 (Brendan Gregg 도구가 설치된 환경)
stackcollapse-perf.pl perfs.out | flamegraph.pl --colors=js > profile.svg
```

필터링은 native 비용이나 GC 원인을 숨길 수 있으므로 원본을 보존하고 필터 전후를 비교한다. 진단 파일의 외부 업로드는 소스 이름과 실행 정보의 공개 범위를 먼저 확인한다.

## 출처
- [Node.js, Memory diagnostics](https://nodejs.org/learn/diagnostics/memory)
- [Node.js, Using heap profiler](https://nodejs.org/learn/diagnostics/memory/using-heap-profiler)
- [Node.js, Using heap snapshot](https://nodejs.org/learn/diagnostics/memory/using-heap-snapshot)
- [Node.js, Tracing garbage collection](https://nodejs.org/learn/diagnostics/memory/using-gc-traces)
- [Node.js, Using Linux perf](https://nodejs.org/learn/diagnostics/poor-performance/using-linux-perf)
- [Node.js, Flame graphs](https://nodejs.org/learn/diagnostics/flame-graphs)
- [Node.js 공식 문서, Profiling Node.js Applications](https://nodejs.org/en/learn/getting-started/profiling)
- [Node.js, V8](https://nodejs.org/api/v8.html)
- [Node.js, Events](https://nodejs.org/api/events.html)
- [Node.js, Buffer](https://nodejs.org/api/buffer.html)
- [0x README — davidmarkclements](https://github.com/davidmarkclements/0x)

## 관련 문서
- [[Debugging-Profiling|디버깅 & 프로파일링 인덱스]]
- [[Debugging-Profiling-Tools|도구 선택과 디버깅]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[OOM-Troubleshooting|OOM 트러블슈팅]]
