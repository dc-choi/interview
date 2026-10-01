---
tags: [ci-cd, dependency-management, package-manager]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["Dependency Management", "의존성 관리"]
verified_at: 2026-09-30
---

# 의존성 관리

프로젝트가 쓰는 **외부 라이브러리와 버전을 선언, 설치, 재현 가능하게** 관리하는 것. 언어마다 도구가 다르지만 **lock 파일로 정확한 버전을 고정**한다는 원칙은 공통이다. Maven처럼 표준 lock 파일이 없는 도구는 정확한 버전 선언과 BOM으로 같은 목적을 채운다.

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

#### package.json의 특수 의존성 필드

`dependencies`와 `devDependencies`는 아래 Dev vs Prod, `optionalDependencies`는 [[Node.js#의존성 설치|Node.js 의존성 표]]를 따른다.

| 필드 | 의미 |
|---|---|
| `peerDependencies` | plugin처럼 host 패키지와 함께 쓰일 때 요구하는 버전 범위. npm 3~6은 자동 설치하지 않고 경고만 했지만 npm 7부터 기본으로 설치하고 해석할 수 없는 충돌은 `ERESOLVE` 오류가 된다 |
| `bundleDependencies` | `npm pack`과 publish 때 tarball에 함께 묶을 패키지 이름 배열. `bundledDependencies` 철자도 인정되고 `true`면 전부 묶는다 |
| `overrides` | 의존성 트리 안의 패키지를 다른 버전, 범위나 fork로 교체한다 |

- `overrides`는 프로젝트 root `package.json`의 것만 반영되고 설치된 의존성과 workspace 안의 것은 무시된다. 직접 의존하는 패키지는 dependency와 override의 spec이 같을 때만 바꿀 수 있어 `"$foo"`처럼 직접 의존성의 spec을 참조한다. `{"bar": {"foo": "1.0.0"}}`처럼 특정 부모 아래로 범위를 좁히거나 `npm:` 별칭으로 fork를 지정할 수 있다.
- 전형적인 용도는 상위 패키지가 새 버전을 내기 전에 취약한 전이 의존성을 패치 버전으로 올리는 것이다. 적용 뒤 lockfile diff, `npm ls`와 테스트로 확인하고 상위가 갱신되면 제거한다. pnpm은 root의 `pnpm-workspace.yaml`에 둔 `overrides`, Yarn은 root `package.json`의 `resolutions`로 같은 일을 한다.
- 예전 peer 동작이 필요해 `--legacy-peer-deps`를 쓰면 CI와 같은 트리를 만들도록 `.npmrc`에 고정한다 ([[Command-Line|npm CLI]]).
- `npm update`는 `package.json`의 범위 안에서만 올리고 기본으로 범위 값 자체는 바꾸지 않는다(`--save`로 갱신). `^1.1.1`은 2.x로 넘어가지 않으므로 메이저 업데이트는 `npm install <패키지>@latest`처럼 명시한다. `npm outdated`의 `Wanted`는 범위를 만족하는 최대 버전, `Latest`는 registry의 `latest` dist-tag다.

### Java/Kotlin

| 도구 | 특징 |
|---|---|
| **Maven** | XML, 안정적, 성숙한 생태계 |
| **Gradle** | Groovy/Kotlin DSL, 빠름, Android 표준 |

Spring, Java 엔터프라이즈는 **Maven**이 여전히 많이 쓰이고, 멀티 프로젝트, Android는 **Gradle**. Kotlin 프로젝트는 Gradle Kotlin DSL이 자연스러움.

#### Maven 좌표, 저장소와 표준 디렉터리

- `pom.xml`이 build와 외부 library를 정의한다. library는 `groupId`(조직이나 상위 프로젝트), `artifactId`(개별 모듈), `version` 좌표로 지정하고, Maven은 기본 원격 저장소인 Maven Central에서 받아 local repository(기본 `~/.m2/repository`)에 cache한다.
- Spring Framework는 설치하는 제품이 아니라 `spring-context`, `spring-jdbc`, `spring-webmvc` 같은 모듈 artifact의 묶음이라 필요한 모듈만 dependency로 붙인다. Boot의 starter와 BOM은 [[Spring-Boot-Auto-Configuration-and-Starters|Spring Boot 자동 구성과 starter]]를 따른다.
- 표준 디렉터리는 `src/main/java`, `src/main/resources`, `src/test/java`, `src/test/resources`, web 프로젝트의 `src/main/webapp`이고 build 결과는 `target`에 모인다. `src/main/resources`는 build 출력 디렉터리(기본 `target/classes`)로 복사되어 classpath root가 되므로 위치가 틀리면 `classpath:` 경로의 설정 파일을 찾지 못한다. POM에서 바꿀 수 있지만 관례를 따르는 편이 낫다.
- `pom.xml`과 표준 구조가 IDE와 무관한 프로젝트 정의다. 마법사 없이 만든 폴더도 Maven project로 import하면 같은 프로젝트가 되고, JDK 수준의 기준은 IDE 설정이 아니라 POM의 `maven.compiler.release`다. IDE와 어긋나면 POM 기준으로 다시 동기화한다. `--release`는 `-source`, `-target`과 달리 그 Java SE에 없는 API 사용도 오류로 잡는다.
- Maven 3.9 GA(2026-09-30 기준 3.9.16, 4.0은 RC)에는 npm의 lockfile에 해당하는 표준 기능이 없다. 버전은 POM에 정확히 적고, 전이 의존성은 트리에서 가장 가까운 선언이 이기므로(nearest definition) `dependencyManagement`와 BOM(`<scope>import</scope>`)으로 버전을 정렬한 뒤 `mvn dependency:tree`로 실제 선택을 확인한다.
- Central에 없는 artifact 때문에 POM에 저장소를 추가하면 신뢰 경계가 늘어난다 ([[Supply-Chain-Security|공급망 보안]]). Oracle JDBC driver처럼 예전에 별도 저장소가 필요했던 artifact도 지금은 Central의 `com.oracle.database.jdbc`에 배포되는지 먼저 확인한다.

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
"^1.2.0 || ^2.0.0" → 두 범위 중 하나를 만족 (1.x 또는 2.x)
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

빌드 단계에는 TypeScript 같은 dev 의존성이 필요할 수 있다. 실행용 이미지나 배포 단계에서는 필요하지 않은 dev 의존성을 제외한다. npm CLI v11과 v12는 `--omit=dev`, pnpm은 `--prod`, Yarn의 modern release는 `yarn workspaces focus --production`을 쓴다. npm v11과 v12의 `--production`은 `--omit=dev`의 deprecated alias다.

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
- [npm Docs, Config production (v12)](https://docs.npmjs.com/cli/v12/using-npm/config#production)
- [npm Docs, package.json (v12)](https://docs.npmjs.com/cli/v12/configuring-npm/package-json)
- [npm Docs, npm update (v12)](https://docs.npmjs.com/cli/v12/commands/npm-update)
- [npm Docs, npm outdated (v12)](https://docs.npmjs.com/cli/v12/commands/npm-outdated)
- [pnpm, Settings: overrides](https://pnpm.io/settings/dependency-resolution)
- [Yarn, Manifest resolutions](https://yarnpkg.com/configuration/manifest#resolutions)
- [Maven, Introduction to the Standard Directory Layout](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html)
- [Maven, Introduction to the Dependency Mechanism](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)
- [Maven, Introduction to Repositories](https://maven.apache.org/guides/introduction/introduction-to-repositories.html)
- [Maven, Settings Reference](https://maven.apache.org/settings.html)
- [Maven Compiler Plugin, Setting the --release](https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html)
- [Maven, Release History](https://maven.apache.org/docs/history.html)
- [Maven Central, com.oracle.database.jdbc](https://repo.maven.apache.org/maven2/com/oracle/database/jdbc/)
- [OWASP Dependency-Check Gradle Plugin — OWASP](https://github.com/dependency-check/dependency-check-gradle)
- [인프런, 가장 쉬운 Node.js, package.json](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=276704)
- [인프런, 가장 쉬운 Node.js, npm](https://www.inflearn.com/courses/lecture?courseId=336276&unitId=277123)
- [인프런, 자바 스프링 프레임워크(renew ver.), 스프링 개요](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13709)
- [인프런, 자바 스프링 프레임워크(renew ver.), 개발 환경 구축](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13711)
- [인프런, 자바 스프링 프레임워크(renew ver.), 스프링 프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13713)
- [인프런, 자바 스프링 프레임워크(renew ver.), 처음해 보는 스프링 프로젝트](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13714)
- [인프런, 자바 스프링 프레임워크(renew ver.), 또 다른 프로젝트 생성 방법](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13715)
- [인프런, 자바 스프링 프레임워크(renew ver.), STS를 이용하지 않은 웹 프로젝트](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13729)
- [인프런, 자바 스프링 프레임워크(renew ver.), JdbcTemplate](https://www.inflearn.com/courses/lecture?courseId=182992&unitId=13738)

## 관련 문서
- [[Version-Control-Tooling|버전 관리 도구]]
- [[Development-Workflow|개발 워크플로]]
- [[Dependency-Selection|의존성 선택]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
- [[Supply-Chain-Security|공급망 보안]]
