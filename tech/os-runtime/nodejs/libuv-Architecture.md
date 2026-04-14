---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv Architecture", "libuv 설계", "libuv 이벤트 루프 구조"]
---

### libuv 아키텍처
libuv의 역할, 역사, OS별 이벤트 디멀티플렉서, 이벤트 루프 설계 원칙, 그리고 Reactor/Proactor 패턴을 다룬다.

## 역할
```
1. 이벤트 루프 구현 (Reactor 패턴)
2. 비동기 I/O API 추상화 (OS별 차이를 숨김)
3. 스레드 풀 관리 (블로킹 작업용)
4. 타이머, DNS, 파일시스템 등의 비동기 인터페이스 제공
```

## 역사
```
2009: Node.js 탄생. Google V8 + Marc Lehmann의 libev(Unix 전용) 조합으로 시작.
문제: libev는 Unix 전용이라 Windows를 지원할 수 없었다.
해결: Windows의 IOCP를 지원하는 새 라이브러리 libuv를 개발.
node-v0.9.0: libev 완전 제거, libuv로 대체.
이후: libuv는 Node.js에서 독립하여 범용 시스템 프로그래밍 라이브러리로 발전.
      Mozilla Rust, Julia, Luvit 등 다양한 언어/프로젝트에서 채택.
```

## 이벤트 디멀티플렉서
서로 다른 OS가 제공하는 비동기 I/O 알림 메커니즘을 하나의 인터페이스로 추상화한다.

| OS | API | 특징 |
|------|------|------|
| Linux | **epoll** | 커널 레벨 이벤트 통지. O(1) 성능 |
| macOS / BSD | **kqueue** | 범용 이벤트 통지. 파일, 소켓, 프로세스, 시그널 지원 |
| Windows | **IOCP** | I/O Completion Ports. Proactor 패턴 기반 |
| SunOS | **event ports** | Solaris의 이벤트 통지 메커니즘 |

```
libuv가 이 차이를 추상화하므로, Node.js 코드는 OS와 무관하게 동일한 비동기 API를 사용할 수 있다.
```

## 동기적 이벤트 디멀티플렉싱
```
핵심 개념: 여러 I/O 소스를 동시에 감시하되, 이벤트가 발생할 때까지 블로킹한다.
블로킹 I/O와의 차이점은 "여러 소스를 동시에" 감시한다는 것이다.

전통적 블로킹 I/O:     하나의 소켓 읽기에서 블로킹 → 다른 소켓 처리 불가
이벤트 디멀티플렉싱:   여러 소켓을 한꺼번에 감시 → 준비된 것만 논블로킹으로 처리
```

## 설계 개요 (Design Overview)

### 핵심 원칙
```
- 네트워크 I/O는 항상 싱글 스레드에서 수행된다.
- 이벤트 루프는 하나의 스레드에 고정되며, 루프 API는 스레드-안전하지 않다.
  (uv_async_send 등 일부 함수만 예외)
- 각 스레드는 별도의 이벤트 루프를 운영할 수 있다.
- 파일 I/O는 OS에 플랫폼 공통 논블로킹 API가 없어 스레드 풀에서 블로킹으로 처리한다.
```

### 이벤트 루프 반복 단계
```
하나의 루프 반복(iteration)은 다음 순서로 실행된다:

 1. 루프의 'now' 타임스탬프를 갱신한다.
 2. 만료된 타이머의 콜백을 실행한다 (UV_RUN_DEFAULT 모드).
 3. 루프의 alive 상태를 확인한다.
    → active/ref'd 핸들, active 요청, closing 핸들이 하나라도 있으면 alive.
    → alive가 아니면 루프를 즉시 종료한다.
 4. Pending 콜백을 실행한다.
    → 이전 반복에서 연기된 I/O 콜백을 여기서 처리한다.
 5. Idle 핸들 콜백을 실행한다.
    → 이름과 달리, 활성 idle 핸들은 매 반복마다 실행된다.
 6. Prepare 핸들 콜백을 실행한다.
    → I/O 폴링 직전에 호출된다.
 7. Poll 타임아웃을 계산한다.
 8. I/O를 위해 블로킹한다.
    → 계산된 타임아웃 동안 대기하며, 읽기/쓰기 준비된 FD의 콜백을 실행한다.
 9. Check 핸들 콜백을 실행한다.
    → I/O 폴링 직후에 호출된다. Prepare의 대칭.
10. Close 콜백을 실행한다.
    → uv_close()로 닫힌 핸들의 콜백.
11. 'now' 타임스탬프를 다시 갱신한다.
12. 만료된 타이머를 실행한다.
    → 주의: 'now'는 다음 반복까지 다시 갱신되지 않는다.
13. 반복 종료. UV_RUN_NOWAIT/UV_RUN_ONCE면 반환, UV_RUN_DEFAULT면 1단계로.
```

### Poll 타임아웃 계산 규칙
```
I/O 블로킹 전에 대기 시간을 결정한다:
- UV_RUN_NOWAIT 플래그로 실행됨           → 타임아웃 0
- uv_stop()이 호출됨                      → 타임아웃 0
- 활성 핸들이나 요청이 없음                → 타임아웃 0
- 활성 idle 핸들이 있음                    → 타임아웃 0
- 닫기 대기 중인 핸들이 있음               → 타임아웃 0
- 위 조건에 해당 없음                      → 가장 가까운 타이머의 만료 시간, 또는 무한대
```

### 이벤트 루프 실행 모드 (`uv_run_mode`)

| 모드 | 동작 |
|------|------|
| `UV_RUN_DEFAULT` | 활성 핸들/요청이 없을 때까지 반복 실행 |
| `UV_RUN_ONCE` | I/O를 위해 블로킹하고, 한 번만 반복 실행 후 반환 |
| `UV_RUN_NOWAIT` | I/O 대기 없이 즉시 반환. 한 번만 반복 실행 |

## Reactor vs Proactor 패턴

### Reactor 패턴 (Node.js가 사용)
```
동기적 이벤트 디멀티플렉싱 + 논블로킹 I/O

1. I/O 준비 상태를 감지 (readable/writable)
2. 애플리케이션이 직접 I/O 수행
3. 완료 후 콜백 실행

장점: 구현이 단순하고 직관적
단점: 다중 스레드 환경에서는 커스텀 스케줄링 필요
예시: Node.js 이벤트 루프, Linux epoll
```

### Proactor 패턴
```
비동기 I/O + 완료 통지

1. 완료 핸들러를 등록
2. OS가 비동기적으로 I/O를 수행
3. 완료 시 OS가 콜백으로 통지

장점: 더 나은 확장성, 애플리케이션이 이벤트를 제어
단점: 디버깅이 어려움, 비동기 오버헤드
예시: Windows IOCP, C++ Boost.Asio
```

### Node.js의 하이브리드 접근
```
Node.js(libuv)는 기본적으로 Reactor 패턴이지만,
Windows에서는 IOCP(Proactor)를 사용하여 내부적으로 Reactor 인터페이스에 맞게 변환한다.
이 추상화 덕분에 Node.js 코드는 OS와 무관하게 동일하게 동작한다.
```

## 관련 문서
- [[libuv|libuv (TOC)]]
- [[libuv-Handles|libuv 핸들·요청·스트림]]
- [[libuv-IO|libuv 네트워킹·파일시스템·프로세스]]
- [[libuv-Threading|libuv 스레드 풀·스레딩·에러]]
- [[Event-Loop|이벤트 루프]]
- [[V8|V8 엔진]]
- [[Node.js]]
