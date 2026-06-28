---
tags: [architecture, micro-frontend, module-federation, webpack, deployment]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Module Federation", "모듈 페더레이션", "Micro Frontend", "마이크로 프론트엔드", "Build-time Run-time Integration", "런타임 통합"]
---

# Module Federation과 마이크로 프론트엔드 런타임 통합

여러 독립 모듈을 하나의 사용자 경험으로 합치는 방식은 **결합 시점**에 따라 Build-time과 Run-time으로 갈린다. Module Federation은 브라우저에서 JavaScript 모듈을 런타임에 동적으로 공유하게 해주는 Webpack 5 기술로, Run-time 통합과 진정한 독립 배포를 가능하게 한다.

## 모듈 통합 — Build-time vs Run-time

| 축 | Build-time 통합 | Run-time 통합 |
|---|---|---|
| 결합 시점 | 빌드 시점 (번들러가 합침) | 실행 시점 (Host가 동적 로드) |
| 배포 단위 | 의존하는 앱 전체 재배포 | 모듈 단위 독립 배포 |
| 적합 계층 | shared, entity, feature, service | fragment 이상 |

**Build-time 통합**은 번들러(Vite, Webpack, Rollup)가 빌드 시점에 여러 패키지 코드를 분석해 하나의 번들로 합친다. pnpm workspace에서 `workspace:*`로 참조한 패키지가 그대로 묶이는 방식이다. 장점은 예측 가능성(빌드 시점에 쓰일 코드가 모두 확정), 정적 분석 용이, 디버깅 단순화, 빌드 시점 최적화(Tree Shaking, Code Splitting)다. 단점은 하위 패키지가 바뀌면 그것을 직접, 간접으로 의존하는 모든 앱을 재빌드, 재배포해야 한다는 것 — fan-in이 높은 패키지 하나의 변경이 수십 번의 재배포를 유발한다. 그래서 변화율이 낮고 로직, 타입 위주이며 UI와 무관한 하위 계층에 적합하다.

**Run-time 통합**은 각 모듈을 독립적으로 번들해 CDN에 배포하고, Host(Shell) 앱이 실행 시점에 동적으로 로드한다. 통합되는 모듈이 바뀌어도 Host를 재빌드, 재배포할 필요가 없다. use-case 단위 비즈니스 로직과 UI가 결합돼 독립 배포가 가능한 fragment 계층부터 적용한다. fragment 팀이 Host 팀의 배포를 기다리지 않고 자기 모듈을 언제든 배포할 수 있는 것이 **진정한 독립 배포(Independent Deployment)** 다.

## 마이크로 프론트엔드 통합 방식의 변천

| 방식 | 격리 | 배포 | 한계 |
|---|---|---|---|
| npm 패키지 | 약함 | build-time, 재배포 필요 | 런타임 공유 불가 |
| iframe | 강함 | 독립 | 통신 번거로움, 성능, UX 제약 |
| Web Component | 표준 기반 | 독립 | 공유 의존성, SSR 한계 |
| Module Federation | 모듈 단위 | 런타임 독립 | 번들러(Webpack 5) 종속 |

Module Federation은 런타임 동적 공유에 더해 **공유 의존성 협상**까지 제공해 앞선 방식들의 한계를 넘는다.

## Module Federation 핵심 (Webpack 5)

### Container — remoteEntry.js

Module Federation으로 빌드된 각 Remote는 `remoteEntry.js`라는 진입점을 만든다. 이 파일이 컨테이너(Container)이며 두 API를 노출한다. `init(shareScope)` 는 Host가 준비한 공유 스코프를 Remote에 주입하고, `get(moduleName)` 은 특정 모듈을 비동기로 반환한다. Host는 부팅 단계에서 자신의 공유 모듈을 shareScope에 등록해두고, Remote의 `remoteEntry.js`를 동적 로드한 뒤 `init`으로 스코프를 넘기고 `get('./EditorFragment')`로 실제 컴포넌트를 가져온다. Remote는 `exposes`로 노출할 모듈을, Host는 `remotes`로 참조할 Remote를 선언한다.

### Shared Scope — 공유 의존성의 런타임 협상

Host와 여러 Fragment가 각자 React를 번들에 포함하면 메모리에 React가 여러 개 로드된다. 이것은 단순한 용량 낭비가 아니라 런타임 오류를 부른다. React Hook은 같은 React 인스턴스의 내부 상태를 공유하기 때문에, Host의 React와 Fragment의 React가 다른 인스턴스면 Hook이 다른 컨텍스트에서 실행돼 `Cannot read properties of null (reading 'useState')` 같은 오류가 난다.

공유 스코프(Shared Scope)는 이를 **런타임 버전 협상**으로 푼다. Host가 `__webpack_share_scopes__.default`를 초기화하고, 각 Fragment의 `init()`이 호출될 때 제공 가능한 버전을 등록하면, 모듈 로드 시점에 semver 규칙으로 가장 적합한 버전을 선택한다. `singleton: true`면 스코프 내에서 단일 인스턴스만 허용하고, 버전 충돌 시 `strictVersion` 설정에 따라 경고 또는 에러를 낸다. `requiredVersion`으로 호환 범위를 지정한다. React, react-dom처럼 인스턴스가 하나여야 하는 의존성을 singleton으로 공유한다.

### manifest.json 동적 로딩 — 독립 배포의 완성

Remote URL을 Host의 webpack 설정에 하드코딩하면, Fragment가 새 버전을 배포해 URL이 바뀔 때마다 Host도 재빌드해야 해서 독립 배포의 의미가 퇴색된다. manifest 기반 방식은 Host가 Remote의 실제 URL을 모르고 `manifest.json`의 위치만 안다. 런타임에 manifest를 fetch해 현재 배포된 버전의 실제 URL을 해석하므로, Fragment 팀은 배포 후 manifest만 갱신하고 Host는 다음 로드에서 자동으로 새 버전을 쓴다.

## 면접 체크포인트

- Build-time(빌드 시점 결합, 앱 전체 재배포)과 Run-time(실행 시점 결합, 모듈 독립 배포) 통합의 차이와 계층별 적용 기준(변화율)
- 컨테이너(remoteEntry.js)의 `init`/`get`, exposes/remotes 역할
- 공유 스코프가 푸는 문제(React 다중 인스턴스 → Hook 오류)와 singleton, semver 버전 협상
- manifest.json 동적 로딩이 URL 하드코딩 대비 독립 배포를 완성하는 이유
- iframe, Web Component 대비 Module Federation의 런타임 공유 의존성 협상 우위

## 출처

- 모노레포가 모놀리스가 되지 않으려면 (2편) — 미리캔버스 프론트엔드 팀(종현 김), Medium
- [Micro Frontends — Cam Jackson, martinfowler.com](https://martinfowler.com/articles/micro-frontends.html)

## 관련 문서

- [[Monorepo-Architecture|모노레포 아키텍처 (계층, 변화율, 독립성)]]
- [[Monorepo-CICD|모노레포 CI/CD (빌드 파이프라인, 런타임 의존성 관측)]]
- [[Monolith-vs-Microservice|Monolith vs Microservice (독립 배포의 백엔드판)]]
- [[아키텍처&설계(Architecture&Design)|아키텍처 인덱스]]
