---
tags: [infrastructure, docker]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Image Size Optimization", "이미지 최적화"]
verified_at: 2026-08-04
---

# Image Size Optimization

Docker image는 작기만 하면 되는 산출물이 아니다. publisher 신뢰, runtime 호환성, 재현 가능한 식별자와 운영 중 정리 정책까지 함께 설계해야 pull 속도와 공격 표면을 줄이면서도 장애 대응 능력을 유지할 수 있다.

## Base image 선택

1. Docker Official Image, verified upstream publisher처럼 유지 주체와 build source를 확인할 수 있는 image를 우선 검토한다.
2. 지원 중인 runtime/OS version, update cadence와 CVE 대응 경로를 확인한다. star 수와 pull 수는 보안 검증이 아니다.
3. tag 문서와 연결된 Dockerfile을 읽어 포함 package, default user, entrypoint와 지원 architecture를 확인한다.
4. mutable tag는 편리한 검색 이름으로 쓰고 release에는 digest를 함께 기록한다. 동일 tag는 나중에 다른 content를 가리킬 수 있다.
5. scanner 결과, SBOM와 provenance를 release evidence에 연결한다. Official badge만으로 application dependency까지 안전해지는 것은 아니다.

### 일반, slim과 Alpine

| 변형 | 장점 | 비용과 확인점 |
|---|---|---|
| 일반 distribution | package와 debug tool이 비교적 풍부 | 크기와 불필요한 package 증가 |
| `slim` | glibc 계열 호환성을 유지하며 package 축소 | 빠진 CA certificate, shell, tool을 명시적으로 확인 |
| Alpine | 매우 작은 musl/BusyBox 기반 | native module, glibc 가정, shell/coreutils 동작 차이 |

Alpine이 항상 production 최적해는 아니다. native dependency를 source build하느라 build가 느려지거나 runtime 호환 문제가 생기면 slim 계열이 총비용이 낮을 수 있다. [[Alpine-vs-Debian-Image]]

## 최적화 기법

### 1. Multi-stage Build
빌드 도구와 devDependencies를 최종 이미지에서 제거한다. Builder 스테이지에서 빌드하고, Runner 스테이지에서 결과물만 복사한다.

### 2. 프로덕션 의존성만 설치
Runner 스테이지에서 `pnpm install --prod --frozen-lockfile`로 devDependencies를 제외한다.

### 3. 레이어 캐시 활용
변경 빈도가 낮은 레이어(의존성)를 먼저 배치한다. 소스 코드만 변경되면 의존성 레이어는 캐시에서 재사용된다.

### 4. .dockerignore 활용
빌드 컨텍스트에서 불필요한 파일을 제외한다:
- `node_modules/` (이미지 내에서 새로 설치)
- `.git/`
- `*.md`, `docs/`
- `.env*` (보안)

### 5. 불필요한 패키지 제거
Alpine에서 빌드 시 필요한 패키지(`python3`, `make`, `gcc`)는 같은 `RUN` 명령에서 설치하고 삭제한다. 레이어 수를 줄여 이미지 크기를 최적화한다.

## 측정과 안전한 정리

`docker system df -v`로 image, container, volume과 build cache 사용량을 보고 `docker history`나 `dive`로 큰 layer를 찾는다. image의 표시 크기를 단순 합산하면 공유 layer 때문에 실제 disk 사용량을 과대평가할 수 있다.

- dangling image는 tag가 없는 image다. unused image와 같은 집합은 아니다.
- `docker image prune`은 기본적으로 container가 참조하지 않는 dangling image를 정리한다.
- `docker image prune -a`는 어떤 container도 참조하지 않는 tagged image까지 대상으로 넓힌다.
- `docker system prune`은 stopped container, unused network, dangling image와 build cache를 함께 정리한다. volume은 기본 대상이 아니지만 별도 option으로 포함될 수 있다.
- 자동 정리는 age/label filter, rollback 보존 기간과 disk alert를 결합한다. 배포 직후 무조건 prune하면 직전 image를 이용한 빠른 rollback이 사라질 수 있다.

registry의 untagged manifest와 local dangling image는 다른 수명주기다. registry에는 별도 retention/lifecycle policy를 둔다.

## 면접 포인트

Q. Docker 이미지 최적화 경험이 있는가?
- base variant의 호환성을 먼저 검증하고 multi-stage build와 production dependency 분리
- layer별 측정으로 큰 원인을 찾고 변경 전후 pull/startup/CVE 수치를 함께 비교
- digest, SBOM와 rollback 보존 정책까지 release 단위로 관리

## 출처

- [Docker Docs, trusted content](https://docs.docker.com/docker-hub/image-library/trusted-content/)
- [Docker Docs, image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
- [Docker CLI, system prune](https://docs.docker.com/reference/cli/docker/system/prune/)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, image 선택](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414206)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, cache와 dangling image](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414207)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, build cache와 multi-stage](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416104)

## 관련 문서
- [[Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Alpine-vs-Debian-Image|Alpine vs Debian 동작 차이 (busybox vs GNU coreutils)]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
