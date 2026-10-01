---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js ESLint 규칙과 독립 검사", "NextJS-ESLint"]
---

# Next.js ESLint 규칙과 독립 검사

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## ESLint

eslint-config-next는 Next, React와 React Hooks recommended rules를 제공한다. core-web-vitals는 성능 관련 일부 warning을 error로 올린다. TypeScript는 eslint-config-next/typescript를 추가한다. Next.js 16은 next lint와 next.config의 eslint 옵션을 제거했으므로 독립 ESLint CLI/CI step을 사용한다. Pages 문서 metadata의 build-lint 설명은 오래된 표현이며 본문과 16의 변경을 따른다.

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
```

```sh
npx eslint .
```

## 규칙이 보호하는 계약

| 범주 | 주요 rule suffix | 방지하는 문제 |
| --- | --- | --- |
| fonts | google-font-display, google-font-preconnect, no-page-custom-font | font loading과 page별 중복 |
| scripts | inline-script-id, next-script-for-ga, no-sync-scripts | script loading과 inline 식별 |
| script 위치 | no-before-interactive-script-outside-document, no-script-component-in-head | Pages Document/Head 계약 |
| document/head | no-document-import-in-page, no-duplicate-head, no-head-element, no-head-import-in-document, no-title-in-document-head | framework head 처리 우회 |
| navigation/image | no-html-link-for-pages, no-img-element | internal full reload와 image 성능 |
| CSS | no-css-tags, no-styled-jsx-in-document | style pipeline 우회 |
| component/data | no-async-client-component, no-typos | client async와 Pages data function 이름 오류 |
| 기타 | no-assign-module-variable, no-unwanted-polyfillio | module 변수 오염과 중복 polyfill |

전체 rule prefix는 @next/next다. 이 목록은 실행 환경/구성을 검사하는 lint이며 runtime auth, RSC serialization과 실제 Web Vitals 점수를 증명하지 않는다.

## monorepo와 기존 설정 통합

plugin settings의 next.rootDir는 path, glob 또는 배열을 받는다. 앱이 packages/web 아래라면 packages/*/ 같은 범위를 지정한다. flat config는 배열 순서로 적용되어 뒤 matching config가 앞 rule을 override한다. 기존 React/hooks/import parser와 충돌하면 config-next 전체를 중복 등록하기보다 @next/eslint-plugin-next를 직접 통합한다.

```js
settings: { next: { rootDir: ['packages/*/'] } }
```

Prettier 사용 시 eslint-config-prettier를 뒤에 추가해 formatting 충돌을 줄인다. 이는 correctness lint를 없애는 설정이 아니다. lint-staged는 staged file paths를 ESLint command에 전달할 수 있다. 파일 이름 quoting과 plugin 범위를 확인한다.

## 확인

CI에서 eslint 명령이 독립 실행되는지 확인한다. next build 성공을 lint 성공으로 보고하지 않는다. rule 변경은 실제 위반/정상 예제로 확인하고, disable은 프로젝트가 그 contract를 다른 방식으로 충족하는지 설명한다. accessibility는 [[NextJS-Accessibility]]에서 실제 keyboard/screen-reader 확인까지 연결한다.

## 규칙별 진단의 정확한 대상

| @next/next rule suffix | 구체적 진단 |
| --- | --- |
| google-font-display | Google Fonts font-display |
| google-font-preconnect | Google Fonts preconnect 누락 |
| inline-script-id | inline next/script의 id 누락 |
| next-script-for-ga | inline GA에 next/script 권장 |
| no-assign-module-variable | module 변수 assignment |
| no-async-client-component | async Client Component |
| no-before-interactive-script-outside-document | Pages beforeInteractive의 _document 위치 |
| no-css-tags | 수동 stylesheet tag |
| no-document-import-in-page | _document 밖 next/document import |
| no-duplicate-head | _document의 중복 Head |
| no-head-element | 직접 head element |
| no-head-import-in-document | _document의 next/head import |
| no-html-link-for-pages | internal page에 a 대신 Link |
| no-img-element | img의 LCP/bandwidth 비용 |
| no-page-custom-font | page만의 custom font |
| no-script-component-in-head | next/head 안 next/script |
| no-styled-jsx-in-document | _document의 styled-jsx |
| no-sync-scripts | synchronous script |
| no-title-in-document-head | next/document Head 안 title |
| no-typos | Pages data function 이름 typo |
| no-unwanted-polyfillio | Polyfill.io 중복 polyfill |

모두 recommended config에 포함된다. beforeInteractive 규칙의 _document 표현은 Pages 위치를 설명하며 App root layout 계약을 대신하지 않는다. lint와 실제 성능은 별개이므로 img 경고가 모든 상황의 무조건적인 component 교체 요구는 아니다.

## flat config의 설치, override와 직접 plugin

npm install -D eslint eslint-config-next 후 npx eslint .로 실행한다. pnpm exec eslint ., yarn eslint ., bunx eslint .는 같은 검사 경로다. core-web-vitals는 신규 create-next-app에 자동 포함되며 TypeScript 선택 시 next/typescript도 추가한다. TypeScript rules는 typescript-eslint recommended 기반이다. globalIgnores에는 .next/**, out/**, build/**, next-env.d.ts의 기본 산출물 제외를 명시한다.

rules:{'react/no-unescaped-entities':'off','@next/next/no-page-custom-font':'off'} 같은 matching object를 config 뒤에 놓으면 선택한 규칙을 변경한다. Prettier는 eslint-config-prettier를 dev dependency로 설치하고 eslint-config-prettier/flat을 Next config 뒤에 추가한다.

~~~js
import nextPlugin from '@next/eslint-plugin-next'
export default [{
  files: ['**/*.{js,jsx,ts,tsx}'],
  plugins: { '@next/next': nextPlugin },
  rules: { ...nextPlugin.configs.recommended.rules },
  settings: { next: { rootDir: 'packages/my-app/' } },
}]
~~~

rootDir는 relative/absolute path, glob, 그 혼합 배열 모두 가능하다. airbnb/react-app 등 기존 config가 react/react-hooks/jsx-a11y/import를 등록했거나 custom Babel parserOptions, import plugin의 Node/TS resolver가 이미 있으면 직접 plugin 방식으로 collision을 줄인다. 간단한 기존 config는 ...nextConfig를 추가해 file patterns/plugins/rules/ignores/parser 설정을 함께 가져온다.

lint-staged 예시는 '*.{js,jsx,ts,tsx}' 파일 목록을 path.relative(process.cwd(),f)로 바꾸고 각 파일을 quote해 eslint --fix command에 전달한다. 이는 staged 파일만 선택하는 계약이며 전체 CI lint를 대신하지 않는다. 16.0에 next lint와 next.config.eslint가 제거됐고 ESLint CLI migration codemod가 제공된다.

## 출처

- [Next.js, app/api-reference/config/eslint](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Next.js, pages/api-reference/config/eslint](https://nextjs.org/docs/pages/api-reference/config/eslint)

## 관련 문서

- [[NextJS-TypeScript]]
- [[NextJS-Accessibility]]
- [[NextJS-CLI]]
