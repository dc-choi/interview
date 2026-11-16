---
tags: [architecture, micro-frontend, module-federation, webpack, deployment]
status: done
verified_at: 2026-09-03
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Module Federation", "모듈 페더레이션", "Micro Frontend", "마이크로 프론트엔드", "Build-time Run-time Integration", "런타임 통합"]
---

# Module Federation과 마이크로 프론트엔드 런타임 통합

여러 독립 모듈을 하나의 사용자 경험으로 합치는 방식은 **결합 시점**에 따라 Build-time과 Run-time으로 갈린다. Module Federation은 Webpack 5에서 시작했지만 현재는 Rspack, Vite, Rsbuild, Metro 등 여러 도구가 지원하는 런타임 모듈 공유 규약으로 확장됐으며, Run-time 통합과 독립 배포를 가능하게 한다.

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
| Module Federation | 모듈 단위 | 런타임 독립 | 원격 모듈 노출에는 지원 빌드 플러그인이 필요하고, Runtime 전용 소비에는 불필요 |

Module Federation은 런타임 동적 공유에 더해 **공유 의존성 협상**까지 제공해 앞선 방식들의 한계를 넘는다.

## Module Federation 핵심 (Webpack 5 구성 예시)

### Container — remoteEntry.js

Module Federation으로 빌드된 각 Remote는 `remoteEntry.js`라는 진입점을 만든다. 이 파일이 컨테이너(Container)이며 두 API를 노출한다. `init(shareScope)` 는 Host가 준비한 공유 스코프를 Remote에 주입하고, `get(moduleName)` 은 특정 모듈을 비동기로 반환한다. Host는 부팅 단계에서 자신의 공유 모듈을 shareScope에 등록해두고, Remote의 `remoteEntry.js`를 동적 로드한 뒤 `init`으로 스코프를 넘기고 `get('./EditorFragment')`로 실제 컴포넌트를 가져온다. Remote는 `exposes`로 노출할 모듈을, Host는 `remotes`로 참조할 Remote를 선언한다.

### Shared Scope — 공유 의존성의 런타임 협상

Host와 여러 Fragment가 각자 React를 번들에 포함하면 메모리에 React가 여러 개 로드된다. 이것은 단순한 용량 낭비가 아니라 런타임 오류를 부른다. React Hook은 같은 React 인스턴스의 내부 상태를 공유하기 때문에, Host의 React와 Fragment의 React가 다른 인스턴스면 Hook이 다른 컨텍스트에서 실행돼 `Cannot read properties of null (reading 'useState')` 같은 오류가 난다.

공유 스코프(Shared Scope)는 이를 **런타임 버전 협상**으로 푼다. Host가 `__webpack_share_scopes__.default`를 초기화하고, 각 Fragment의 `init()`이 호출될 때 제공 가능한 버전을 등록하면, 모듈 로드 시점에 semver 규칙으로 가장 적합한 버전을 선택한다. `singleton: true`면 스코프 내에서 단일 인스턴스만 허용하고, 버전 충돌 시 `strictVersion` 설정에 따라 경고 또는 에러를 낸다. `requiredVersion`으로 호환 범위를 지정한다. React, react-dom처럼 인스턴스가 하나여야 하는 의존성을 singleton으로 공유한다.

### manifest.json 동적 로딩 — 독립 배포의 완성

Remote URL을 Host의 webpack 설정에 하드코딩하면, Fragment가 새 버전을 배포해 URL이 바뀔 때마다 Host도 재빌드해야 해서 독립 배포의 의미가 퇴색된다. manifest 기반 방식은 Host가 Remote의 실제 URL을 모르고 `manifest.json`의 위치만 안다. 런타임에 manifest를 fetch해 현재 배포된 버전의 실제 URL을 해석하므로, Fragment 팀은 배포 후 manifest만 갱신하고 Host는 다음 로드에서 자동으로 새 버전을 쓴다.

## 운영 중인 앱에 점진 도입하기

부분 검증(2026-11-15): 아래의 webpack 동작은 webpack Module Federation 개념 문서와 플러그인 문서로 확인했다. 사례로 적은 내용은 발표 기준이며, 문서의 나머지 도구 지원 범위는 다시 대조하지 않아 `verified_at`은 유지한다.

자주 드는 구조는 얇은 Shell을 Host로 두고 모든 기능을 Remote로 불러오는 형태다. webpack 문서의 페이지별 분리 빌드 예시도 같다. 각 페이지를 별도 빌드에서 노출하고, Shell은 모든 페이지를 Remote로 참조하며 공통 라이브러리를 shared로 정해 중복을 막는다. Shell은 라우트가 바뀌거나 추가될 때 배포한다. 이 구조는 공유 라이브러리 버전 맞추기, 로컬 개발 환경, Remote마다 맡을 기능 팀을 함께 요구한다. 발표자는 그래서 큰 규모에서만 맞는다는 의견이 나올 수 있다고 봤다.

운영 중인 단일 앱은 서비스를 멈추고 이 구조로 다시 조립하기 어렵다. 발표 사례의 팀은 기존 앱을 그대로 Host로 두고 기능을 하나씩 Remote로 떼어 냈고, 새로 생기는 기능은 처음부터 Remote로 만들었다. 이는 레거시 시스템을 점진적으로 대체하는 Strangler Fig 방식을 프론트엔드에 적용한 것으로 볼 수 있다(해석, [[Legacy-Modernization-Strategies|레거시 현대화 전략]]). 떼어 낼 때는 세 가지를 정해야 한다.

**1. Host와 Remote 사이의 계약.** 떼어 낸 기능도 현재 채널 같은 Host의 맥락이 필요하다.

- **props로 넘기기:** 가장 단순하지만 Remote가 Host에서 받아야 할 데이터가 바뀌면 props를 넘기는 Host 코드도 고쳐 배포해야 한다. 발표 사례는 이를 독립 배포라는 도입 목적과 충돌한다고 봤다.
- **Host가 hook이나 함수를 expose하기:** webpack 문서에서 각 빌드는 컨테이너이면서 다른 컨테이너의 소비자이고, 컨테이너 사이의 순환 참조도 허용된다. 그래서 Host가 `exposes`로 맥락 조회 hook을 노출하고 Remote가 `remotes`로 Host를 참조해 가져다 쓰는 양방향 구성이 가능하다. webpack 문서는 이런 양방향 Host가 진입점을 비동기 경계(bootstrap 동적 import) 뒤에 두지 않으면 shared 모듈의 eager consumption 오류가 난다고 설명한다. 노출 목록은 API 계약처럼 관리한다. 아직 노출하지 않은 맥락이 새로 필요하면 Host 변경과 배포가 여전히 필요하므로, expose는 Host 배포를 없애는 것이 아니라 계약이 바뀔 때로 줄인다.

**2. 경계에 남는 코드.**

- **Host에 남은 Remote 전용 코드:** 기능을 떼어 내면 Host가 더 이상 쓰지 않는 UI 컴포넌트가 남는다. 한 Remote만 쓰면 그 Remote로 옮기고, 여러 Remote가 쓰면 패키지로 뺀다. 패키지는 초기 구성, 레지스트리 게시와 버전 관리 비용이 커서, 발표 사례의 팀은 방향만 정해 두고 여유가 생길 때 옮기기로 했다.
- **Remote A의 컴포넌트를 Remote B가 쓸 때:** A를 B의 Remote로 직접 참조하거나, A의 컴포넌트를 패키지로 배포하거나, A가 Host에 제공한 것을 Host가 다시 B에 넘기는 방법 등이 있다. 발표 사례의 팀은 패키지 비용을 피하려고 마지막 방식을 골랐다. 이 방식은 Host가 출처를 감춘 중개 계층이 된다.

**3. shared 계약은 두 기준으로 정한다.**

- **반드시 하나여야 하는 의존성:** webpack 문서는 React, react-dom처럼 전역 내부 상태를 쓰는 라이브러리는 한 번에 하나의 인스턴스만 실행돼야 한다고 설명한다. 이런 의존성은 `singleton: true`로 공유한다. 발표 사례에서는 IndexedDB를 다루는 라이브러리도 Host와 Remote가 같은 모듈을 참조하도록 singleton으로 묶었다.
- **반드시 나뉘어야 하는 의존성:** shared 모듈은 먼저 공유 스코프에서 조건에 맞는 버전을 찾고, 없으면 각 빌드가 가진 fallback 사본을 쓴다. singleton이 아니면 각 소비자가 자기 `requiredVersion`을 만족하는 가장 높은 버전을 고르므로 같은 버전으로 귀결될 때만 인스턴스를 함께 쓰고, 하나를 보장하는 것은 `singleton: true`뿐이다. shared에서 뺀 라이브러리는 각 빌드의 로컬 모듈로 남아 모듈 수준 상태도 빌드마다 따로 있다. 따라서 인스턴스를 합치면 안 되는 라이브러리는 shared에서 뺀다. 발표 사례의 소켓 라이브러리는 설정이 같은 연결을 내부에서 하나로 합쳤다. 생명주기가 다른 두 기능의 연결이 하나로 묶여, 끊어야 할 연결이 유지되고 이벤트가 중복 발행됐다. 그래서 이 패키지는 공유하지 않는다고 명시했다.

얻는 효과는 기능별 저장소의 독립 CI와 배포다. 발표 사례에서는 기능 팀 저장소에 백엔드와 Remote 프론트엔드를 함께 두면서, 큰 단일 앱의 긴 CI를 기다리지 않게 됐다. LLM에 개발 맥락을 주기도 쉬워졌다.

재작성 기간에 구 앱과 신 앱이 같은 기능을 함께 쓰는 데도 런타임 통합을 쓸 수 있다. X는 2026-11-04 공식 엔지니어링 블로그에서 기존 웹 앱과 새 앱이 모두 chat.x.com이 배포하는 X Chat을 Module Federation으로 실행 시점에 불러와, 전환 중에도 두 앱이 같은 채팅을 실행한다고 설명했다. 새 앱은 X Calls와 Money도 같은 방식으로 불러오면서 페이지의 React와 공유 라이브러리를 Money에 빌려줘 첫 Money 페이지의 코드 다운로드를 gzip 기준 590KB에서 509KB로 줄였다고 밝혔다. 두 앱이 import하는 analytics 같은 코드는 별도 공유 패키지로 남겼다. 공존 기간에 공통 기능을 양쪽에 다시 만들지 않는 방법이 된다(해석, [[Shadow-Traffic#언제 Shadow, 언제 Canary|재작성 검증과 전환 사례]]).

## 면접 체크포인트

- 운영 중인 앱을 Host로 두고 기능을 Remote로 떼어 낼 때 props 계약 대신 Host expose를 택하는 이유와 그래도 남는 Host 배포 조건,, shared에 넣을 의존성과 빼야 할 의존성의 기준
- Build-time(빌드 시점 결합, 앱 전체 재배포)과 Run-time(실행 시점 결합, 모듈 독립 배포) 통합의 차이와 계층별 적용 기준(변화율)
- 컨테이너(remoteEntry.js)의 `init`/`get`, exposes/remotes 역할
- 공유 스코프가 푸는 문제(React 다중 인스턴스 → Hook 오류)와 singleton, semver 버전 협상
- manifest.json 동적 로딩이 URL 하드코딩 대비 독립 배포를 완성하는 이유
- iframe, Web Component 대비 Module Federation의 런타임 공유 의존성 협상 우위

## 출처

- 모노레포가 모놀리스가 되지 않으려면 (2편) — 미리캔버스 프론트엔드 팀(종현 김), Medium
- [Micro Frontends — Cam Jackson, martinfowler.com](https://martinfowler.com/articles/micro-frontends.html)
- [Module Federation, Integrations](https://module-federation.io/integrations)
- [Module Federation, Runtime Access](https://module-federation.io/guide/runtime/)
- [Module Federation, Shared](https://module-federation.io/configure/shared)
- [webpack, Module Federation](https://webpack.js.org/concepts/module-federation/)
- [webpack, ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/)
- [Module Federation 도입기 — 채널데브톡, 채널데브세션](https://www.youtube.com/watch?v=wuD-tWILgbs)
- [Rebuilding the global town square from scratch — Yagiz Nizipli, X Engineering Blog](https://blog.x.com/en/engineering/rebuilding-the-global-town-square-from-scratch) — 2026-11-04 게시. 다운로드 감소량은 X의 자체 측정
- [X.com을 처음부터 다시 구축하기 - 서버 3개를 하나로 — GeekNews](https://news.hada.io/topic?id=37245)

## 관련 문서

- [[Monorepo-Architecture|모노레포 아키텍처 (계층, 변화율, 독립성)]]
- [[Monorepo-CICD|모노레포 CI/CD (빌드 파이프라인, 런타임 의존성 관측)]]
- [[Monolith-vs-Microservice|Monolith vs Microservice (독립 배포의 백엔드판)]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략 (Strangler Fig)]]
- [[아키텍처&설계(Architecture&Design)|아키텍처 인덱스]]
