---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Docker Compose", "도커 컴포즈"]
---

# Docker Compose

여러 컨테이너를 하나의 YAML 파일로 정의하고 함께 관리하는 도구이다. 단일 호스트에서 멀티 컨테이너 애플리케이션을 쉽게 실행한다.

## 핵심 개념

**서비스(Service):** 하나의 컨테이너 설정 단위. 이미지, 포트, 환경변수, 볼륨 등을 정의한다.
**네트워크:** 같은 Compose 파일의 서비스들은 자동으로 같은 네트워크에 배치되어, 서비스 이름으로 통신 가능하다.
**볼륨(Volume):** 컨테이너의 데이터를 호스트에 영속화한다. 컨테이너가 재시작되어도 데이터가 유지된다.

## 주요 설정 항목

- `image` — 사용할 Docker 이미지 (변수 치환 가능: `${DOCKERHUB_USERNAME}/school-api:${TAG:-latest}`)
- `container_name` — 컨테이너 이름 지정
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

Health check가 unhealthy 상태가 되면 `restart` 정책에 따라 컨테이너가 재시작된다.

## 환경변수 관리

- `env_file`로 `.env.production` 파일을 로드하여 민감 정보를 코드와 분리
- 이미지 태그 등에 `${TAG:-latest}` 형태의 변수 치환 사용
- `:-`는 기본값 설정 (변수가 없으면 `latest` 사용)

## 배포 패턴

단일 서버 배포 시:
1. `docker compose pull` — 레지스트리에서 최신 이미지 다운로드
2. `docker compose up -d` — 백그라운드 실행 (변경된 서비스만 재생성)
3. `docker image prune -f` — 미사용 이미지 정리

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
