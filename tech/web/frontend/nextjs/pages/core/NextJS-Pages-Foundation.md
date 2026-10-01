---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 파일과 실행 경계", "NextJS Pages Foundation"]
---

# Pages Router의 파일과 실행 경계

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 페이지 파일이 URL이 되는 모델

Next.js 13 이전에는 Pages Router가 주된 routing 모델이었다. 이후 버전에서도 지원하며 React 최신 기능을 활용하는 App Router로의 전환을 공식 문서가 권장한다. 버전 upgrade와 Router migration은 별도 단계다.

Pages Router는 `pages/`의 기본 export React 컴포넌트를 경로로 등록한다. `.js`, `.jsx`, `.ts`, `.tsx`를 지원한다. 경로 파일과 재사용 컴포넌트를 구분해야 한다. App Router의 `page.tsx`, `layout.tsx` 파일 규칙을 그대로 적용하지 않는다.

| 파일 | URL 또는 역할 |
| --- | --- |
| `pages/index.tsx` | `/` |
| `pages/blog/index.tsx` | `/blog` |
| `pages/blog/first.tsx` | `/blog/first` |
| `pages/shop/[id].tsx` | `/shop/42` |
| `pages/api/items.ts` | `/api/items`, HTTP endpoint |
| `_app.tsx` | 페이지 초기화, 공유 UI |
| `_document.tsx` | 서버 HTML 외곽 구조 |
| `_error.tsx`, `404.tsx`, `500.tsx` | 오류 처리 |

`src/pages/`로 소스를 모을 수 있다. 루트 `pages/`가 있으면 `src/pages/`는 무시된다. `public`, `package.json`, `next.config.*`, `.env.*`는 프로젝트 루트에 둔다. import alias의 `paths`는 설정한 `baseUrl`을 기준으로 한다.

`public/profile.png`는 `/profile.png`로 접근한다. 기본 정적 파일 응답은 `Cache-Control: public, max-age=0`이다. 빌드 시점에 존재하는 정적 파일을 대상으로 하며 런타임 업로드 저장소로 사용하지 않는다. 페이지와 같은 URL을 충돌시키지 않는다.

## 설치와 도구의 기준

Node.js 최소 20.9, TypeScript 최소 5.1.0을 요구한다. 브라우저 기본 지원 기준은 Chrome/Edge 111+, Firefox 111+, Safari 16.4+다. Pages Router는 `package.json`에 설치한 React 버전을 사용한다.

```bash
npm install next@latest react@latest react-dom@latest
npm run dev
```

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

`create-next-app`의 권장 기본값은 App Router다. Pages를 선택하려면 사용자 지정 질문에서 App Router를 끈다. 소스 alias, TypeScript, ESLint/Biome, React Compiler, Tailwind와 `src` 사용은 별도 선택이다. 이 예시는 실제 프로젝트 생성 지시가 아니다.

Next.js 16의 `next build`는 lint를 자동 실행하지 않는다. lint를 CI의 독립 단계로 실행한다. `next lint`를 사용하는 과거 스크립트는 ESLint CLI로 전환한다. 개발과 빌드는 Turbopack이 기본이며 필요하면 `--webpack`을 명시한다.

## 최소 프로젝트와 소스 배치 절차

Pages로 시작할 때 CLI의 customize settings에서 App Router를 No로 선택한다. 권장 기본값은 TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md이며 이전 설정 재사용도 선택할 수 있다. React Compiler, Biome/None, import alias와 AGENTS.md 포함은 각각의 질문이다.

```bash
npx create-next-app@latest
npm run dev
```

`http://localhost:3000`에서 확인하고 `pages/index.tsx`를 수정하면 개발 갱신을 확인한다. 수동 설치는 next/react/react-dom 의존성, dev/build/start/lint scripts, `pages/index.tsx` default export 순서로 구성한다. shared App/Document 파일은 [[NextJS-Pages-Layouts]]의 코드를 사용한다.

```tsx
// pages/index.tsx
export default function Page() { return <h1>Next.js 시작</h1> }
```

macOS, Windows(WSL 포함), Linux를 지원한다. TypeScript 파일을 `.ts`/`.tsx`로 바꾼 뒤 `next dev`를 실행하면 필요한 dependency와 권장 tsconfig가 설정된다. ESLint는 명시적인 `eslint.config.mjs` 등을 두고 `lint:fix: eslint --fix`, Biome은 `lint: biome check`, `format: biome format --write`로 직접 실행한다.

```bash
npx @next/codemod@canary next-lint-to-eslint-cli .
npx next upgrade
```

upgrade는 설치한 패키지와 그 안의 `node_modules/next/dist/docs/`도 갱신한다. 버전에 맞는 문서를 읽고 release 변화와 project diff를 확인한다. preview 문서의 기능을 현재 stable 지원으로 단정하지 않는다.

루트 설정 파일은 `next.config.*`, package.json, tsconfig/jsconfig, eslint config, `.gitignore`, `.env*`, `next-env.d.ts`다. instrumentation과 proxy는 application 소스 convention에 따라 root 또는 src에 둔다. 환경변수 파일과 generated next-env.d.ts는 Git에 기록하지 않는 기준으로 다룬다. 기존 tracked 정책과 다른 경우 무조건 삭제하지 말고 실제 repository 설정을 확인한다.

```json
{
  "compilerOptions": {
    "baseUrl": "src/",
    "paths": {
      "@/styles/*": ["styles/*"],
      "@/components/*": ["components/*"]
    }
  }
}
```

`src/pages`로 옮길 때 components/lib와 Proxy도 src 기준으로 옮기고 alias를 갱신한다. Tailwind v3 content에도 src를 포함한다. 페이지 파일과 `[folder]/index.tsx` 형태는 같은 route 구조를 표현할 수 있고 `[...folder]/index.tsx`, `[[...folder]]/index.tsx`도 각각 catch-all/optional 규칙이다.

`public`은 이미지 외에도 robots.txt, favicon.ico, site verification 파일과 `.html`을 제공한다. `public/avatars/me.png`는 `/avatars/me.png`이며 `<Image src="/avatars/me.png" alt="프로필" width={64} height={64} />`로 표시한다. 같은 경로의 page 파일이 있으면 충돌 오류가 난다.

## 학습 확인

- `pages/shop/index.tsx`와 `pages/shop/page.tsx`의 URL이 왜 다른지 설명한다.
- `src/pages`로 옮겨도 루트에 남아야 하는 파일을 찾는다.
- 빌드 통과와 lint 통과를 별도로 확인한다.

## 출처

- [Next.js, pages](https://nextjs.org/docs/pages)
- [Next.js, getting-started](https://nextjs.org/docs/pages/getting-started)
- [Next.js, installation](https://nextjs.org/docs/pages/getting-started/installation)
- [Next.js, project-structure](https://nextjs.org/docs/pages/getting-started/project-structure)
- [Next.js, guides](https://nextjs.org/docs/pages/guides)
- [Next.js, building-your-application](https://nextjs.org/docs/pages/building-your-application)
- [Next.js, routing](https://nextjs.org/docs/pages/building-your-application/routing)
- [Next.js, configuring](https://nextjs.org/docs/pages/building-your-application/configuring)
- [Next.js, api-reference](https://nextjs.org/docs/pages/api-reference)
- [Next.js, components](https://nextjs.org/docs/pages/api-reference/components)
- [Next.js, file-conventions](https://nextjs.org/docs/pages/api-reference/file-conventions)
- [Next.js, public-folder](https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder)
- [Next.js, src-folder](https://nextjs.org/docs/pages/api-reference/file-conventions/src-folder)
- [Next.js, functions](https://nextjs.org/docs/pages/api-reference/functions)

## 관련 문서

- [[NextJS-Pages-Layouts]]
- [[NextJS-Pages-Rendering]]
