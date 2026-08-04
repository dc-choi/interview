---
tags: [web, frontend, react, vite, eslint, prettier]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["React Tooling", "React 프로젝트 설정"]
---

# React project tooling과 설정

새 React project의 도구 선택은 rendering 방식, routing과 data loading 요구에서 시작한다. React 공식 문서는 새 application에 framework를 먼저 검토하라고 권장한다. client-only SPA나 React 자체를 학습하려는 project는 Vite 같은 build tool로 시작할 수 있다.

## CRA는 신규 app 기본값이 아니다

Create React App은 2025-02-14 신규 app 용도로 deprecated됐다. 기존 CRA app은 maintenance mode에서 계속 동작할 수 있지만 새 project 생성 명령으로 권장하지 않는다. 기존 app은 요구사항에 따라 framework 또는 Vite, Parcel, Rsbuild 같은 build tool로 migration한다.

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Vite의 현재 Node.js 요구 버전은 Vite major마다 바뀔 수 있다. 강의에 고정된 과거 Node version을 그대로 설치하기보다 Vite 공식 compatibility note와 조직이 지원하는 Node LTS를 함께 확인한다. Node version manager와 lockfile로 local, CI의 version을 맞춘다.

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

## 관련 문서

- [[Single-Host-SPA-API-Deployment|SPA build와 배포]]
- [[TS-React-Type-Contracts|React TypeScript 계약]]
- [[TypeScript-Node|Node.js와 TypeScript tooling]]

## 출처

- [React, Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)
- [React, Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [Vite, Getting Started](https://vite.dev/guide/)
- [Vite, Env Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Node.js, Previous Releases](https://nodejs.org/en/about/previous-releases)
- [ESLint, Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Prettier, Integrating with Linters](https://prettier.io/docs/integrating-with-linters)
- IT Share, [Node.js와 VS Code 설치](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161782)
- IT Share, [Create React App project 생성](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161783)
- IT Share, [Create React App 구조](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161784)
- IT Share, [ESLint와 Prettier 설정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161785)
