---
tags: [cicd, docker]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Docker Image Pipeline", "Docker 이미지 파이프라인"]
verified_at: 2026-09-30
---

# Docker Image Build Pipeline

소스 commit을 검증된 immutable image로 만들고 registry, 배포와 rollback까지 같은 identity로 잇는 공급망이다. build와 push 성공만으로 완료하지 않고 누가 무엇을 만들었는지, production이 정확히 어느 digest를 실행하는지 증명해야 한다.

## 파이프라인 흐름

1. 변경 범위를 계산하고 source checkout을 commit SHA에 고정한다.
2. lint, test와 dependency policy를 통과시킨다.
3. BuildKit으로 multi-stage image를 재현 가능하게 build한다.
4. vulnerability policy를 평가하고 SBOM/provenance attestation을 만든다.
5. registry에 release tag와 commit SHA tag를 push하고 반환된 digest를 기록한다.
6. production manifest는 승인된 digest를 참조한다.
7. health/SLO를 검증하고 실패하면 직전 digest로 rollback한다.
8. registry와 node의 retention policy가 지난 artifact만 정리한다.

## 태그 전략

| 태그 | 용도 | 예시 |
|---|---|---|
| 사람이 읽는 release tag | 탐색과 release 의미 | `api:2026.08.04` |
| commit SHA tag | source와 빠른 상관관계 | `api:a1b2c3d` |
| manifest digest | 실제 배포 content 고정 | `api@sha256:...` |

tag는 다시 가리킬 수 있지만 digest는 content-addressed identity다. SHA tag만으로도 registry가 tag overwrite를 허용하면 불변성이 보장되지 않는다. 배포 기록과 rollback target에는 digest를 사용하고 tag는 사람이 찾는 alias로 둔다.

## Registry 인증과 권한

GHCR에 같은 repository의 image를 publish하는 GitHub Actions job은 장기 PAT보다 run별 `GITHUB_TOKEN`을 우선한다.

```yaml
permissions:
  contents: read
  packages: write
  attestations: write
  id-token: write
```

필요한 기능만 job scope에 부여한다. 다른 repository/package와의 권한 관계에 따라 별도 access 설정이 필요할 수 있다. local 수동 push나 `GITHUB_TOKEN` 범위를 벗어난 작업에 PAT를 쓸 때도 최소 package scope와 짧은 수명, secret manager를 적용한다.

Docker Hub, ECR과 다른 registry도 로그인, repository-qualified tag, push라는 흐름은 같지만 인증 수명과 권한 모델은 다르다. cloud registry는 가능하면 runner의 workload identity/OIDC와 short-lived credential을 사용한다.

## Image 참조 이름과 registry 선택

image 참조는 `[HOST[:PORT]/]NAMESPACE/REPOSITORY[:TAG]`다. host를 생략하면 Docker Hub(`docker.io`), namespace를 생략하면 Docker Official Image용 `library`, tag를 생략하면 `latest`로 해석된다. `nginx`가 `docker.io/library/nginx:latest`인 이유이며, 직접 올리는 image에는 사용자나 조직 namespace를 붙인다. namespace와 repository 같은 경로 구성 요소는 소문자, 숫자와 구분자만 허용하므로 여기에 대문자가 섞이면 형식 오류로 거부된다. tag는 대문자와 소문자를 모두 쓸 수 있어 `user/app:V1`은 유효하고, 최대 128자다.

| registry | 참조 형식 | 인증 |
|---|---|---|
| Docker Hub | `docker.io/<사용자>/<image>:<tag>` | `docker login` |
| GHCR | `ghcr.io/<소유자>/<image>:<tag>` | workflow는 `GITHUB_TOKEN`, 수동은 `write:packages` scope의 PAT (classic) |
| Amazon ECR | `<계정>.dkr.ecr.<리전>.amazonaws.com/<repository>:<tag>` | `aws ecr get-login-password`로 받은 12시간 token |
| Artifact Registry | `<위치>-docker.pkg.dev/<프로젝트>/<repository>/<image>:<tag>` | gcloud credential helper |

`docker tag`는 image를 복사하지 않고 같은 image에 참조 이름을 하나 더 붙인다. 여러 tag가 같은 image ID를 가리키므로 disk를 더 쓰지 않는다. 게시는 build, registry host를 넣은 tag 부여, 로그인, push 순서이고 registry마다 주소와 인증만 다르다. push 뒤 local image를 지우고 같은 참조로 pull해 실행하면 게시가 재현되는지 확인할 수 있다.

private registry는 코드와 실행 환경이 이미 속한 권한 체계를 따라 고른다. GitHub 중심이면 GHCR(처음 publish한 package는 private), ECS와 EKS를 쓰는 AWS 환경이면 IAM과 통합된 [[ECR|ECR]], GCP면 Artifact Registry가 자연스럽다. 2026-09-30 기준 Docker Personal plan의 private repository는 1개이고, GitHub는 Container registry의 storage와 bandwidth를 현재 무료로 두되 바꿀 때는 최소 한 달 전에 알린다고 밝힌다. 가격과 한도는 도입 시점에 다시 확인한다.

## Build job 안전선

- third-party Action은 검토한 full commit SHA에 pin하고 Dependabot 등으로 update PR을 받는다.
- build secret을 `ARG`, `ENV`나 copied file에 넣지 않는다. BuildKit secret/SSH mount를 사용한다.
- cache key와 output을 신뢰 경계별로 나눈다. 외부 PR이 release credential과 writable cache를 사용하지 못하게 한다.
- `linux/amd64`, `linux/arm64`를 지원한다면 Buildx로 multi-platform manifest를 만들고 각 architecture에서 native dependency를 test한다. 무조건 amd64로 강제하는 것은 해결이 아니다.
- base image digest, lockfile, builder version과 build context를 provenance에 연결한다.
- scanner 결과는 CVE 개수 하나가 아니라 severity, exploitability, fix availability와 예외 만료일로 gate한다.

현재 공식 GitHub 예시는 checkout, Docker login/metadata/build-push action과 artifact attestation을 조합한다. action major version을 문서에 영구 고정하기보다 공식 예시와 release note를 확인하고 조직 정책에 승인된 SHA를 사용한다.

## CI 캐시와 이미지 저장소의 비용 분리

2026-10-08 Docker 공식 문서 기준이다. 빌드 캐시 적중과 전체 CI 시간은 다른 지표다. 캐시를 가져오고 결과를 내보내는 비용까지 재면, 재계산을 줄였어도 작은 빌드는 느려질 수 있다.

- **캐시의 소유자**: 내부 캐시는 BuildKit 인스턴스에 속한다. 임시 builder를 매번 만들면 이전 내부 캐시를 그대로 공유하지 못하므로, 유지되는 builder나 `--cache-from`/`--cache-to`로 가져오고 내보내는 외부 캐시를 검토한다.
- **레이어 재사용**: 자주 바뀌지 않는 의존성 설치를 소스 복사보다 앞에 둔다. 캐시 데이터가 존재해도 명령과 입력이 달라지면 해당 레이어를 다시 빌드한다. 캐시 볼륨 연결 성공률을 레이어 적중률로 계산하지 않는다.
- **전송과 재계산의 교환**: `mode=min`은 최종 이미지에 포함되는 레이어를, `mode=max`는 중간 단계까지 내보낸다. `inline` 캐시는 `mode=max`를 지원하지 않는다. 더 넓은 캐시가 적중 기회를 늘려도 저장과 전송 비용이 커질 수 있으므로 총 소요시간으로 선택한다.
- **동시 빌드**: 캐시 export 위치를 공유하면 이전 데이터가 덮어써질 수 있다. branch별로 쓰기 위치를 나누고 현재 branch와 main 캐시를 함께 읽는 방식이 가능하다. 외부 PR과 release의 신뢰 경계는 그대로 유지한다.

빌드 시간이 일괄 증가하면 캐시 miss뿐 아니라 **실제 image store와 출력 단계**를 확인한다. Docker Engine 29.0 이상은 새 설치에서 containerd image store가 기본이지만, 이전 버전에서 업그레이드한 daemon은 명시적으로 전환하기 전까지 기존 graph driver를 유지한다. `userns-remap` 구성은 containerd image store를 지원하지 않는 예외다.

containerd image store는 압축된 이미지와 압축을 푼 레이어를 함께 저장한다. 따라서 버전 번호가 같아도 기존 데이터가 있는 runner와 새 runner의 저장 방식, 디스크 사용량이 다를 수 있다. Docker data directory를 따로 지정했더라도 containerd의 저장 경로는 별도로 확인한다. 특정 환경의 `unpacking` 지연을 모든 containerd 빌드의 성능 저하로 일반화하지 않는다.

운영 비교는 다음처럼 나눈다.

1. 동일 입력에서 cold/warm cache, 기존/신규 runner를 각각 비교한다.
2. 대기, builder 준비, cache import, 실제 build, image export/load, registry push 시간을 분리한다.
3. 평균만 보지 않고 중앙값과 상위 지연, 읽기/쓰기 byte, cache import/export 크기도 비교한다.
4. 저장 방식 전환은 기능과 호환성을 확인한 뒤 판단한다. graph driver로의 복귀를 일반 최적화로 권하지 않는다. 전환 뒤 이전 이미지가 안 보이더라도 삭제된 것으로 단정하지 않는다.

## 작은 서비스의 SSH + Compose 배포

GitHub Actions에서 SSH로 운영 서버에 접속하여 배포를 실행한다.

작은 단일 host에는 SSH와 Compose도 유효하다. 다만 remote script는 tag가 아니라 승인 digest를 입력받고 다음 순서를 지킨다.

1. 새 digest pull과 config validation
2. migration의 backward compatibility 확인
3. `docker compose up -d`로 교체
4. readiness와 핵심 transaction 검증
5. 실패 시 직전 digest로 복구

`docker image prune`을 배포 성공 조건에 넣지 않는다. cleanup 실패가 release를 실패시키거나 직전 rollback image를 지우지 않도록 별도 maintenance job과 보존 기간으로 분리한다. 여러 node/cluster에서는 desired state와 digest를 Git에 두는 GitOps controller를 고려한다.

## 면접 포인트

Q. Docker 이미지 배포 파이프라인은 어떻게 구성했는가?
- test 이후 한 번 build한 digest를 환경 간 승격하고 다시 build하지 않는다.
- 최소 권한의 short-lived credential로 registry에 push한다.
- SBOM/provenance, scan 결과와 source SHA를 digest에 연결한다.
- health gate와 직전 digest rollback을 자동화한다.

## 출처

- [Docker Docs, Optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/)
- [Docker Docs, Cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker Docs, containerd image store with Docker Engine](https://docs.docker.com/engine/storage/containerd/)
- [궁극의 CI 환경을 위한 여정 2: 캐시 히트율 100%에 도전하다 — 당근 팀](https://www.youtube.com/watch?v=PTEZnscaSwE)
- [GitHub Docs, publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Docs, Container registry 인증](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Docs, Action SHA pinning policy](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Docker Docs, SBOM and provenance attestations in GitHub Actions](https://docs.docker.com/build/ci/github-actions/attestations/)
- [Docker Docs, docker image tag](https://docs.docker.com/reference/cli/docker/image/tag/)
- [distribution/reference, 참조 문법](https://pkg.go.dev/github.com/distribution/reference)
- [Docker, Pricing](https://www.docker.com/pricing/)
- [GitHub Docs, GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
- [AWS Docs, Amazon ECR private registry authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)
- [Google Cloud Docs, Artifact Registry pushing and pulling images](https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, GHCR](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416392)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, CI/CD pipeline](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416528)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, Docker Hub에 image 게시](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416527)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, image 선택](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414206)

## 관련 문서
- [[GitHub-Actions]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Docker-Compose|Docker Compose]]
- [[Image-Size-Optimization|Image selection, size와 cleanup]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]]
