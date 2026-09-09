---
tags: [ci-cd, dependency-management, package-manager]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["Dependency Management", "의존성 관리"]
---

# 의존성 관리

프로젝트가 쓰는 **외부 라이브러리와 버전을 선언, 설치, 재현 가능하게** 관리하는 것. 언어마다 도구가 다르지만 **"lock 파일로 정확한 버전 고정"** 이라는 원칙은 공통.

## 왜 필요한가

- 팀원마다 **같은 버전으로 설치**되어야 "내 환경에서는 되는데"를 방지
- **추이적 의존성**(dep of dep) 해석을 자동화
- CI, 프로덕션에서 **같은 의존성 그래프를 설치할 기반**
- 취약점 스캔, 업데이트, 롤백 자동화의 전제

## 3계층 개념

| 파일 | 역할 |
|---|---|
| **직접 선언** (e.g. `pyproject.toml`, `package.json`) | 필요한 라이브러리 이름과 **버전 범위** |
| **Lock 파일** (`poetry.lock`, `package-lock.json`) | 해석된 **정확한 버전** + 해시 |
| **가상 환경/node_modules** | 실제 설치된 바이너리 |

- 사람은 **직접 선언**만 수정
- 도구가 **lock**을 생성, 갱신
- CI, 프로덕션은 **lock 기반으로만 설치** → 해석된 의존성 그래프와 무결성의 재현 가능성을 높임

애플리케이션과 배포 산출물의 재현성을 통제하는 lock 파일은 커밋한다. 라이브러리는 생태계별 배포 규칙과 지원할 버전 범위를 함께 고려해 정책을 정한다.

Lock 파일만으로 bit-identical 바이너리가 보장되지는 않는다. OS와 CPU별 optional dependency, native build, install script 결과가 달라질 수 있으므로 런타임, 패키지 매니저, toolchain과 base image도 고정한다. 환경별 동일 배포물을 보장하려면 한 번 빌드한 artifact를 검증 후 승격한다.

## 언어별 도구

### Python

| 도구 | 특징 | 추천 상황 |
|---|---|---|
| `pip` + `requirements.txt` | 표준, 단순, lock 불완전 | 학습, 단순 스크립트 |
| `pipenv` | `Pipfile` + `Pipfile.lock` + venv 통합 | 중간 규모 프로젝트 |
| **Poetry** | `pyproject.toml` + `poetry.lock` + 빌드, 배포 통합 | 의존성, 가상 환경과 패키징을 한 도구로 관리할 때 |
| `uv` (Astral) | Rust 기반, pip 호환 설치 인터페이스와 lock 지원 | 빠른 설치와 통합 도구가 필요할 때 |

프로젝트 요구와 팀 도구에 맞춰 선택한다. `pip` 중심 환경에서도 `pip-tools`나 `uv lock`처럼 해결된 버전을 재현할 방법을 둔다.

### JavaScript/TypeScript

| 도구 | 특징 |
|---|---|
| `npm` | 기본 내장, `package-lock.json` |
| `yarn` | workspaces, plug'n'play, Classic, Berry 두 라인 |
| **pnpm** | **디스크 절약**(content-addressable store와 하드링크), 빠름, monorepo 강점 |

pnpm은 저장 공간 절약과 workspace 구성이 중요한 monorepo의 선택지다. 단순한 프로젝트는 npm만으로도 충분하다.

### Java/Kotlin

| 도구 | 특징 |
|---|---|
| **Maven** | XML, 안정적, 성숙한 생태계 |
| **Gradle** | Groovy/Kotlin DSL, 빠름, Android 표준 |

Spring, Java 엔터프라이즈는 **Maven**이 여전히 많이 쓰이고, 멀티 프로젝트, Android는 **Gradle**. Kotlin 프로젝트는 Gradle Kotlin DSL이 자연스러움.

### Go
- Go Modules (`go.mod` + `go.sum`) — Go 1.11+ 표준, 언어 내장

### Rust
- Cargo (`Cargo.toml` + `Cargo.lock`) — 언어 내장, 우수한 UX

## 버전 범위 표기

```
"^1.2.3"  → >=1.2.3, <2.0.0  (caret, 메이저 고정)
"~1.2.3"  → >=1.2.3, <1.3.0  (tilde, 마이너 고정)
"1.2.3"   → 정확히 1.2.3
"*"       → 어떤 버전이든 (위험)
```

**Semver 원칙**: `MAJOR.MINOR.PATCH`. MAJOR는 호환 깨짐, MINOR는 기능 추가, PATCH는 버그 수정.

팀 정책:
- 라이브러리 개발: 넓은 범위 (`^1.2.3`) — 소비자가 최신 사용 가능
- 애플리케이션: **lock 파일로 정확 버전 고정** → 재현 가능성 최우선

## 보안, 유지보수

### 취약점 스캔
- **Dependabot** (GitHub 내장) — 취약한 의존성에 자동 PR
- **Snyk**, **Renovate** — 정기 스캔 + 업데이트 제안
- **npm audit** — npm 내장
- `pip-audit` — PyPA가 별도로 배포하는 도구로, `pip install pip-audit` 등으로 설치
- `gradle dependencyCheckAnalyze` — OWASP `org.owasp.dependencycheck` 플러그인을 적용한 뒤 실행하는 Gradle task

### 업데이트 전략
- **주기적 소규모** 업데이트가 **드물고 대규모**보다 안전
- 의존성 업데이트 PR은 **CI 전체가 통과**해야 머지

### License 체크
- 의존성 라이선스가 **자사 라이선스와 호환**되는지 확인
- GPL 계열이 프로프라이어터리 프로젝트에 섞이면 위험
- 자동화: `license-checker`, FOSSA

## 흔한 실수

- **Lock 파일을 gitignore** → 팀원마다 버전 불일치 → "왜 내 로컬에서만 깨지지?"
- **전역 설치 남용** (`npm install -g`) → 프로젝트 간 버전 충돌
- **`*` 버전 사용** → 어느 날 갑자기 메이저 업데이트로 CI 빨개짐
- **오래 방치** → 한 번에 수십 개 major 업데이트 → 지옥
- **devDependencies 혼동** — 빌드용 도구가 프로덕션에 설치됨

## Dev vs Prod 의존성

- **Dependencies** (prod): 런타임에 필요한 것 (express, pg, requests)
- **DevDependencies**: 개발, 빌드, 테스트에만 필요 (jest, eslint, prettier, typescript)

빌드 단계에는 TypeScript 같은 dev 의존성이 필요할 수 있다. 실행용 이미지나 배포 단계에서는 필요하지 않은 dev 의존성을 제외한다. npm CLI v11은 `--omit=dev`, pnpm은 `--prod`, Yarn의 modern release는 `yarn workspaces focus --production`을 쓴다. npm v11의 `--production`은 `--omit=dev`의 deprecated alias다.

## 면접 체크포인트

- Lock 파일을 커밋해야 하는 이유 (재현 가능성)
- `^`와 `~`의 의미 차이
- Poetry가 pip보다 나은 점
- pnpm이 npm, yarn 대비 디스크를 절약하는 방법 (content-addressable store와 하드링크, 심링크는 non-flat `node_modules` 구조에 사용)
- Dependabot, Snyk 같은 취약점 스캔 자동화

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 8. 의존성 관리 도구 결정](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-8.-%EC%9D%98%EC%A1%B4%EC%84%B1-%EA%B4%80%EB%A6%AC-%EB%8F%84%EA%B5%AC-%EA%B2%B0%EC%A0%95)
- [pnpm, Motivation](https://pnpm.io/motivation)
- [uv, Projects](https://docs.astral.sh/uv/guides/projects/)
- [Poetry, Managing dependencies](https://python-poetry.org/docs/managing-dependencies/)
- [Yarn, `workspaces focus`](https://yarnpkg.com/cli/workspaces/focus)
- [npm Docs, Config production](https://docs.npmjs.com/cli/v11/using-npm/config#production)
- [OWASP Dependency-Check Gradle Plugin — OWASP](https://github.com/dependency-check/dependency-check-gradle)

## 관련 문서
- [[Version-Control-Tooling|버전 관리 도구]]
- [[Development-Workflow|개발 워크플로]]
- [[Dependency-Selection|의존성 선택]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Supply-Chain-Security|공급망 보안]]
