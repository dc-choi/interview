---
tags: [runtime, nodejs]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["디버깅 도구", "Debugging Tools"]
---

# 디버깅 & 프로파일링 — 도구 선택과 디버깅

진단 전에 Node 버전, OS, 증상과 발생 시점, 재현 입력, 최근 코드와 환경 변경을 기록한다. 지연이 높아도 CPU 연산 때문인지 DB, 네트워크나 큐 대기 때문인지 먼저 구분한다. 중단점을 거는 디버깅과 부하 중 실행 비중을 재는 프로파일링은 목적이 다르다.

## 진단 도구 선택 가이드

| 증상 | 진단 도구 | 참조 섹션 |
|------|---------|---------|
| 앱이 예상대로 동작하지 않음 | Inspector (Chrome DevTools, VS Code) | 디버깅 |
| 응답 시간이 느림 (높은 레이턴시) | V8 프로파일러, Linux Perf | [[Debugging-Profiling-Memory\|프로파일링]] |
| 메모리 사용량이 지속적으로 증가 | Heap Snapshot, GC Traces | [[Debugging-Profiling-Memory\|메모리 진단]] |
| CPU 사용량이 높음 | Flame Graph, Perf | [[Debugging-Profiling-Memory\|Flame Graph]] |
| 프로세스 충돌/재시작 반복 | Heap Snapshot + GC Traces | [[Debugging-Profiling-Memory\|메모리 진단]] |

## 디버깅
```
--inspect 스위치로 Node.js 프로세스가 디버깅 클라이언트를 수신한다.
기본: 127.0.0.1:9229 (각 프로세스에 고유 UUID 할당)
```

| 플래그 | 설명 |
|--------|------|
| `--inspect` | Inspector 활성화, 기본 127.0.0.1:9229 |
| `--inspect=[host:port]` | 주소/포트 지정 |
| `--inspect-brk` | 사용자 코드 시작 전 중단 |
| `--inspect-wait` | 디버거 연결 대기 |
| `node inspect script.js` | CLI 디버거로 실행 |

**Inspector 클라이언트**: Chrome DevTools (`chrome://inspect`), VS Code, WebStorm

**원격 디버깅 (SSH 터널)**
```bash
# 원격: node --inspect server.js
# 로컬: ssh -L 9221:localhost:9229 user@remote.example.com
# Chrome DevTools를 localhost:9221에 연결
```

**보안**: 디버그 포트를 공개적으로 노출 금지 (임의 코드 실행 위험). 기본적으로 127.0.0.1에만 바인딩.

### 라이브 디버깅 워크플로
```
1. node --inspect-brk app.js로 시작 (첫 줄에서 중단)
2. Chrome DevTools 또는 VS Code를 연결
3. 브레이크포인트 설정 → 코드를 단계별로 실행
4. 스코프 패널에서 변수 값 검사
5. 콘솔 패널에서 표현식 평가
6. Call Stack 패널에서 호출 경로 추적
```

### debugger 문과 단계 실행

`debugger;`는 코드에 고정한 breakpoint다. ECMAScript 명세는 디버거가 없거나 활성 상태가 아니면 이 문이 관찰 가능한 효과가 없다고 정한다. 브라우저에서는 DevTools(Windows, Linux `F12` 또는 `Ctrl+Shift+I`, macOS `Cmd+Option+I`)가 열려 있을 때 멈추고, Node.js에서는 `--inspect`로 띄운 뒤 Inspector 클라이언트가 연결됐거나 `node inspect`로 실행했을 때 멈춘다. `--inspect`만 주고 클라이언트가 없으면 그대로 지나간다(Node.js 26.7 확인).

| 동작 (Chrome DevTools Sources) | Windows, Linux | macOS |
|---|---|---|
| 일시정지, 재개 | `F8` 또는 `Ctrl+\` | `F8` 또는 `Cmd+\` |
| step over (현재 함수의 다음 줄) | `F10` 또는 `Ctrl+'` | `F10` 또는 `Cmd+'` |
| step into (그 줄에서 호출한 함수 안으로) | `F11` 또는 `Ctrl+;` | `F11` 또는 `Cmd+;` |
| step out (현재 함수에서 나가기) | `Shift+F11` 또는 `Ctrl+Shift+;` | `Shift+F11` 또는 `Cmd+Shift+;` |
| 특정 줄까지 계속 | `Ctrl`을 누른 채 그 줄 클릭 | `Cmd`를 누른 채 그 줄 클릭 |

- 현재 함수 안에서 다음 줄로만 넘어가려면 step over를 쓴다. step into는 그 줄에 함수 호출이 있으면 호출된 함수 안으로 들어간다.
- 긴 스크립트를 구간별로 확인할 때는 검증이 끝난 지점 바로 뒤에 `debugger;`를 두어 다음 확인의 시작점으로 바로 이동할 수 있다. 여러 개를 두어 구간을 나누고 끝난 구간부터 지운다.
- 남겨 둔 `debugger;`는 디버거가 없는 production 동작은 바꾸지 않지만, 누군가 DevTools나 inspector를 연 상태에서는 예기치 않게 멈춘다. ESLint `no-debugger`(`recommended` 설정에 포함)로 commit 전에 걸러낸다. 반복 조사에는 코드를 고치지 않는 조건부 breakpoint(조건이 참일 때만 멈춤)와 logpoint(멈추지 않고 콘솔에 기록)를 먼저 검토한다.

## perf_hooks — 코드 내장 측정

`node:perf_hooks`는 고해상도 시간(ms 단위 반환값)로 코드 구간을 측정하는 표준 모듈. APM 도입 전에도 부분 측정에 즉시 사용 가능.

### mark / measure / observer

```ts
import { performance, PerformanceObserver } from 'node:perf_hooks';

const obs = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
  performance.clearMarks();
  performance.clearMeasures();
  obs.disconnect();
});
obs.observe({ entryTypes: ['measure'] });
performance.mark('start');
await heavyWork();
performance.mark('end');
performance.measure('heavy', 'start', 'end');
```

`mark`는 시점 기록, `measure`는 두 mark 사이 구간을 entry로 만듦. PerformanceObserver가 비동기로 entry를 받아 처리.

### 자동 계측 항목

| entryType | 내용 |
|-----------|------|
| `node` | Node.js v26.8.1 문서 기준 `nodeStart`, `v8Start`, `bootstrapComplete`, `loopStart` 등 부팅과 이벤트 루프 마일스톤. DNS는 `dns`, TCP socket은 `net` entryType |
| `gc` | GC 종류와 소요 시간. `PerformanceObserver` 등록만 필요하며 별도 실행 flag는 없음 |
| `http` | HTTP 요청 라이프사이클 |
| `function` | `performance.timerify(fn)`로 감싼 함수 호출 |

### Event Loop 지연 측정

```ts
import { monitorEventLoopDelay } from 'node:perf_hooks';

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  console.log(`p99 lag: ${(h.percentile(99) / 1e6).toFixed(2)}ms`);
  h.reset();
}, 5000);
```

이벤트 루프 지연은 동기 블로킹과 CPU 경합을 조사하는 신호다. 모든 tail latency의 원인은 아니므로 외부 I/O와 큐 대기도 함께 확인한다. 종료 시 histogram을 disable하고 관측용 interval을 정리한다.

`SIGUSR1`로 Inspector를 켜는 동작은 Windows에서 사용할 수 없다. 지원 버전의 `--disable-sigusr1`로 이 시작 경로를 막을 수 있다. Inspector의 UUID는 인증 자격 증명이 아니며, loopback에 바인딩해도 같은 호스트의 프로세스는 접근할 수 있다.

## 다음 단계
- [[Debugging-Profiling-Memory|프로파일링 & 메모리 진단]]

## 출처

- [Node.js, Diagnostic user journey](https://nodejs.org/learn/diagnostics/user-journey)
- [Node.js, Live debugging](https://nodejs.org/learn/diagnostics/live-debugging)
- [Node.js, Using Inspector](https://nodejs.org/learn/diagnostics/live-debugging/using-inspector)
- [Node.js, Poor performance](https://nodejs.org/learn/diagnostics/poor-performance)
- [Node.js, Debugging Node.js](https://nodejs.org/learn/getting-started/debugging)

- [Node.js, Performance measurement APIs](https://nodejs.org/api/perf_hooks.html)
- [Node.js, Debugger](https://nodejs.org/api/debugger.html)
- [ECMAScript, The debugger Statement](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-debugger-statement)
- [Chrome DevTools, Keyboard shortcuts](https://developer.chrome.com/docs/devtools/shortcuts)
- [Chrome DevTools, Pause your code with breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints)
- [ESLint, no-debugger](https://eslint.org/docs/latest/rules/no-debugger)
- [인프런, 김영보, 2. if, debugger](https://www.inflearn.com/courses/lecture?courseId=324235&unitId=24611)

## 관련 문서
- [[Debugging-Profiling|디버깅 & 프로파일링 인덱스]]
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[Node.js]]
