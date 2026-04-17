---
tags: [container, docker, entrypoint, signal, pid1, graceful-shutdown]
status: done
category: "Infrastructure - Container"
aliases: ["Docker Entrypoint Exec", "PID 1 Signal", "컨테이너 시그널 처리"]
---

# Container Entrypoint와 시그널 — exec·PID 1·Graceful Shutdown

컨테이너에서 **PID 1이 받은 시그널을 실제 애플리케이션에 전달하는가**가 Graceful Shutdown의 핵심. 잘못 짜면 `docker stop`·K8s `SIGTERM` 이 애플리케이션까지 도달하지 않아 데이터가 손실되거나 10초 후 강제 종료(SIGKILL)로 중단된다.

## PID 1의 특수성

Linux는 PID 1(init 프로세스)에 **특별한 규칙**을 적용한다.

- PID 1은 모든 프로세스의 조상 — 종료되면 컨테이너가 종료됨
- PID 1이 명시적으로 처리기를 등록하지 않은 시그널은 **기본 무시**
- PID 1이 좀비(zombie) 자식 프로세스를 `wait()`로 거두지 않으면 좀비가 누적됨

컨테이너 내부에서 PID 1이 **셸(`sh`)이면 이 규칙이 말썽**이 된다. 셸은 기본적으로 SIGTERM 처리기를 등록하지 않아 무시하고, 자식 프로세스(애플리케이션)에게도 전달하지 않는다.

## exec form vs shell form

Dockerfile의 `CMD`·`ENTRYPOINT`는 두 가지 표기법이 있다.

| 형식 | 예시 | PID 1 | 시그널 전달 |
|---|---|---|---|
| **exec form** | `CMD ["python", "main.py"]` | python 프로세스가 직접 PID 1 | 정상 |
| **shell form** | `CMD python main.py` | `/bin/sh -c`가 PID 1, python은 자식 | **차단** |

shell form은 내부적으로 `/bin/sh -c "python main.py"`로 실행되어 셸이 PID 1이 된다. 결과: 컨테이너를 중지하면 셸이 SIGTERM을 받고 무시 → 10초 후 도커가 SIGKILL로 강제 종료 → 애플리케이션은 정리 기회를 얻지 못함.

## 왜 `exec`를 쓰는가

엔트리포인트 스크립트를 쓸 때도 같은 문제가 발생한다. 스크립트가 셸로 시작하고, 스크립트 안에서 애플리케이션을 단순 호출하면 스크립트(셸)가 PID 1로 남고 애플리케이션은 자식 프로세스가 된다.

나쁜 패턴:
```bash
#!/bin/sh
# 환경 준비
python main.py          # 셸이 자식으로 실행 → 시그널 전달 실패
```

좋은 패턴:
```bash
#!/bin/sh
# 환경 준비
exec python main.py     # 셸을 python으로 치환 → python이 PID 1
```

`exec`는 **현재 셸 프로세스를 지정한 프로그램으로 치환**하는 셸 내장 명령. 새 프로세스를 fork하지 않고 메모리 이미지를 교체하므로 PID가 유지된다. 결과: python이 PID 1이 되어 SIGTERM을 직접 수신·처리 가능.

## Graceful Shutdown의 흐름

올바른 구성에서 SIGTERM 수신 시:

1. K8s·Docker가 PID 1에 **SIGTERM** 전송 (`terminationGracePeriodSeconds` 시작)
2. 애플리케이션이 SIGTERM 처리기 실행 — 새 요청 거부, 진행 중 요청 완료, 커넥션 정리
3. 처리 완료 후 자발적 종료 → 컨테이너 정상 종료
4. 타임아웃(기본 30초) 초과 시 SIGKILL 강제 종료

## 좀비 프로세스 문제와 init

애플리케이션이 자식 프로세스를 만들면(예: Node.js worker·ffmpeg 호출) 자식이 종료된 후 **PID 1이 `wait()`** 해줘야 한다. 일반 애플리케이션은 자식 관리 책임이 없으므로 좀비가 쌓일 수 있음.

### 해결: 경량 init 프로세스

| 도구 | 특징 |
|---|---|
| **tini** | 가볍고 표준. Docker는 `--init` 플래그로 자동 주입(내부적으로 tini 사용) |
| **dumb-init** | Yelp 제작, 기능 동등 |
| **s6-overlay** | 다중 프로세스 컨테이너에 적합(보통 권장하지 않지만) |

K8s에서는 보통 `docker run --init` 대신 이미지에 tini를 내장하거나 애플리케이션 자체가 자식을 올바르게 수확하는지 검증한다.

## 쉘 스크립트 엔트리포인트 패턴

엔트리포인트에서 초기화·환경 주입·단순 검증을 한 뒤 앱을 실행하는 패턴이 흔하다.

```
#!/bin/sh
set -e

# 1. 환경 변수 확인
: "${DATABASE_URL:?DATABASE_URL required}"

# 2. 선행 작업 (마이그레이션 등)
python manage.py migrate

# 3. 애플리케이션 실행 — exec로 셸을 교체
exec "$@"        # CMD 인자를 받아 실행. PID 1 = 애플리케이션
```

Dockerfile:
```
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "main.py"]
```

## 언어·프레임워크별 SIGTERM 처리

애플리케이션 코드에도 **명시적인 SIGTERM 처리**가 필요하다. 컨테이너가 시그널을 전달해도 앱이 처리기를 등록하지 않으면 즉시 종료.

- **Node.js**: `process.on('SIGTERM', () => { server.close() })` — 기본은 SIGTERM에 즉시 종료하지 않음
- **Java (Spring Boot)**: `server.shutdown=graceful`, `spring.lifecycle.timeout-per-shutdown-phase=30s`
- **Python (Django/Flask)**: Gunicorn의 `--graceful-timeout` 활용, worker별 처리
- **NestJS**: `enableShutdownHooks()` 호출 후 `onApplicationShutdown` 훅 구현

## 흔한 실수

- **shell form 사용** — `CMD python main.py` → 셸이 PID 1 → 시그널 차단
- **엔트리포인트 스크립트에서 `exec` 빠뜨림** — 마지막 줄이 `python main.py`로만 되어 있음
- **애플리케이션에 SIGTERM 처리기 없음** — 시그널은 전달되나 graceful 코드가 없어 in-flight 요청 유실
- **자식 프로세스 수확 안 함** — 오랜 구동 후 좀비 누적·PID 고갈
- **`terminationGracePeriodSeconds` 너무 짧게** — 30초 기본 K8s 설정보다 처리 시간이 긴 워크로드에서 강제 종료

## 검증 방법

- `docker stop` 시 종료 시간 측정 — 즉시(<1s) 내려가면 SIGTERM 무시 가능성
- `docker inspect` `.State.ExitCode` = 137이면 SIGKILL로 강제 종료된 것
- `ps -ef` (컨테이너 내부)로 PID 1이 무엇인지 확인
- 애플리케이션 로그에 "Shutting down gracefully" 같은 메시지가 찍히는지

## 면접 체크포인트

- **PID 1의 특수성** (시그널 기본 무시·좀비 수확 책임)
- **exec form vs shell form** 차이와 왜 exec form이 안전한가
- 엔트리포인트 스크립트에서 **`exec "$@"` 사용 이유**
- **tini/dumb-init**이 해결하는 문제(시그널 전달 + 좀비 수확)
- SIGTERM → Graceful Shutdown 흐름 (로드밸런서에서 제외·in-flight 완료·종료)
- K8s `terminationGracePeriodSeconds`와 앱 shutdown 타임아웃의 관계

## 출처
- [Docker Entrypoint에서 exec를 사용하는 이유 — brunch @growthminder](https://brunch.co.kr/@growthminder/142)

## 관련 문서
- [[Docker|Docker 기본]]
- [[Graceful-Shutdown|Graceful Shutdown (앱 계층)]]
- [[K8s-Probes|K8s Liveness/Readiness Probe]]
