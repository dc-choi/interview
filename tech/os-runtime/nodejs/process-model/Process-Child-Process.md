---
tags: [runtime, nodejs, process, child-process, ipc]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Node.js Process", "Child Process", "spawn vs fork"]
---

# Node.js Process, Child Process

`process`는 현재 Node.js 프로세스의 **전역 객체** — 환경, 인자, 시그널, 종료를 다룬다. `child_process` 모듈은 자식 프로세스를 띄워 외부 명령 실행, CPU 작업 분산, IPC 통신을 수행. CPU 바운드 작업의 두 갈래 해법 중 **프로세스 분리 트랙**(다른 갈래는 [[Worker-Threads]]).

## process 객체

| API | 용도 |
|-----|------|
| `process.env` | 환경 변수 |
| `process.argv` | 명령행 인수 (`[node, script, ...args]`) |
| `process.cwd()` | 현재 작업 디렉토리 |
| `process.pid` / `ppid` | 프로세스 ID / 부모 ID |
| `process.memoryUsage()` | rss, heapTotal, heapUsed, external, arrayBuffers |
| `process.cpuUsage()` | user, system µs |
| `process.uptime()` | 시작 후 경과 초 |
| `process.exit(code)` | 즉시 종료 — 정리 콜백 안 부름, 보통 피해야 |

## 시그널 처리 — Graceful Shutdown

```ts
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received`);

  const deadline = setTimeout(() => process.exit(1), 25_000);
  deadline.unref();

  try {
    // 새 연결을 막고 in-flight 요청이 끝날 때까지 기다린 뒤 DB를 닫는다.
    await new Promise<void>((resolve, reject) => {
      server.close(err => err ? reject(err) : resolve());
    });
    await db.disconnect();
    // unref된 deadline은 정상 종료를 늦추지 않으며, 남은 핸들이 있으면 강제 종료한다.
    process.exitCode = 0;
  } catch (err) {
    console.error('graceful shutdown failed', err);
    process.exitCode = 1;
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
```

| 시그널 | 의미 |
|--------|------|
| `SIGTERM` | 정상 종료 요청 (K8s, Docker stop, kill 기본) |
| `SIGINT` | Ctrl+C — 인터럽트 |
| `SIGHUP` | 터미널 종료 — 보통 설정 reload로 사용 |
| `SIGUSR1`/`SIGUSR2` | Node.js 디버거 활성화 / 사용자 정의 |
| `SIGKILL` | 즉시 강제 종료 — **트랩 불가** |

**K8s `terminationGracePeriodSeconds`** (기본 30s) 안에 정리를 끝내야 SIGKILL을 피할 수 있다. 예제의 25초 deadline은 그보다 먼저 실패를 드러내기 위한 값이므로 실제 배포의 grace period에 맞춰 조정한다. 정상 경로에서는 `process.exit()`로 비동기 정리를 끊지 않고 `exitCode`만 설정한다.

## Child Process — 4가지 API

| API | 모드 | stdout 전달 | 용도 |
|-----|------|------------|------|
| `spawn` | 스트림 | `stdout.on('data')` | 대용량, 장기 실행, **shell 미사용** |
| `exec` | 버퍼 (전체 stdout 메모리) | callback에 모음 | 짧은 명령, **shell 사용** |
| `execFile` | 버퍼 | callback | shell 미사용 + 버퍼 결합 |
| `fork` | 스트림 + IPC | message 이벤트 | **Node.js 스크립트 전용** |

### spawn — 스트림 기반

```ts
const ls = spawn('ls', ['-la']);
ls.stdout.on('data', d => console.log(d.toString()));
ls.stderr.on('data', d => console.error(d.toString()));
ls.on('error', error => console.error('spawn failed', error));
ls.on('close', code => console.log(`exit ${code}`));
```

- 기본값은 shell을 쓰지 않아 셸 문법 해석을 피한다. 하지만 실행파일 경로와 인자는 검증해야 하며 대상 프로그램의 옵션 인젝션은 별개다.
- 출력이 큰 명령 (`tar`, `ffmpeg`)에 적합 — 메모리에 다 쌓지 않음.

### exec — shell 사용

```ts
exec('ls -la | grep node', (err, stdout, stderr) => {
  if (err) throw err;
  console.log(stdout);
});
```

- shell 사용으로 **파이프, 리다이렉션, glob 가능**.
- **사용자 입력을 그대로 넣으면 명령 인젝션** 위험. 인자에 검증 없는 변수 금지.
- stdout 전체를 버퍼링 → stdout 또는 stderr가 기본 `maxBuffer` 1MiB를 넘으면 자식을 종료하고 콜백에 오류를 전달한다. Promise 방식은 reject한다.

### execFile — shell 없이 실행

```ts
execFile('node', ['--version'], (err, stdout) => { ... });
```

shell 미사용 + 버퍼 결합. 알려진 실행파일 호출에 최적.

### fork — Node.js 자식 + IPC

```ts
const child = fork('./worker.js');
child.send({ cmd: 'start', payload: 42 });
child.on('message', msg => console.log('from child:', msg));

// worker.js
process.on('message', msg => {
  if (msg.cmd === 'start') {
    const result = compute(msg.payload);
    process.send({ cmd: 'done', result });
  }
});
```

- **부모-자식 IPC 채널**이 자동 생성된다. 기본 직렬화는 JSON이므로 JSON으로 표현 가능한 값만 보낸다. `BigInt`, `Map`, `Set`, `Buffer` 등이 필요하면 `fork('./worker.js', [], { serialization: 'advanced' })`처럼 명시적으로 opt-in한다. advanced 직렬화는 V8 serializer와 structured clone 기반이다.
- 새 V8 인스턴스 → 메모리, 시작 시간 비용 큼.
- CPU 작업 분리에 사용. 가벼우면 [[Worker-Threads|Worker Threads]]가 더 효율적.

## spawn vs fork vs Worker Threads

| 축 | spawn (외부 프로그램) | fork (Node 스크립트) | Worker Threads |
|----|---------------------|---------------------|----------------|
| 격리 | OS 프로세스 | OS 프로세스 + V8 인스턴스 | 같은 프로세스, 별도 스레드 |
| 메모리 | 독립 | 독립 (V8 한 벌 더) | 공유 가능 (`SharedArrayBuffer`) |
| IPC | stdin/stdout | message 채널 | `postMessage` |
| 시작 비용 | 보통 | 큼 (V8 부팅) | 작음 |
| 충돌 격리 | ✅ 강함 | ✅ 강함 | ✗ 한 워커 OOM이 영향 줄 수 있음 |
| 적합 | 외부 도구 호출 | 별도 스크립트, 충돌 격리 중요 | CPU 바운드 + 메모리 공유 |

## 보안 — 명령 인젝션

```ts
// ❌ 위험
exec(`ls ${userInput}`, ...);   // userInput="; rm -rf /" → 실행됨

// 셸 문법 해석을 피하고, ls의 옵션 해석도 --로 끝낸다.
// 입력 경로가 허용된 디렉터리인지 확인하는 검증은 별도로 필요하다.
execFile('ls', ['--', userInput], ...);
spawn('ls', ['--', userInput]);
```

`shell: true`를 켜면 셸 해석 위험이 돌아온다. 셸 없이 실행하는 고정 실행파일과 검증한 인자 배열을 우선한다. `--` 지원 여부와 옵션 의미는 대상 프로그램마다 다르다.

## 흔한 실수

- **`process.exit(0)` 즉시 호출** → in-flight 작업 끊김. server.close 후 graceful.
- **`exec`에 신뢰 못 할 입력** → 명령 인젝션. `execFile`/`spawn`으로.
- **`exec` stdout/stderr가 `maxBuffer` 초과** → 자식 종료와 오류. 큰 출력은 `spawn` 스트림.
- **장기 실행 child의 lifecycle 미관리** → 살아 있는 child는 zombie가 아니지만 불필요한 프로세스와 핸들이 남을 수 있다. 종료 정책과 `exit`/`close` 처리를 명시한다. zombie는 종료한 자식이 OS에서 wait/reap되지 않은 별도 상태다.
- **SIGTERM 핸들러에서 새 비동기 작업 시작** → 종료 안 끝남. 정리만.
- **Cluster + 자체 fork 혼용** → 금지 규칙은 아니지만 전체 프로세스/스레드 수, 종료 전파와 재시작 책임을 함께 관리해야 한다.

## 면접 체크포인트

- 4가지 API (spawn, exec, execFile, fork) 차이와 선택 기준
- `exec` vs `execFile` 보안 차이 — shell 사용 여부와 명령 인젝션
- `spawn`이 큰 출력에 유리한 이유 — 스트림 vs 버퍼링
- `fork`와 Worker Threads 차이 — 프로세스 vs 스레드, V8 인스턴스
- Graceful Shutdown — SIGTERM 핸들러 + server.close + in-flight 마무리
- `process.memoryUsage` 필드 (rss, heapTotal, heapUsed, external)의 의미
- K8s `terminationGracePeriodSeconds`와 시그널 흐름
- 명령 인젝션 방어 — execFile/spawn으로 인자 분리

## 관련 문서

- [[Command-Injection|Command Injection (셸 사용과 인자 인젝션)]]
- [[Node.js|Node.js 개요]]
- [[Worker-Threads|Worker Threads (스레드 기반 분리)]]
- [[Nodejs-Clustering|Cluster (다중 worker 패턴)]]
- [[Single-vs-Multi-Thread|싱글 vs 멀티 스레드]]
- [[tech/os-runtime/nodejs/Security|Node.js 보안 모범 사례]]

## 출처

- [Node.js Learn, Comparing Node.js concurrency models](https://nodejs.org/en/learn/concurrency/comparing-nodejs-concurrency-models)

- [Node.js Child process API](https://nodejs.org/api/child_process.html)
- [Node.js HTTP API, `server.close()`](https://nodejs.org/api/http.html#serverclosecallback)
