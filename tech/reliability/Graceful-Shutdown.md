---
tags: [reliability, shutdown]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["Graceful Shutdown", "우아한 종료"]
---

# Graceful Shutdown

프로세스가 종료 신호를 받았을 때, 진행 중인 작업을 안전하게 마무리하고 리소스를 정리한 뒤 종료하는 패턴이다.

## 왜 필요한가

프로세스를 즉시 종료(kill -9)하면:
- 처리 중인 HTTP 요청이 중단되어 클라이언트에 에러 반환
- DB 트랜잭션이 반쯤 실행된 상태로 남아 데이터 정합성 훼손
- DB 커넥션 풀이 정리되지 않아 커넥션 누수
- 스케줄러/크론 작업이 중간에 끊겨 불완전한 상태 발생
- 파일 핸들, 소켓 등 리소스 누수

## 구현 흐름

1. **종료 신호 수신** — `SIGTERM`(정상 종료) 또는 `SIGINT`(Ctrl+C) 포착
2. **새 요청 거부** — HTTP 서버의 `close()`를 호출하여 새 연결 수락을 중단
3. **진행 중인 요청 완료 대기** — 이미 받은 요청은 처리 완료까지 대기
4. **리소스 정리** — DB 커넥션, 스케줄러, 외부 연결 등을 순서대로 정리
5. **프로세스 종료** — `process.exit(0)`

## Node.js/Express 구현 패턴

종료 시 정리해야 할 리소스:
- **HTTP 서버** — `server.close()`로 새 요청 수락 중단, 기존 요청 완료 대기
- **스케줄러** — `node-schedule`의 `gracefulShutdown()`으로 예약된 작업 정리
- **DB 커넥션** — Prisma의 `$disconnect()`로 커넥션 풀 정리
- **Query Builder** — Kysely의 `destroy()`로 커넥션 반환

정리 순서: 스케줄러(새 작업 방지) → HTTP 서버(새 요청 차단) → DB(마지막에 정리)

## SIGTERM vs SIGINT

| 신호 | 발생 상황 | 기본 동작 |
|---|---|---|
| `SIGTERM` | `kill <pid>`, Docker stop, K8s Pod 종료 | 종료 (포착 가능) |
| `SIGINT` | Ctrl+C | 종료 (포착 가능) |
| `SIGKILL` | `kill -9` | **즉시 종료 (포착 불가)** |

Docker는 `docker stop` 시 SIGTERM을 보내고, 10초(기본) 후 응답 없으면 SIGKILL을 보낸다.

## Docker + Health Check와의 관계

1. Docker가 SIGTERM 전송
2. 앱이 graceful shutdown 시작 → health check 실패로 전환
3. 로드밸런서가 unhealthy 인스턴스에서 트래픽 제거
4. 진행 중인 요청 완료 후 종료

## 타임아웃 설정

graceful shutdown에도 제한 시간을 두어야 한다. 무한 대기하면 배포가 멈출 수 있다.

- Docker: `stop_grace_period` (기본 10초)
- K8s: `terminationGracePeriodSeconds` (기본 30초)
- 애플리케이션 레벨: `setTimeout`으로 강제 종료 타이머 설정

## 면접 포인트

Q. Graceful shutdown을 왜, 어떻게 구현했는가?
- SIGTERM/SIGINT 핸들러 등록
- 스케줄러 → HTTP 서버 → DB 커넥션 순으로 정리
- 배포 시 처리 중인 요청 중단 없이 무중단 전환

Q. Docker에서 graceful shutdown이 안 되는 경우는?
- PID 1 문제: 셸 스크립트로 앱을 시작하면 SIGTERM이 앱에 전달되지 않음
- 해결: `CMD ["node", "app.js"]` (exec form) 사용 또는 `tini` init 프로세스 사용

## 관련 문서
- [[Docker]]
- [[Docker-Compose|Docker Compose]]
- [[Zero-Downtime-Deployment|Zero-downtime deployment]]
