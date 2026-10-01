---
tags: [nextjs, app-router, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js App Router 시작과 실행 환경"]
---

# Next.js App Router 시작과 실행 환경

## App Router의 책임

App Router는 파일 시스템 라우팅, React Server Components, 서버 HTML/RSC 렌더링, 스트리밍, 데이터 캐시와 mutation을 함께 조정한다. React 자체의 상태, Effect, Hook 원리는 [[React-Core-Mental-Model]], [[React-Server-Components]], [[React-Server-Functions]]를 먼저 참조한다. Next.js에 대한 학습은 URL이 어떤 파일을 실행하고, 요청 데이터가 어느 경계에서 읽히며, 결과가 어디에 저장되는지를 추적하는 데 초점을 둔다.

2026-10-01 공식 문서 기준으로 정리한다. 소스 페이지의 버전 표기는 16.3.8과 16.3.6 등이 섞여 있다. 설치한 버전의 동작은 그 패키지에 포함된 문서와 실제 build/start로 별도 검증한다.

## 설치와 실행 계약

```bash
pnpm create next-app@latest my-app --yes
cd my-app
pnpm dev
```

`--yes`는 저장된 선호 또는 기본값으로 질문을 생략한다. 권장 기본값은 TypeScript, Tailwind CSS, ESLint, App Router, Turbopack, `@/*` alias와 에이전트용 `AGENTS.md`/참조 `CLAUDE.md`다. 사용자 선택 시 Biome/ESLint/없음, React Compiler, src 구조 등을 조정한다.

- 최소 Node.js는 20.9, TypeScript는 5.1.0이다. macOS, Linux, Windows/WSL을 지원한다.
- 기본 브라우저 범위는 Chrome/Edge 111+, Firefox 111+, Safari 16.4+다. 더 오래된 브라우저는 별도 타깃/폴리필 검토가 필요하다.
- 수동 설치는 `next`, `react`, `react-dom`을 선언한다. App Router는 내장 React canary를 쓰며 안정 React 19 기능을 포함하지만 생태계/도구 호환용 React 의존성 선언은 유지한다. Pages Router는 package.json의 React를 사용한다.

```json
{"scripts":{"dev":"next dev","build":"next build","start":"next start","lint":"eslint"}}
```

`next dev`와 `next build`의 기본 bundler는 Turbopack이다. Webpack이 필요한 구성은 `--webpack`을 명시한다. 프로덕션 서버는 먼저 build한 뒤 start한다.

## 최소 파일과 개발 도구

`app/page.tsx`는 `/`의 페이지이고 `app/layout.tsx`는 root layout이다. root layout은 `<html>`과 `<body>`가 필요하다. 빠뜨리면 dev가 자동 생성할 수 있지만 저장소의 명시적 파일로 관리한다. root layout에 head 태그를 수작업으로 모으기보다 Metadata API를 쓴다.

`.ts`/`.tsx`로 전환하고 dev를 실행하면 필요한 TypeScript 의존성과 tsconfig가 생성된다. VS Code TypeScript plugin은 Workspace Version을 선택해 활성화한다. `PageProps`, `LayoutProps`, `RouteContext`는 dev/build/typegen이 생성하는 전역 타입이며 import하지 않는다.

`baseUrl`과 `paths`는 tsconfig/jsconfig에서 지원한다. `baseUrl: "src/"`이면 alias 경로는 그 디렉터리를 기준으로 해석한다. 같은 이름의 page/layout 탭은 VS Code 1.88+ custom editor labels로 부모 두 단계 경로를 표시할 수 있고 JetBrains는 동명 파일 경로를 기본 표시한다.

## 린트와 업그레이드

Next.js 16의 build는 linter를 자동 실행하지 않는다. `eslint` 또는 `biome check`를 별도 script/CI 단계에서 실행한다. 기존 `next lint`는 `npx @next/codemod@canary next-lint-to-eslint-cli .`로 CLI script로 옮긴다.

16.1+는 `pnpm next upgrade`를 사용할 수 있다. 이전 버전은 `npx @next/codemod@canary upgrade latest`를 쓴다. 수동 변경은 next/react/react-dom/eslint-config-next 버전을 함께 검토한다. canary 기능을 시험하기 전에 현재 안정 버전이 동작하는 상태를 확인한다. `forbidden`, `unauthorized`, authInterrupts는 현재 실험 기능이라는 지위를 유지한다.

업그레이드는 `node_modules/next/dist/docs/`의 패키지 내 문서도 갱신한다. codemod가 프로젝트의 인증, 캐시, 스트리밍 계약을 전부 증명하는 것은 아니므로 린트, 타입, build와 start에서 주요 경로를 확인한다.

## 배포 모델

| 방식 | 실행 계약과 제한 |
| --- | --- |
| Node.js server | build/start, Next.js 서버 기능 지원 |
| Docker | Node 서버 또는 standalone output을 담아 실행, 기능은 서버 구성에 따름 |
| Static export | HTML/CSS/JS 호스팅, 서버가 필요한 기능은 사용할 수 없음 |
| Adapter | 플랫폼 능력과 adapter 구현에 따라 지원이 달라짐 |

공식 verified adapter는 공개 호환성 테스트를 운영한다. 문서 확인일에는 Vercel/Bun이 listed이고 다른 플랫폼 연동은 자체 지원 범위를 검토해야 한다. 특정 플랫폼 명칭보다 streaming, 캐시 저장소, after lifetime, 이미지 최적화 같은 실제 요구 능력으로 배포를 선택한다. Mac/Windows의 개발은 Docker가 오히려 느릴 수 있어 로컬 dev도 비교한다.

## 설치 설정의 구체적 선택

CLI는 프로젝트명 다음 권장 기본값, 이전 설정 재사용, 직접 설정 중 하나를 선택한다. 직접 설정에는 TypeScript, ESLint/Biome/없음, React Compiler, Tailwind, `src`, App Router, import alias, `AGENTS.md` 포함 여부가 있다. 수동 설치에서는 `pnpm add next@latest react@latest react-dom@latest` 후 `app/layout.tsx`와 `app/page.tsx`를 만든다. public은 선택이며 `/profile.png`처럼 root URL로 접근한다. dev는 기본 `http://localhost:3000`에서 페이지 저장 결과를 갱신한다.

```json
{
  "compilerOptions": {
    "baseUrl": "src/",
    "paths": {"@/styles/*": ["styles/*"], "@/components/*": ["components/*"]}
  }
}
```

VS Code/Cursor에서는 `workbench.editor.customLabels.patterns`의 `**/app/**/page.tsx` 값을 `${dirname(1)}/${dirname} - page.tsx`로 지정한다. layout/loading/error/not-found/template/default/route에도 같은 규칙을 적용하면 dynamic route 탭을 구분한다. TypeScript plugin은 command palette의 TypeScript: Select TypeScript Version에서 Use Workspace Version을 선택한다.

ESLint 설정은 `eslint.config.mjs`를 명시한다. `lint:fix`는 `eslint --fix`; Biome 조합은 `lint: biome check`, `format: biome format --write`다. 명령 이름만 설정하고 해당 linter 설정과 dependency를 빠뜨리지 않는다. 업그레이드 후에는 패키지에 함께 설치된 문서를 agent가 다시 읽도록 요청할 수 있고 출시 전 기능은 preview.nextjs.org에서 확인한다.

## 시작 전 지식과 배포 예제

입문 문서는 HTML/CSS/JavaScript/React 기초를 전제로 한다. React Foundations와 Next.js dashboard 학습 과정에서 앱을 만들며 익힐 수 있다. Node 배포 예는 package scripts의 dev/build/start를 설정하고 build 후 start를 실행한다. 필요하면 custom server로 구성한다. static export는 S3/Nginx/Apache 등 HTML/CSS/JS 서버에서 제공할 수 있고, SPA로 시작해 나중에 서버 기능을 추가할 수 있다.

Docker template의 standalone은 필요한 runtime 파일과 dependency만 담는 production image다. export는 경량 container/static 호스팅용 HTML, multi-environment는 dev/staging/production별 config와 env 구성 예다. Kubernetes 등 container 실행 host에도 배포할 수 있다. 제공자 template는 Node의 Flightcontrol/Railway/Replit/Hostinger, Docker의 DigitalOcean/Fly.io/Cloud Run/Render/SST, static의 GitHub Pages가 있다. 목록은 템플릿 탐색용이며 지원 여부는 배포 구성별로 검증한다.

Adapter API는 platform별 build/deploy customization을 제공한다. verified adapter는 open source로 공개되고 Next.js organization에 호스팅되며 전체 compatibility suite와 major release 전 협력 검사를 수행한다. 확인일 기준 Vercel/Bun이 목록에 있고 public test 결과 공개는 예정되어 있다. Cloudflare/Netlify는 verified adapter를 개발 중이며 현재는 자체 integration을 제공한다. Appwrite Sites/AWS Amplify/Cloudflare/Deno Deploy/Firebase App Hosting/Netlify의 기존 integration은 public Adapter API 기반 verified adapter와 다르므로 지원 차이를 확인한다.

업그레이드대표명령은 `npx next upgrade` (16.1+),구버전은 `npx @next/codemod@canary upgrade latest`,수동은 `npm i next@latest react@latest react-dom@latest eslint-config-next@latest`다. latest정상동작확인후 `npm i next@canary`로시험한다. canary안내의forbidden/unauthorized함수와파일/authInterrupts는실험지위를확인한다. version16/15/14가이드는각각15→16/14→15/13→14의상세이동절차다.

## 이해 확인

1. build 성공 뒤 린트 위반이 남아 있을 수 있는 이유와 CI에 필요한 단계를 설명한다.
2. 정적 export로 옮기면 cookies를 읽는 Server Component와 Server Action을 어떻게 처리해야 하는가?
3. React 버전 선언과 App Router 내장 React를 왜 구분하는가?

## 출처

- [Next.js, getting-started](https://nextjs.org/docs/app/getting-started)
- [Next.js, installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js, deploying](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js, upgrading](https://nextjs.org/docs/app/getting-started/upgrading)

## 관련 문서

- [[React-Tooling-and-Project-Setup]]
- [[React-Server-Components]]
- [[NextJS-App-Structure]]
