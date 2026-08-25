---
tags: [cicd, docker]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Docker Image Pipeline", "Docker 이미지 파이프라인"]
verified_at: 2026-08-04
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

## Build job 안전선

- third-party Action은 검토한 full commit SHA에 pin하고 Dependabot 등으로 update PR을 받는다.
- build secret을 `ARG`, `ENV`나 copied file에 넣지 않는다. BuildKit secret/SSH mount를 사용한다.
- cache key와 output을 신뢰 경계별로 나눈다. 외부 PR이 release credential과 writable cache를 사용하지 못하게 한다.
- `linux/amd64`, `linux/arm64`를 지원한다면 Buildx로 multi-platform manifest를 만들고 각 architecture에서 native dependency를 test한다. 무조건 amd64로 강제하는 것은 해결이 아니다.
- base image digest, lockfile, builder version과 build context를 provenance에 연결한다.
- scanner 결과는 CVE 개수 하나가 아니라 severity, exploitability, fix availability와 예외 만료일로 gate한다.

현재 공식 GitHub 예시는 checkout, Docker login/metadata/build-push action과 artifact attestation을 조합한다. action major version을 문서에 영구 고정하기보다 공식 예시와 release note를 확인하고 조직 정책에 승인된 SHA를 사용한다.

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

- [GitHub Docs, publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub Docs, Container registry 인증](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Docs, Action SHA pinning policy](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Docker Docs, SBOM and provenance attestations in GitHub Actions](https://docs.docker.com/build/ci/github-actions/attestations/)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, GHCR](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416392)
- [금융 인프라를 운영하는 Toss 개발자의 Docker, CI/CD pipeline](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416528)

## 관련 문서
- [[GitHub-Actions]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Docker-Compose|Docker Compose]]
- [[Image-Size-Optimization|Image selection, size와 cleanup]]
