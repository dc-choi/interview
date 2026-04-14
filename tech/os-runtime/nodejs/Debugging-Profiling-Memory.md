---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["프로파일링", "메모리 진단", "Profiling Memory"]
---

# 디버깅 & 프로파일링 — 프로파일링과 메모리 진단

도구 선택과 디버깅 기본은 [[Debugging-Profiling-Tools|도구 선택과 디버깅]]에서 먼저 확인할 것.

## 프로파일링
```
V8 내부 프로파일러를 사용하여 정기적으로 스택을 샘플링한다.
결과와 JIT 컴파일 같은 최적화 이벤트를 "틱(ticks)" 형태로 기록한다.
```

### 내장 프로파일러 사용
```bash
NODE_ENV=production node --prof app.js              # 틱 파일 생성
node --prof-process isolate-0xnnnn-v8.log > processed.txt  # 분석
```

### 실제 사례: 동기 → 비동기 암호 해싱
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
perf record -F99 -p $(pgrep -n node) -g -- sleep 3  # 3초간 초당 99회 샘플링
```

## 메모리 진단
```
증상: 지속적인 메모리 사용량 증가, 프로세스 충돌/재시작, GC 활동 증가로 응답 시간 저하.
Node.js는 가비지 컬렉션 언어이므로, 참조가 남아있는 객체는 수집되지 않아 메모리 누수가 발생한다.
```

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

### Heap Profiler (Allocation Sampling)
```
Chrome DevTools Memory 탭에서:
- Allocation instrumentation on timeline: 시간에 따른 할당 패턴 추적
- Allocation sampling: 더 가벼운 샘플링 기반 분석 (프로덕션 사용 가능)
```

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
```
함수에서 소비된 CPU 시간을 시각화하는 방법.
- X축: 스택 프레임의 폭 (해당 함수가 스택에 머문 시간 비율)
- Y축: 콜 스택의 깊이
- "플래토" 패턴: 넓고 평평한 영역이 핫 코드 경로 (최적화 대상)
```

### 0x 패키지 (가장 간편)
```bash
npm install -g 0x
0x -- node app.js       # 프로파일링 후 flamegraph.html 생성
# Ctrl+C로 종료하면 브라우저에서 flame graph 열림
```

### Linux Perf 기반 (상세 분석)
```bash
# 1. perf로 기록
perf record -e cycles:u -g -- node --perf-basic-prof app.js

# 2. 스크립트 추출
perf script > perfs.out

# 3. Node.js 내부 함수 필터링
sed -i -r \
  -e "/( __libc_start| LazyCompile | v8::internal::| Builtin:| Stub:)/d" \
  -e 's/ LazyCompile:[*~]?/ /' \
  perfs.out

# 4. Flame Graph 생성 (Brendan Gregg 도구)
cat perfs.out | stackcollapse-perf.pl | flamegraph.pl --colors=js > profile.svg

# 또는 flamegraph.com에 perfs.out 업로드
```

## 관련 문서
- [[Debugging-Profiling|디버깅 & 프로파일링 인덱스]]
- [[Debugging-Profiling-Tools|도구 선택과 디버깅]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Stream|스트림]]
- [[OOM-Troubleshooting|OOM 트러블슈팅]]
