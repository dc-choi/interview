---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["libuv"]
---

### libuv
Node.js의 비동기 I/O를 담당하는 C 라이브러리. 이벤트 루프, 스레드 풀, OS 추상화를 구현한다.

## 역할
```
1. 이벤트 루프 구현 (Reactor 패턴)
2. 비동기 I/O API 추상화 (OS별 차이를 숨김)
3. 스레드 풀 관리 (블로킹 작업용)
4. 타이머, DNS, 파일시스템 등의 비동기 인터페이스 제공
```

## 이벤트 디멀티플렉서
서로 다른 OS가 제공하는 비동기 I/O 알림 메커니즘을 하나의 인터페이스로 추상화한다.

| OS | API | 특징 |
|------|------|------|
| Linux | **epoll** | 커널 레벨 이벤트 통지. O(1) 성능 |
| macOS / BSD | **kqueue** | 범용 이벤트 통지. 파일, 소켓, 프로세스, 시그널 지원 |
| Windows | **IOCP** | I/O Completion Ports. Proactor 패턴 기반 |

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

## 스레드 풀 (`uv_threadpool`)
```
기본 크기: 4개 스레드 (UV_THREADPOOL_SIZE 환경변수로 최대 1024까지 확장 가능)

스레드 풀에 위임되는 작업:
- 파일 시스템 작업 (fs.readFile, fs.writeFile 등)
- DNS 조회 (dns.lookup — getaddrinfo 기반)
- CPU 집약적 작업 (crypto.pbkdf2, crypto.randomBytes, zlib 압축)
- 사용자 정의 C++ 애드온의 비동기 작업

스레드 풀에 위임되지 않는 작업 (커널에 직접 위임):
- TCP/UDP 소켓 (네트워크 I/O)
- 파이프
- DNS resolve (c-ares 라이브러리 사용)
```

### 스레드 풀과 이벤트 루프의 관계
```
1. JS에서 비동기 작업 요청 (예: fs.readFile)
2. libuv가 스레드 풀의 워커 스레드에 작업 할당
3. 워커 스레드가 블로킹 I/O를 수행
4. 완료 시 결과를 이벤트 큐에 등록
5. 이벤트 루프(메인 스레드)가 Poll 페이즈에서 콜백을 꺼내 실행
```

**주의**: libuv 스레드 풀 ≠ Worker Threads. 상세 비교는 [[Worker-Threads|워커 스레드]] 참조.

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

## 핸들과 요청
```
libuv의 두 가지 핵심 추상화:

Handle (핸들): 수명이 긴 객체. 활성 상태에서 매 루프 반복마다 콜백 가능.
  예: uv_tcp_t (TCP 소켓), uv_timer_t (타이머), uv_fs_event_t (파일 감시)

Request (요청): 일회성 작업. 작업 완료 시 콜백이 한 번 호출됨.
  예: uv_write_t (쓰기), uv_connect_t (연결), uv_fs_t (파일 작업)

활성 핸들이나 대기 중인 요청이 있는 한 이벤트 루프는 계속 동작한다.
```

## 관련 문서
- [[Event-Loop|이벤트 루프]]
- [[V8|V8 엔진]]
- [[Worker-Threads|워커 스레드]]
- [[Node.js]]
