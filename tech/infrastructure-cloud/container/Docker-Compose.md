---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Docker Compose", "도커 컴포즈"]
verified_at: 2026-08-04
---

# Docker Compose

여러 컨테이너를 하나의 YAML 파일로 정의하고 함께 관리하는 도구이다. 단일 호스트에서 멀티 컨테이너 애플리케이션을 쉽게 실행한다.

## 핵심 개념

**서비스(Service):** 하나의 컨테이너 설정 단위. 이미지, 포트, 환경변수, 볼륨 등을 정의한다.
**네트워크:** 별도 설정이 없으면 project default network에 연결되고 service name으로 DNS 조회한다.
**볼륨(Volume):** Docker가 관리하는 storage를 container lifecycle과 분리한다. bind mount와 같은 말이 아니다.

## 주요 설정 항목

- `image` — 사용할 Docker 이미지 (변수 치환 가능: `${DOCKERHUB_USERNAME}/school-api:${TAG:-latest}`)
- `restart: unless-stopped` — 수동 정지 외에는 항상 재시작
- `env_file` — 환경변수 파일 로드 (`.env.production`)
- `ports` — 호스트:컨테이너 포트 매핑
- `volumes` — 호스트:컨테이너 디렉토리 마운트 (로그 영속화 등)
- `healthcheck` — 컨테이너 상태 확인

## Health Check

컨테이너가 정상 동작하는지 주기적으로 확인한다.

- `test` — 상태 확인 명령 (예: `wget -q --spider http://localhost:4000/trpc/health.check`)
- `interval: 30s` — 30초마다 확인
- `timeout: 10s` — 10초 내 응답 없으면 실패
- `retries: 3` — 3회 연속 실패 시 unhealthy
- `start_period: 10s` — 시작 후 10초는 실패를 무시 (초기화 시간)

`unhealthy`는 상태를 표시할 뿐 Docker Engine의 restart policy가 자동 재시작하는 조건은 아니다. restart policy는 container process가 종료될 때 적용된다. unhealthy 상태를 교체하려면 orchestrator, watchdog 또는 application 종료 정책을 별도로 설계한다.

## 시작 순서와 readiness

Compose는 dependency service가 **running** 상태가 될 때까지만 기다리며 기본 `depends_on`만으로 DB가 query를 받을 준비가 됐는지는 보장하지 않는다.

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy
```

`service_healthy` 조건은 dependency healthcheck 통과 뒤 dependent를 생성한다. 그래도 실행 중 dependency 장애를 application 대신 복구하거나 migration 동시 실행을 해결하지 않는다. client timeout, retry/backoff와 idempotent initialization이 필요하다.

## Container 간 통신

`api` container 안의 `localhost`는 api 자신이다. 같은 Compose network의 DB에는 `db:3306`처럼 service name과 **container port**로 접속한다. host에서 접속할 때만 published host port를 사용한다.

container가 update되면 IP는 바뀔 수 있으므로 IP를 고정 저장하지 말고 service name을 다시 resolve한다.

## 환경변수 관리

- `env_file`은 값을 repository 밖으로 분리할 뿐 secret 보호 기능은 아니다. process environment와 inspect 권한에서 보일 수 있다.
- 이미지 태그 등에 `${TAG:-latest}` 형태의 변수 치환 사용
- `:-`는 기본값 설정 (변수가 없으면 `latest` 사용)
- password와 private key는 Compose `secrets`로 필요한 service에만 file mount하고, production에서는 외부 secret manager와 rotation을 연결한다.

## 배포 패턴

단일 서버 배포 시:
1. `docker compose pull` — 레지스트리에서 지정 image 다운로드
2. `docker compose up -d` — 백그라운드 실행 (변경된 서비스만 재생성)
3. health/log 확인 뒤 이전 digest를 보존해 rollback 가능하게 함

`down -v`는 Compose가 만든 volume까지 삭제할 수 있으므로 database가 있는 환경에서 cleanup 명령으로 습관적으로 쓰지 않는다. `docker image prune`도 rollback에 필요한 image와 보존 정책을 확인한 뒤 실행한다.

## 면접 포인트

Q. Docker Compose를 왜 사용하는가?
- 멀티 컨테이너 환경을 선언적으로 관리
- 한 명령으로 전체 스택 시작/중지
- 개발(로컬)과 배포(서버) 환경을 동일하게 재현

Q. Health check가 왜 중요한가?
- 프로세스가 살아있어도 애플리케이션이 정상이 아닐 수 있음 (DB 연결 실패 등)
- Health check으로 실제 서비스 가용성을 확인하고 자동 복구

## 관련 문서
- [[Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]

## 출처

- [Docker Docs — Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [Docker Docs — Control startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Docs — Use secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker Docs — Restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Compose, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227926)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — Container 간 통신, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227941)
