---
tags: [ci-cd, monorepo, dependency-management, catalog, pnpm, yarn]
status: done
verified_at: 2026-10-01
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Dependency Catalogs", "의존성 카탈로그", "모노레포 의존성 통합"]
---

# 의존성 카탈로그와 모노레포 운영 정책

**카탈로그는 패키지별 버전 범위를 한곳에 선언하고 여러 workspace가 참조하는 기능**이다. 저장소를 하나로 합쳐도 서비스마다 다른 버전을 선언할 수 있다. 카탈로그는 이 선언을 중앙에서 관리해 반복 수정과 버전 파편화를 줄인다.

## 버전 선언과 설치 결과의 구분

| 수단 | 통제하는 대상 |
|---|---|
| `catalog:` | 여러 manifest가 재사용하는 버전 범위 |
| Lockfile | 범위를 해석해 선택한 실제 의존성 그래프 |
| `workspace:` | 저장소 내부 패키지를 참조하는 방식 |
| `overrides` / `resolutions` | 의존성 해석 결과를 다른 버전으로 바꾸는 규칙 |

카탈로그에 `^18.3.1`을 적으면 정확한 버전 고정이 아니라 그 범위를 공유한다. 카탈로그 변경 뒤 설치하고 lockfile diff를 검토해야 실제 선택을 알 수 있다. 선언을 통일해도 peer dependency와 전이 의존성이 요구하는 호환성까지 자동 검증되는 것은 아니다. Lockfile과 해석 규칙은 [[Dependency-Management|의존성 관리]]를 따른다.

## 기본 카탈로그와 이름 있는 카탈로그

pnpm은 `pnpm-workspace.yaml`에 정의한다. 아래 버전은 문법 예시다.

```yaml
packages:
  - apps/*
  - packages/*

catalog:
  lodash: ^4.17.21

catalogs:
  react18:
    react: ^18.3.1
    react-dom: ^18.3.1
  react19:
    react: ^19.0.0
    react-dom: ^19.0.0
```

```json
{
  "dependencies": {
    "lodash": "catalog:",
    "react": "catalog:react18",
    "react-dom": "catalog:react18"
  }
}
```

`catalog:`는 기본 카탈로그, `catalog:react18`은 이름 있는 카탈로그를 참조한다. 여러 카탈로그를 함께 두면 새 버전으로 순차 전환할 수 있다. pnpm의 `publish`와 `pack`은 프로토콜을 해당 버전 범위로 바꿔 외부 소비자가 사용할 수 있게 한다. [pnpm Catalogs](https://pnpm.io/catalogs)

## 패키지 매니저와 정책 확장 구분

2026-10-01 공식 문서 기준이다.

| 도구 | 기본 동작과 경계 |
|---|---|
| pnpm | `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`와 workspace 설정의 `overrides`에서 참조 가능 |
| Yarn | 4.10.0부터 기본 제공. `.yarnrc.yml`의 `catalog` / `catalogs`를 참조하며 문서가 명시한 지원 필드는 `dependencies`, `devDependencies`. 배포할 때 버전 범위로 치환 |

두 도구의 지원 필드를 동일하게 가정하지 않는다. pnpm의 `catalogMode`는 `pnpm add`의 기본 카탈로그 사용 방식을 정한다. `manual`이 기본이며, `strict`는 범위 밖 버전을 거부하고 `prefer`는 가능한 경우 카탈로그를 사용한다. 이 옵션만으로 수동 편집한 manifest 전부가 조직 정책을 지켰다고 판정하지 않는다. [pnpm Catalogs](https://pnpm.io/catalogs), [Yarn Catalogs](https://yarnpkg.com/features/catalogs)

Yarn의 기본 카탈로그와 별도 플러그인의 운영 기능도 구분한다. `toss/yarn-plugin-catalogs`는 `catalogs.yml`에서 상속 관계, 추가 기본값과 workspace별 정책을 정의하고 `yarn catalogs apply`로 `.yarnrc.yml`을 생성한다. `yarn catalogs apply --check`는 생성 결과의 동기화, `yarn catalogs validate`는 사용 정책을 검사한다. **설치 중 정책 위반은 경고이므로 CI 강제에는 `validate`를 사용**한다. 아티클의 `yarn catalog switch`는 사내 마이그레이션 예시이며 Yarn 기본 명령으로 취급하지 않는다. [플러그인 README](https://github.com/toss/yarn-plugin-catalogs)

## 카탈로그를 운영하는 기준

버전 목록 외에 배포와 책임 정책을 정해야 한다.

1. 여러 서비스가 공유하는 핵심 패키지부터 묶고 대표 서비스에서 조합을 검증한다.
2. 발행된 카탈로그에는 호환성을 깨는 변경을 넣지 않고 새 이름으로 발행한다.
3. 일부 서비스가 먼저 전환한 뒤 나머지를 옮기며, 필요한 코드 변환과 복귀 절차를 함께 제공한다.
4. 신규 서비스와 패키지 추가 흐름이 표준을 따르게 하고 CI에서 누락을 확인한다.
5. 예외의 이유, 담당자와 종료 조건을 정해 지원할 조합이 다시 늘어나는 것을 관리한다.

1~4는 대규모 운영 사례에서 가져온 정책 패턴이고, 5는 장기 운영을 위한 점검 제안이다. 월별 발행은 가능한 선택지이며 모든 조직에 필요한 규칙은 아니다. 파괴적 변경과 긴급 보안 패치를 같은 주기에 묶을지는 별도로 정한다.

### 효과 측정과 적용 조건

버전 정렬로 중복이 줄면 설치와 개발 서버 비용도 줄 수 있다. 토스의 2026-08-10 공개 사례에서는 `.pnp.cjs`가 96MB에서 15MB, 설치 시간이 528.4초에서 249.9초로 감소했다. 당시 모노레포의 결과이며 다른 저장소의 개선율을 보장하지 않는다. [운영 사례](https://toss.tech/article/52209)

카탈로그 사용률만 보지 말고 설치 시간, 실제 중복 버전, 서비스별 카탈로그 분포, 전환 소요 시간과 실패를 함께 확인한다. 버전 조합이 적고 업데이트 비용도 작으면 단일 카탈로그로 시작한다. 이름 있는 카탈로그와 별도 플러그인은 병행 지원이나 정책 강제가 필요해질 때 추가한다.

저장소 분리는 설치 범위를 줄일 수 있지만 버전 정책의 파편화를 직접 해소하지는 않는다. 반대로 조직의 배포와 소유권 경계가 독립성을 요구하면 카탈로그만으로 저장소 통합을 정당화하지 않는다. 저장소 경계 판단은 [[Monorepo-Architecture|모노레포 아키텍처]], 빌드 영향과 캐시는 [[Monorepo-CICD|모노레포 CI/CD]]를 따른다.

## 확인할 질문

- 카탈로그와 lockfile 중 무엇이 선언 범위를, 무엇이 설치 결과를 기록하는가?
- 같은 카탈로그의 변경과 새로운 카탈로그 발행을 어떤 기준으로 나누는가?
- 버전 통일과 호환성 검증, 정책 준수 검증은 각각 어디에서 하는가?

## 출처

- [모노리포 희망편, 절망의 리포가 희망의 리포로 부활하기까지 걸린 1년 — Toss Tech](https://toss.tech/article/52209)
- [pnpm, Catalogs](https://pnpm.io/catalogs)
- [Yarn, Catalogs](https://yarnpkg.com/features/catalogs)
- [yarn-plugin-catalogs — Toss](https://github.com/toss/yarn-plugin-catalogs)

## 관련 문서

- [[Dependency-Management|의존성 관리]]
- [[Monorepo-CICD|모노레포 CI/CD와 플랫폼 건강 관리]]
- [[Monorepo-Architecture|모노레포 아키텍처]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
