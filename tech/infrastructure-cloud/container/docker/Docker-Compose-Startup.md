---
tags: [infrastructure, docker, compose, healthcheck]
status: done
category: "Infrastructure - Container"
aliases: ["Compose 기동 순서와 healthcheck", "Compose Startup Order", "Compose healthcheck"]
verified_at: 2026-09-30
---

# Compose 기동 순서와 healthcheck

여러 container를 한 번에 띄울 때 app이 dependency보다 먼저 떠서 실패하는 순서 문제와, 순서를 맞춘 뒤에도 남는 주소 문제를 다룬다. Compose 파일 구조와 service name으로 통신하는 원칙은 [[Docker-Compose|Docker Compose]]에 있다.

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

### 의존 서비스 healthcheck

healthcheck는 dependency 쪽에 그 server가 응답하는지 보는 명령으로 걸고, app은 여러 dependency를 함께 기다린다.

```yaml
services:
  api:
    build: .
    environment:
      DB_HOST: db          # container 안에서는 localhost가 아니라 service name
      REDIS_HOST: cache
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
  db:
    image: mysql:8.4
    env_file: .env.db      # MYSQL_ROOT_PASSWORD 등. 빈 data directory의 첫 초기화에만 적용
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1"]
      interval: 10s
      retries: 5
      start_period: 60s
      start_interval: 2s
  cache:
    image: redis:8
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 10
volumes:
  db-data:
```

- `mysqladmin ping`은 server가 떠 있으면 `Access denied`여도 종료 코드 0이다. 계정 없이 통과하는 이유이자 이 check가 server 생존만 보고 app 계정, schema와 migration 준비를 보장하지 않는 이유다. 그 준비까지 기다려야 하면 app 계정으로 실제 query하는 check를 쓴다. `redis-cli ping`도 server 응답만 본다.
- MySQL client는 `localhost`를 Unix socket 접속으로 처리한다. mysql image는 첫 초기화 때 init script용 임시 server를 network 없이 socket으로만 띄우므로, socket으로 ping하면 임시 server에 성공해 app이 최종 server 기동 전에 시작될 수 있다. `-h 127.0.0.1`로 TCP 경로를 확인한다. 초기화 env가 첫 기동에만 적용되는 계약은 [[Docker-Core-Storage#초기화는 빈 data directory에서 한 번만 일어난다|DB image 초기화]].
- healthcheck는 기본 `interval` 30초가 지나야 처음 실행되므로 값을 주지 않으면 dependency가 금방 떠도 `up`이 그만큼 느려진다. `start_period` 동안은 `start_interval`(Engine 25 이상) 간격으로 확인하고 실패를 `retries`에 세지 않는다.
- 그 뒤 `retries`번 연속 실패하면 unhealthy가 되고, 기다리던 dependent는 생성되지 않은 채 `up`이 `dependency failed to start: container ... is unhealthy`로 끝난다. 대용량 초기 dump처럼 느린 초기화는 `start_period`로 흡수한다. healthcheck가 없는 service를 `service_healthy`로 기다려도 오류다.

## 기동 직후 연결 실패 진단

healthcheck와 `depends_on`은 dependency가 아직 준비되지 않은 순서 문제만 해결한다. 순서를 맞췄는데도 app container가 곧바로 종료되면 주소 문제를 의심한다. app 설정의 DB host가 `localhost`나 `127.0.0.1`이면 app container 자신을 가리켜 그 port에 listen하는 process가 없으므로 `Connection refused`가 난다. Spring Boot JPA는 `EntityManagerFactory` 초기화 실패로 기동을 멈추고, NestJS `TypeOrmModule`은 기본 10회, 3초 간격으로 `Unable to connect to the database`를 남기며 재시도한 뒤 실패한다. 재시도는 순서 문제를 가려 줄 수 있지만 주소 문제는 끝까지 실패한다.

1. `docker compose ps --all`로 종료된 service와 dependency의 health 상태를 본다. dependency가 이미 healthy인데 refused면 순서가 아니라 주소 문제다.
2. `docker compose logs <service>`로 원인 log를 확인한다.
3. app 설정의 host(service name)와 port(container port)를 compose 파일과 대조한다.
4. 그래도 안 되면 [[Docker-Bridge-Networking#진단 순서|bridge 진단 순서]]로 내려간다.

host 값을 image 안 설정 파일에 고정하면 바꿀 때마다 image를 다시 build해야 한다. 위 예시처럼 `environment`로 주입하면 compose 파일 수정과 재생성으로 끝난다.

## 면접 포인트

Q. Health check가 왜 중요한가?
- 프로세스가 살아있어도 애플리케이션이 정상이 아닐 수 있음 (DB 연결 실패 등)
- 실제 서비스 가용성을 감지해 orchestrator나 watchdog 같은 별도 복구 정책의 입력으로 사용

Q. `service_healthy`로 기다렸는데도 app이 DB에 연결하지 못하는 이유는?
- 순서는 맞았지만 app 설정의 DB host가 `localhost`라 app 자신을 가리키는 주소 문제일 수 있다. MySQL healthcheck가 socket 경로로 ping하면 초기화용 임시 server에 성공해 너무 일찍 healthy가 될 수도 있다

## 출처

- [Docker Docs, Control startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Docs, Compose file services reference](https://docs.docker.com/reference/compose-file/services/)
- [Docker Docs, Dockerfile reference HEALTHCHECK](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Docker Docs, Restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [MySQL 8.4 Reference Manual, mysqladmin](https://dev.mysql.com/doc/refman/8.4/en/mysqladmin.html)
- [MySQL 8.4 Reference Manual, Connecting to the MySQL Server Using Command Options](https://dev.mysql.com/doc/refman/8.4/en/connecting.html)
- [Docker Hub, mysql Official Image](https://hub.docker.com/_/mysql)
- [mysql 8.4 docker-entrypoint.sh — docker-library/mysql](https://github.com/docker-library/mysql/blob/master/8.4/docker-entrypoint.sh)
- [dependency 대기와 unhealthy 오류 처리 — docker/compose](https://github.com/docker/compose/blob/main/pkg/compose/service_containers.go)
- [TypeORM 연결 재시도 기본값 — nestjs/typeorm](https://github.com/nestjs/typeorm/blob/master/lib/common/typeorm.utils.ts)
- [인프런, JSCODE 박재성, Spring Boot, MySQL 컨테이너 동시에 띄워보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227940)
- [인프런, JSCODE 박재성, 컨테이너로 실행시킨 Spring Boot가 MySQL에 연결이 안 되는 이유](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227941)
- [인프런, JSCODE 박재성, Spring Boot, MySQL, Redis 컨테이너 동시에 띄워보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227942)
- [인프런, JSCODE 박재성, AWS EC2에 Spring Boot, MySQL, Redis 배포하기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227950)

## 관련 문서

- [[Docker-Compose|Docker Compose]]
- [[Docker-Core-Storage|Docker 데이터 영속성]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Graceful-Shutdown|Graceful Shutdown]]
