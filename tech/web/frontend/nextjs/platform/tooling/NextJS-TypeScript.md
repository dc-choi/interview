---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js TypeScript와 route 타입 생성", "NextJS-TypeScript"]
---

# Next.js TypeScript와 route 타입 생성

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## TypeScript 설정

파일을 .ts/.tsx로 바꾸고 next dev/build를 실행하면 Next.js가 필요한 dependencies와 권장 tsconfig를 구성할 수 있다. 설치 버전의 최소 TypeScript 요구를 확인한다. Next.js는 TS 문법 변환, IDE plugin, route type generation, build type checker를 서로 다른 단계에서 제공한다. Turbopack transpilation 자체는 type checking을 하지 않는다.

## IDE plugin과 App 타입 경계

VS Code에서 TypeScript: Select TypeScript Version의 Use Workspace Version을 선택하면 Next.js plugin이 route segment 값, use client 위치와 client hook의 server 사용 등을 진단한다. editor가 전역 TS를 쓰면 프로젝트 plugin과 버전이 다를 수 있다.

App의 서버 fetching과 Server Component 사이 값은 Pages getStaticProps의 JSON props 경계와 다르다. 서버 내부에서 Date/Map/Set 등을 직접 다룰 수 있지만 Client Component 전달에는 React serialization 계약이 있다. ORM/API response type까지 연결해야 end-to-end type safety가 되며 `res.json()`의 any가 자동 schema 검증을 제공하지 않는다.

## route-aware helpers

`PageProps<'/blog/[slug]'>`, `LayoutProps<'/dashboard'>`, `RouteContext<'/api/[id]'>`는 App Router에서 global로 생성되어 import 없이 사용한다. next dev, next build, next typegen이 생성한다. CI에서 생성하지 않은 채 tsc만 실행하면 route types가 없거나 오래될 수 있다.

```sh
npx next typegen
npx tsc --noEmit
```

## typedRoutes

stable top-level `typedRoutes: true`는 Next Link의 literal href를 Pages/App 모두에서 검증한다. App next/navigation의 push/replace/prefetch도 포함하지만 Pages next/router methods는 type하지 않는다. 비literal string은 `as Route`가 필요할 수 있는데 cast는 정확성 검증을 우회하므로 route 생성 함수를 함께 확인한다.

```ts
import type { Route } from 'next'

const routes = ['/about', '/contact'] satisfies Route[]
```

custom Link wrapper는 Route generic과 Next Link prop types를 연결한다. 수동 프로젝트는 generated `.next/types/**/*.ts` include가 필요하다. redirected/rewritten runtime 경로와 filesystem route 타입의 차이도 확인한다.

## next-env.d.ts와 tsconfig

next-env.d.ts는 Next.js가 생성/재생성하는 파일이다. tsconfig include에는 넣고 직접 수정하지 않으며 Git에는 ignore한다. 사용자 선언은 별도 .d.ts에 두고 include한다. generation path는 dev의 .next/dev/types와 production의 .next/types를 구분한다.

`typescript.tsconfigPath`는 기본 tsconfig.json, custom config는 dev/build/typegen 모두에 적용된다. IDE는 보통 tsconfig.json을 읽으므로 strictness가 다를 수 있다. 개발 중 custom 이름 config 변경은 watch되지 않아 restart가 필요하다. `typescript.ignoreBuildErrors` 기본 false는 type errors로 production build를 실패시키며 true는 오류를 숨기는 수준이 아니라 checker 자체를 생략한다. 별도 CI checker 없이 사용하지 않는다.

## useTypeScriptCli

현재 16.3 문서의 실험 `experimental.useTypeScriptCli` 기본 true는 project-local tsc command를 실행한다. TS 6와 JS compiler API가 없는 TS 7 지원 경로다. false면 JS compiler API로 돌아가며 TS 7에서는 build가 종료된다. Next.js는 checker 전 권장 tsconfig/next-env/route types를 계속 생성한다.

checker는 선택한 tsconfig의 전체 project를 확인한다. tests와 .next/dev/types가 include되면 포함되며 debug-build-paths로 좁혀지지 않는다. tsc diagnostics를 직접 출력하므로 Next 전용 codeframe/error rewriting이 없다. ignoreBuildErrors는 CLI checker도 생략한다.

## next.config.ts와 Node.js resolver

15.0부터 next.config.ts를 지원한다. 기본 module resolution은 CommonJS 중심이다. Node.js v22.10+의 process.features.typescript가 켜진 경우 native ESM/top-level await/dynamic import를 쓸 수 있다. Next.js가 Node feature를 대신 켜는 것은 아니다. 22.10~22.17은 NODE_OPTIONS=--experimental-transform-types로 opt in하며 22.18+는 기본 활성화된 조건을 따른다.

CommonJS 프로젝트에서 명시 ESM이면 native resolver 조건 아래 next.config.mts를 사용해 reparsing을 피할 수 있다. package.json type: module이면 next.config.ts를 ESM으로 작성한다. 일반 next.config loader의 .cjs/.cts 미지원과 Node 일반 module 확장자 지원을 혼동하지 않는다.

## typedEnv와 incremental checking

실험 typedEnv true는 development runtime에 로드된 env names의 IntelliSense를 생성한다. production 전용 env file은 기본 포함되지 않으므로 development snapshot을 운영 env 계약으로 보지 않는다. 10.2.1부터 tsconfig incremental type checking을 지원한다. async Server Component의 오래된 타입 오류는 TS 5.1.3/@types/react 18.2.8 이상 조건을 확인하되 현재 프로젝트의 최신 최소 요구를 함께 따른다.

## Pages Router 타입

`GetStaticProps`, `GetStaticPaths`, `GetServerSideProps`와 `satisfies`를 사용해 data function 계약을 검사한다. API는 NextApiRequest/NextApiResponse<Data>, custom _app은 AppProps를 쓴다. App의 global props helpers를 Pages API의 타입으로 대체하지 않는다. satisfies는 TS 4.9부터다.

## typed link의 wrapper와 동적 경로 예제

~~~tsx
import type { Route } from 'next'
import Link from 'next/link'
function Card<T extends string>({ href }: { href: Route<T> | URL }) {
  return <Link href={href}><div>카드</div></Link>
}
type NavItem<T extends string = string> = { href: T; label: string }
const items: NavItem<Route>[] = [{ href: '/about', label: '소개' }]
~~~

literal '/about'와 slug를 삽입한 /blog/... template literal은 검사하지만 '/blog/' + slug는 Route cast가 필요할 수 있다. /aboot 같은 오타는 오류다. Proxy가 filesystem에 없는 /proxy-redirect를 /로 redirect하는 경로도 href as Route로 직접 표시할 수 있으나 cast 자체가 해당 Proxy 존재를 검증하지는 않는다. items.map에서 key/href로 item.href를 쓰면 구조를 통한 type 계약도 Link까지 이어진다.

기존 jsconfig에서 TS로 옮길 때 paths를 tsconfig compilerOptions로 복사하고 jsconfig를 제거한다. next-env.d.ts는 images/styles 같은 non-code import와 Next.js 타입을 참조하며 사용자 선언은 new-types.d.ts를 include에 추가한다.

## 설정 파일과 env의 구체적 예제

JS 설정의 // @ts-check와 /** @type {import('next').NextConfig} */는 IDE 검사를 제공하고 TS는 import type { NextConfig }와 annotation을 사용한다. native resolver가 켜진 next.config.mts에서는 await import('./flags.js').then(m=>m.default??m)로 ESM/CJS default를 선택하고 typedRoutes:Boolean(flags?.typedRoutes)를 설정할 수 있다. type: module은 일반 .js/.ts도 ESM으로 해석하므로 기존 CJS 일반 파일은 .cjs/.cts로 명시할 수 있다. Next config 자체의 지원 확장자와는 별도 규칙이다.

typedEnv는 동일 key를 env load order대로 deduplicate한다. .env.production*의 이름까지 생성하려면 NODE_ENV=production next dev로 해당 환경을 읽어야 하며 이것을 평소 개발 서버의 권장 실행 방식으로 일반화하지 않는다.

typescript.tsconfigPath를 NODE_ENV에 따라 tsconfig.build.json/tsconfig.json로 선택할 수 있다. build config가 extends:'./tsconfig.json', compilerOptions:{useUnknownInCatchVariables:false}이면 monorepo dependency가 catch 값을 any로 가정하는 동안 build만 완화하고 IDE는 엄격히 유지한다. 중요 옵션이 서로 다른지는 별도로 확인한다.

13.2 typed links beta, 12.0 SWC의 TS/TSX 기본 compile, 10.2.1 incremental, 15.0 next.config.ts 도입 순서다. App 원문의 fetching 값이 client에서 serialization 없이 소비된다는 표현은 서버 내부 전달에 한정해 해석한다. Client Component로 넘어가는 값은 여전히 React serialization 제약을 따른다.

## Pages data 함수와 typed API 예제

~~~tsx
import type { GetStaticProps, GetStaticPaths, NextApiRequest, NextApiResponse } from 'next'
export const getStaticProps = (async () => ({ props: {} })) satisfies GetStaticProps
export const getStaticPaths = (async () => ({
  paths: [], fallback: false,
})) satisfies GetStaticPaths
type Data = { name: string }
export function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  res.status(200).json({ name: '사용자' })
}
~~~

GetServerSideProps도 같은 satisfies 패턴으로 검사하며 context 자체의 annotation은 GetServerSidePropsContext다. NextApiResponse에 generic이 없어도 동작하지만 Data를 주면 JSON shape를 검사할 수 있다. pages/_app.tsx는 next/app의 AppProps에서 Component/pageProps를 받아 <Component {...pageProps}/>로 전달한다. 원문 생략형 async 함수는 실제 반환 없이 복사하지 않고 유효한 props/paths 결과를 채운다.

## 출처

- [Next.js, app/api-reference/config/typescript](https://nextjs.org/docs/app/api-reference/config/typescript)
- [Next.js, pages/api-reference/config/typescript](https://nextjs.org/docs/pages/api-reference/config/typescript)
- [Next.js, app/api-reference/config/next-config-js/typescript](https://nextjs.org/docs/app/api-reference/config/next-config-js/typescript)
- [Next.js, pages/api-reference/config/next-config-js/typescript](https://nextjs.org/docs/pages/api-reference/config/next-config-js/typescript)
- [Next.js, app/api-reference/config/next-config-js/typedRoutes](https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes)
- [Next.js, app/api-reference/config/next-config-js/useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli)
- [Next.js, pages/api-reference/config/next-config-js/useTypeScriptCli](https://nextjs.org/docs/pages/api-reference/config/next-config-js/useTypeScriptCli)

## 관련 문서

- [[NextJS-CLI]]
- [[NextJS-Turbopack]]
- [[NextJS-Config-Lifecycle]]
