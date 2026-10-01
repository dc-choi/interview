---
tags: [web, frontend, react, vite, eslint, prettier]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Tooling", "React 프로젝트 설정"]
---

# React project tooling과 설정

새 React project의 도구 선택은 rendering 방식, routing과 data loading 요구에서 시작한다. React 공식 문서는 새 application에 framework를 먼저 검토하라고 권장한다. client-only SPA나 React 자체를 학습하려는 project는 Vite 같은 build tool로 시작할 수 있다.

## 시작 방식과 도구의 책임

간단한 개념 실습은 공식 문서의 sandbox로 시작할 수 있다. 로컬 앱을 만들 때는 다음 경계를 구분한다.

| 상황 | 시작 방식 | 직접 책임질 부분 |
|---|---|---|
| 문법과 상태 실험 | 온라인 sandbox | 코드를 바꿔 결과 확인, 타입 검사 지원 여부 확인 |
| 새 웹 서비스 | Next.js App Router, React Router framework 등 검토 | 배포 환경, route별 렌더링, 데이터 계약 |
| 기본기 학습이나 framework가 맞지 않는 제약 | Vite, Parcel, Rsbuild | routing, fetching, cache, code splitting의 통합 |
| 기존 사이트 일부 교체 | 특정 DOM 영역이나 하위 route에 도입 | 기존 페이지와의 소유 경계, 경로와 자산 배포 |
| 네이티브 앱 | Expo와 React Native 검토 | 웹 DOM과 다른 native UI, 기기 기능과 배포 |

Framework를 고른다고 반드시 요청마다 실행되는 서버가 필요한 것은 아니다. CSR이나 정적 출력이 가능한지와 기능 제한을 확인하면 정적 호스팅으로도 시작할 수 있다. SSR, SSG와 Server Components는 서로 다른 선택이며, 필요할 때 route별 전략과 router를 함께 맞춘다. React Native를 직접 구성할 때의 bundler는 Metro이며 웹용 Vite 설정을 그대로 사용하지 않는다.

Build tool은 개발 서버와 번들 생성을 제공하지만 앱의 데이터 로딩 전략까지 완성하지 않는다. `코드 다운로드 → component render → fetch`가 route마다 이어지면 waterfall이 생긴다. route loader나 서버에서 데이터 요청을 앞당기고 code splitting과 함께 설계한다. `lazy`만 넣었다고 로딩이 빨라지는 것은 아니다.

## 기존 페이지에 점진적으로 추가하기

기존 프로젝트의 import/export와 JSX 변환 환경이 있으면 먼저 재사용한다. 없으면 기존 backend와 연결되는 build 환경을 구성하고 `react`, `react-dom`을 추가한다. React가 관리할 전용 DOM container만 root로 사용한다.

```jsx
import { createRoot } from "react-dom/client";

const container = document.getElementById("account-menu");
if (!container) throw new Error("account-menu container is missing");
createRoot(container).render(<AccountMenu />);
```

이 코드는 기존 페이지에 빈 `account-menu` container가 있고 `AccountMenu`를 import한 진입점의 예시다. 주변 HTML을 지우거나 같은 container를 기존 코드와 React 양쪽에서 수정하지 않는다. 페이지의 독립된 여러 영역에 root를 둘 수도 있다.

하위 URL 전체를 React로 옮기면 framework의 base path와 서버 또는 proxy의 route 전달을 함께 설정한다. 서버 실행이 필요 없는 구성은 해당 경로에 정적 산출물을 제공할 수 있다. React Native의 기존 Android/iOS 앱 통합은 웹 root API와 다른 절차다.

## CRA는 신규 app 기본값이 아니다

Create React App은 2025-02-14 신규 app 용도로 deprecated됐다. 기존 CRA app은 maintenance mode에서 계속 동작할 수 있지만 새 project 생성 명령으로 권장하지 않는다. 기존 app은 요구사항에 따라 framework 또는 Vite, Parcel, Rsbuild 같은 build tool로 migration한다.

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Vite의 현재 Node.js 요구 버전은 Vite major마다 바뀔 수 있다. 강의에 고정된 과거 Node version을 그대로 설치하기보다 Vite 공식 compatibility note와 조직이 지원하는 Node LTS를 함께 확인한다. Node version manager와 lockfile로 local, CI의 version을 맞춘다.

## Vite 개발 서버와 production build

Vite 개발 서버가 빨리 뜨는 이유는 bundler 이름이 아니라 작업을 나누는 방식에 있다.

- 잘 바뀌지 않는 dependency는 처음 한 번 pre-bundle한다. CommonJS와 UMD package를 ESM으로 바꾸고, 내부 module이 많은 package를 하나로 묶어 browser 요청 수를 줄인다. 이 단계는 개발 mode에만 적용된다.
- 자주 바뀌는 source code는 native ESM으로 제공하고 browser가 요청한 file만 그때 변환한다. 앱 전체를 먼저 묶는 bundle 기반 개발 서버보다 시작 시간이 앱 크기에 덜 비례한다.
- production은 여전히 bundle한다. 중첩 import마다 network 왕복이 생기는 unbundled ESM을 그대로 배포하면 비효율적이다.

Vite 7 이하는 개발 변환에 esbuild, production bundle에 Rollup을 쓰는 두 pipeline이었고, Vite 문서는 이 구조가 변환 동작과 plugin 체계의 불일치를 쌓았다고 설명한다. 2026-03-12 출시된 Vite 8은 Rust 기반 Rolldown을 단일 bundler로 쓰고 parsing과 변환에 Oxc를 사용하며 Node.js 20.19+ 또는 22.12+를 요구한다. 개발 서버의 기본은 여전히 unbundled ESM이고, 개발 중에도 bundle하는 full bundle mode는 실험 단계다. Vite를 Rollup 기반 도구로 설명하는 자료는 Vite 7 이하의 production build에만 해당한다.

개발 서버와 build 경로가 다르므로 `npm run dev` 성공을 배포 근거로 쓰지 않는다. CI에서 `vite build`를 실행하고 build 산출물로 smoke test를 돌린다. `vite preview`는 build 결과를 local에서 확인하는 도구이며 production server로 쓰지 않는다([[Single-Host-SPA-API-Deployment|SPA build와 배포]]).

## entrypoint와 project structure

Vite React template은 보통 `index.html`, `src/main.*`, root component에서 시작한다. 폴더 이름보다 dependency direction과 feature ownership이 중요하다.

```text
src/
  app/         app 조립, provider와 router
  features/    use case별 UI, state와 API
  shared/      여러 feature가 실제로 공유하는 component와 utility
```

CRA의 `react-scripts`, `eject`, `REACT_APP_*` 규칙을 Vite에 그대로 옮기지 않는다. Vite client env는 기본적으로 `VITE_*`만 노출하며 build output에 포함되므로 secret을 저장할 수 없다. public asset, CSS, test와 production build 경로도 migration guide에 맞춰 확인한다.

## ESLint와 Prettier의 책임

- ESLint는 syntax, bug pattern, React Hooks 규칙과 project convention을 검사한다.
- Prettier는 formatting을 정규화한다.
- 같은 style rule을 두 도구가 경쟁하지 않도록 formatting rule 충돌을 끈다.
- editor save action만 믿지 않고 CI에서 `lint`와 format check를 실행한다.

현재 ESLint ecosystem은 flat config를 중심으로 이동했으며 plugin version에 따라 설정 형식이 다르다. 예전 `package.json`의 `eslintConfig`를 복사하기보다 설치한 ESLint와 React Hooks plugin의 공식 설정을 따른다. import 자동 정렬도 formatter, ESLint plugin 중 한 책임자로 정한다.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "format:check": "prettier . --check"
  }
}
```

## 개발 도구로 관찰하기

Editor는 JSX/TSX 지원, 자동 완성, Hooks lint와 저장 시 formatting을 맞춘다. `eslint-plugin-react-hooks`로 호출 규칙과 의존성을 검사한다. 오래된 CRA preset 예시를 현재 프로젝트에 그대로 복사하지 않고 설치한 도구의 설정을 따른다.

React Developer Tools의 Components에서는 component tree, props와 state를 확인하고 Profiler에서는 render 비용을 관찰한다. 브라우저의 Elements 탭은 DOM tree를 보여 주므로 두 트리가 같은 것으로 해석하지 않는다. Chrome, Firefox와 Edge 확장을 사용할 수 있고 Safari 등은 standalone `react-devtools`와 개발 페이지의 `http://localhost:8097` 연결 script를 사용한다. 이 script는 개발 중 연결용이다. React Native 0.76 이상은 통합 React Native DevTools를 확인하고 이전 버전은 standalone 구성을 확인한다.

TypeScript 설정은 [[TS-React-Type-Contracts#설정과 타입 검사|타입 검사]], 자동 memoization 설정과 적용 확인은 [[React-Compiler|React Compiler]]에서 이어진다. 패키지가 설치됐다는 사실만으로 변환이나 최적화가 적용됐다고 판단하지 않는다.

## 이해 확인

- 학습용 Vite 앱에 페이지가 늘면 routing, fetching과 code splitting 중 무엇을 함께 설계해야 하는가?
- 기존 서버 페이지에 React 메뉴 하나를 넣을 때 어떤 DOM 영역을 React에 넘겨야 하는가?
- 개발 서버에서 화면이 보이는 것, 타입 검사 통과, production build 성공은 각각 무엇을 확인하는가?

## 관련 문서

- [[Single-Host-SPA-API-Deployment|SPA build와 배포]]
- [[TS-React-Type-Contracts|React TypeScript 계약]]
- [[TypeScript-Node|Node.js와 TypeScript tooling]]

## 출처

- [React, Installation](https://react.dev/learn/installation)
- [React, Creating a React App](https://react.dev/learn/creating-a-react-app)
- [React, Add React to an Existing Project](https://react.dev/learn/add-react-to-an-existing-project)
- [React, Setup](https://react.dev/learn/setup)
- [React, Editor Setup](https://react.dev/learn/editor-setup)
- [React, React Developer Tools](https://react.dev/learn/react-developer-tools)

- [React, Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)
- [React, Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [Vite, Getting Started](https://vite.dev/guide/)
- [Vite, Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vite, Why Vite](https://vite.dev/guide/why)
- [Vite, Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling)
- [Vite, Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)
- [Vite, Command Line Interface](https://vite.dev/guide/cli)
- [Node.js, Previous Releases](https://nodejs.org/en/about/previous-releases)
- [ESLint, Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier, Integrating with Linters](https://prettier.io/docs/integrating-with-linters)
- IT Share, [Node.js와 VS Code 설치](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161782)
- IT Share, [Create React App project 생성](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161783)
- IT Share, [Create React App 구조](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161784)
- IT Share, [ESLint와 Prettier 설정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161785)
- Kenu 허광남, [SPA 개발 환경 구성 (1)](https://www.inflearn.com/courses/lecture?courseId=328553&unitId=106866)
