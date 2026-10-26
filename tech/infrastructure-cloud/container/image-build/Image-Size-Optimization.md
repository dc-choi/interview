---
tags: [infrastructure, docker, hardened-image]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Image Size Optimization", "이미지 최적화", "Hardened Image", "강화 이미지"]
verified_at: 2026-10-11
---

# Image Size Optimization

Docker image는 작기만 하면 되는 산출물이 아니다. publisher 신뢰, runtime 호환성, 재현 가능한 식별자와 운영 중 정리 정책까지 함께 설계해야 pull 속도와 공격 표면을 줄이면서도 장애 대응 능력을 유지할 수 있다.

## Base image 선택

1. Docker Official Image, verified upstream publisher처럼 유지 주체와 build source를 확인할 수 있는 image를 우선 검토한다.
2. 지원 중인 runtime/OS version, update cadence와 CVE 대응 경로를 확인한다. star 수와 pull 수는 보안 검증이 아니다.
3. tag 문서와 연결된 Dockerfile을 읽어 포함 package, default user, entrypoint와 지원 architecture를 확인한다.
4. mutable tag는 편리한 검색 이름으로 쓰고 release에는 digest를 함께 기록한다. 동일 tag는 나중에 다른 content를 가리킬 수 있다.
5. scanner 결과, SBOM와 provenance를 release evidence에 연결한다. Official badge만으로 application dependency까지 안전해지는 것은 아니다.

### 출처 메타데이터와 검증 결과를 구분한다

SBOM은 포함되거나 빌드에 쓰인 소프트웨어 목록이고, provenance는 빌드가 어떻게 수행됐는지에 관한 기록이다. 둘 다 이미지 선택의 근거지만, 파일이 붙어 있다는 사실만으로 신뢰할 수 있는 이미지라고 판정하지 않는다.

SLSA v1.2의 artifact 검증 절차를 이미지 승인에 적용할 때는 다음을 대조한다.

- provenance envelope의 서명을 미리 정한 신뢰 기준으로 검증하고, 허용한 builder identity인지 확인한다.
- statement의 `subject` digest가 실제 사용할 artifact와 일치하는지 확인한다. tag 이름이 같다는 것만으로 대신하지 않는다.
- 정본 source repository, `buildType`과 `externalParameters`가 기대한 값인지 확인한다. 서명이 유효해도 다른 저장소나 허용하지 않은 빌드 설정이면 승인 근거가 되지 않는다.

Docker BuildKit의 attestation 생성과 이 검증 정책의 적용은 별도 단계다. 베이스 이미지와 최종 앱 이미지의 식별자 및 검증 결과를 구분해 남긴다. 이 절은 2026-10-27 Docker의 Build attestations와 SLSA v1.2를 대조한 범위이며, 특정 이미지의 검증 통과나 취약점 부재를 확인한 기록은 아니다.

### 일반, slim과 Alpine

| 변형 | 장점 | 비용과 확인점 |
|---|---|---|
| 일반 distribution | package와 debug tool이 비교적 풍부 | 크기와 불필요한 package 증가 |
| `slim` | glibc 계열 호환성을 유지하며 package 축소 | 빠진 CA certificate, shell, tool을 명시적으로 확인 |
| Alpine | 매우 작은 musl/BusyBox 기반 | native module, glibc 가정, shell/coreutils 동작 차이 |

Alpine이 항상 production 최적해는 아니다. native dependency를 source build하느라 build가 느려지거나 runtime 호환 문제가 생기면 slim 계열이 총비용이 낮을 수 있다. [[Alpine-vs-Debian-Image]]

### 강화 이미지(hardened image)

Docker 문서는 강화 이미지를 취약점을 줄이고 엄격한 보안, 규정 요구를 맞추려고 일부러 구성을 줄이고 보호한 container image로 정의한다. 셸이 없다는 것이 정의의 일부는 아니며, 구성은 제공 주체와 변형마다 다르다. 2026-10-11 Docker 문서 기준 Docker Hardened Images(DHI)는 다음과 같다.

- **런타임과 dev 변형:** 런타임 이미지에는 셸과 패키지 관리자가 없고 기본적으로 non-root로 실행된다. dev 변형에는 셸, 패키지 관리자와 root 사용자가 있으므로 셸이나 패키지 설치가 필요한 build stage와 로컬 반복, 격리된 CI 단계에 `-dev` 태그를 쓰고, 최종 실행 stage는 런타임 변형으로 둔다([[Multi-Stage-Build|멀티스테이지 빌드]]).
- **CVE 표현:** 문서 표현은 알려진 악용 가능 CVE가 거의 없다는 것이며 0을 보장하지 않는다. 악용 가능성 판정은 VEX 문서에 기대고 수정이 아직 없는 affected 상태도 있다. 스캐너가 VEX를 자동으로 반영하는지 확인한다.
- **증거:** 서명된 SBOM과 SLSA Build Level 3 provenance를 제공하므로 release evidence에 연결할 수 있다.
- **갱신 책임:** 상위 프로젝트의 새 릴리스나 CVE 수정이 나오면 Docker가 베이스 이미지를 다시 빌드한다. 그 위에 만든 내 앱 이미지는 저절로 바뀌지 않으므로, 갱신된 베이스로 다시 빌드하고 배포하는 일과 베이스 위에 설치한 소프트웨어의 패치는 사용자 몫이다. digest를 고정했다면 새 digest로 바꾸는 절차를 함께 둔다.
- **제공 조건:** Docker는 2025-12-17 1,000개 이상의 강화 이미지를 Apache 2.0으로 무료 공개했다. 무료 이미지도 `dhi.io` 로그인이 필요하고, 심각도별 CVE 수정 기한(SLA)은 유료 등급에만 있다.

셸이 없으면 `docker exec`나 `kubectl exec`로 들어가 진단하기 어렵다. Kubernetes 문서는 distroless처럼 디버깅 도구가 없는 이미지에 ephemeral container와 `kubectl debug`를 쓰도록 안내하며, distroless는 busybox 셸이 든 `:debug` 이미지 세트를 따로 제공한다([[Jib-Java-Container#Base Image 선택|distroless와 디버그 태그]]). Docker 문서는 DHI 진단에 임시 디버그 컨테이너를 붙이는 `docker debug`를 안내한다. 셸 스크립트 entrypoint와 셸 기반 health check도 동작하지 않으므로 exec 형식 entrypoint를 쓰고, Kubernetes에서는 httpGet 같은 probe를, Docker HEALTHCHECK에서는 이미지에 들어 있는 실행 파일을 exec 형식으로 호출한다(curl 같은 도구는 없을 수 있다)([[Container-Entrypoint-Signals|Entrypoint와 시그널]]).

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

`docker system df -v`로 image, container, volume과 build cache 사용량을 보고 `docker history`나 `dive`로 큰 layer를 찾는다. image의 표시 크기를 단순 합산하면 공유 layer 때문에 실제 disk 사용량을 과대평가할 수 있다. `-v`의 `SIZE`는 다른 image와 공유하는 `SHARED SIZE`와 그 image만 쓰는 `UNIQUE SIZE`의 합이라 image 하나를 지워 돌아오는 공간은 `UNIQUE SIZE`에 가깝다. 기본 출력의 `RECLAIMABLE`은 공식 문서에 정확한 정의가 없으므로 정리 전 `-v`로 대상을 확인한다.

layer는 content hash로 식별돼 한 번만 저장된다. pull할 때 local에 같은 layer가 있으면 내려받지 않고(진행 출력의 `Already exists`), push할 때 registry에 이미 있는 layer는 `Layer already exists`로 건너뛴다. `docker tag`는 image를 복사하지 않는 별칭이다([[Docker-Image-Pipeline]]).

- dangling image는 tag가 없는 image다. unused image와 같은 집합은 아니다. 같은 이름과 tag로 다시 build하면 tag가 새 image로 옮겨 가고 이전 image가 `<none>:<none>`으로 남는다. tag를 생략하면 `latest`가 붙으므로 tag 없이 반복 build하는 개발 환경에서 주로 쌓인다([[Docker-Core#Image tag와 pull 정책|latest와 pull 정책]]).
- `docker rmi`는 tag 참조를 지우면 `Untagged:`, 실제 image를 지우면 `Deleted:`를 출력한다. tag가 여러 개인 image를 tag로 지우면 그 tag만 떨어지고, 마지막 tag일 때 image가 함께 삭제된다.
- `docker image prune`은 기본적으로 container가 참조하지 않는 dangling image를 정리한다. disk가 부족할 때 가장 먼저 해 볼 수 있는 정리다.
- `docker image prune -a`는 어떤 container도 참조하지 않는 tagged image까지 대상으로 넓힌다.
- `docker system prune`은 stopped container, unused network, dangling image와 build cache를 함께 정리한다. volume은 기본 대상이 아니고 `--volumes`도 anonymous volume만 지운다. 중지된 container를 먼저 지운 뒤 image를 정리하므로 `-a`를 붙이면 실행 중인 container가 쓰는 image만 남는다.
- 자동 정리는 age/label filter, rollback 보존 기간과 disk alert를 결합한다. 배포 직후 무조건 prune하면 직전 image를 이용한 빠른 rollback이 사라질 수 있다.

registry의 untagged manifest와 local dangling image는 다른 수명주기다. registry에는 별도 retention/lifecycle policy를 둔다.

## 면접 포인트

Q. Docker 이미지 최적화 경험이 있는가?
- base variant의 호환성을 먼저 검증하고 multi-stage build와 production dependency 분리
- layer별 측정으로 큰 원인을 찾고 변경 전후 pull/startup/CVE 수치를 함께 비교
- digest, SBOM와 rollback 보존 정책까지 release 단위로 관리

## 출처

- [Docker Docs, Build attestations](https://docs.docker.com/build/metadata/attestations/) — SBOM과 provenance의 역할, BuildKit의 메타데이터 생성
- [SLSA v1.2, Build: Verifying artifacts](https://slsa.dev/spec/v1.2/verifying-artifacts) — 서명, 신뢰할 builder, subject digest와 기대한 빌드 조건의 대조
- [Docker Docs, trusted content](https://docs.docker.com/docker-hub/image-library/trusted-content/)
- [Docker Docs, image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
- [Docker Docs, Docker Hardened Images](https://docs.docker.com/dhi/) — 등급별 CVE 수정 SLA
- [Docker Docs, What are hardened images and why use them?](https://docs.docker.com/dhi/explore/what/)
- [Docker Docs, Available types of Docker Hardened Images](https://docs.docker.com/dhi/explore/available/)
- [Docker Docs, Use a Docker Hardened Image](https://docs.docker.com/dhi/how-to/use/)
- [Docker Docs, How Docker Hardened Images are built](https://docs.docker.com/dhi/explore/build-process/)
- [Docker Docs, Understanding roles and responsibilities for Docker Hardened Images](https://docs.docker.com/dhi/explore/responsibility/)
- [Docker Docs, Vulnerability Exploitability eXchange (VEX)](https://docs.docker.com/dhi/explore/security-concepts/vex/)
- [Docker Docs, Supply-chain Levels for Software Artifacts (SLSA)](https://docs.docker.com/dhi/explore/security-concepts/slsa/)
- [Docker Docs, Troubleshoot](https://docs.docker.com/dhi/how-to/debug/)
- [Docker Makes Hardened Images Free, Open and Transparent for Everyone — Docker](https://www.docker.com/press-release/docker-makes-hardened-images-free-open-and-transparent-for-everyone/)
- [GoogleContainerTools, distroless](https://github.com/GoogleContainerTools/distroless)
- [Kubernetes Docs, Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes Docs, Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Docker CLI, system prune](https://docs.docker.com/reference/cli/docker/system/prune/)
- [Docker CLI, system df](https://docs.docker.com/reference/cli/docker/system/df/)
- [Docker CLI, image ls](https://docs.docker.com/reference/cli/docker/image/ls/)
- [Docker CLI, image rm](https://docs.docker.com/reference/cli/docker/image/rm/)
- [Docker CLI, image prune](https://docs.docker.com/reference/cli/docker/image/prune/)
- [Docker CLI, image pull](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker CLI, image push](https://docs.docker.com/reference/cli/docker/image/push/)
- [system prune 실행 순서 — docker/cli](https://github.com/docker/cli/blob/master/cli/command/system/pruner/pruner.go)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, image 선택](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414206)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, cache와 dangling image](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414207)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, build cache와 multi-stage](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416104)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, 기본 명령어 맛보기](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414203)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Image, Container, Layer](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414204)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Image 기본 명령어](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414205)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Docker Hub에 image 공개하기](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416527)

## 관련 문서
- [[Docker]]
- [[Docker-Core|Docker 기본]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Alpine-vs-Debian-Image|Alpine vs Debian 동작 차이 (busybox vs GNU coreutils)]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Cloud-Native-Buildpacks|Cloud Native Buildpacks]]
- [[Supply-Chain-Security|공급망 보안]]
