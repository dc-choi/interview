---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["App Router 폴더와 파일의 실행 구조"]
---

# App Router 폴더와 파일의 실행 구조

## URL과 구현 파일을 나누는 규칙

폴더는 URL segment를 만들고 `page` 또는 `route`가 있어야 공개 route가 된다. 그 폴더의 일반 컴포넌트/유틸리티가 자동 endpoint가 되지는 않는다. 따라서 route 옆에 UI와 데이터 코드를 배치할 수 있다.

```text
app/
  layout.tsx
  page.tsx                    # /
  (shop)/cart/page.tsx        # /cart
  blog/[slug]/page.tsx        # /blog/hello
  blog/_components/Card.tsx  # 라우팅 제외
```

`components`, `lib`, `ui` 같은 이름은 일반 구조 선택이다. app 밖 공유 코드, app 루트 공유 코드, feature별 colocating을 혼합할 수 있으며 기존 팀 규칙과 일관성을 유지한다.

## 특수 파일의 경계

| 파일 | 역할 |
| --- | --- |
| layout | 공유 UI, 아래 파일들을 감싸는 바깥 경계 |
| template | key가 달라질 때 subtree remount |
| error/global-error | route/root 예외 fallback |
| loading | 아래 subtree의 Suspense fallback |
| not-found/global-not-found | 리소스 부재/전체 미매칭 URL |
| page | route 고유 UI, subtree leaf |
| route | Web Request/Response endpoint, page와 같은 URL 충돌 금지 |
| default | parallel slot의 hard navigation fallback |

기본 계층은 `layout → template → error → loading → not-found → page 또는 child layout`이다. 같은 segment의 error는 자기 layout/template 오류를, loading은 자기 layout의 대기를 감싸지 못한다. 파일의 존재만 보지 말고 해당 경계의 위치를 확인한다.

## 그룹과 private 폴더

`(marketing)`은 URL에 포함되지 않고 layout/팀/기능별 묶음이 된다. `(marketing)/about`과 `(shop)/about`은 같은 `/about`으로 충돌한다. root layout을 여러 그룹에 만들면 서로 다른 root 간 이동은 full-page load다. 공통 root가 없다면 `/` 페이지도 한 그룹 안에 둔다.

`_folder`는 하위 전체를 라우팅에서 제외한다. 구현 상세 분리, 미래 특수 파일명 충돌 예방에 유용하나 일반 colocating에 필수는 아니다. 실제 underscore로 시작하는 URL을 원하면 `%5Ffolder`를 사용한다.

`@slot`은 URL segment가 아니다. `(.)`, `(..)`, `(..)(..)`, `(...)`는 파일 경로가 아닌 route segment 기준으로 interception 대상을 찾는다.

## src와 public

`src/app`과 `src/pages`를 선택할 수 있다. root에 app/pages가 있으면 해당 src/app/src/pages는 무시된다. public, package.json, next.config, tsconfig와 `.env.*`는 project root에 남긴다. src 구조에서 Proxy와 instrumentation 파일은 src에 배치하고 alias 및 CSS 탐색 경로도 실제 구조에 맞춘다.

`public/avatars/me.png`는 `/avatars/me.png`로 제공된다. 기본 `Cache-Control: public, max-age=0`이며 이름이 같은 자산의 변경을 framework가 안전하게 장기 캐시한다고 가정하지 않는다. robots/favicon/OG 등은 app의 metadata 파일 규칙을 우선 사용한다.

## 설정 파일과 관측 파일

next.config는 framework, package.json은 dependency/script, tsconfig/jsconfig는 타입/alias, eslint.config는 lint를 관리한다. `instrumentation.ts`는 서버 시작/오류, `instrumentation-client.ts`는 hydration 전 브라우저 초기화, `proxy.ts`는 route 앞 네트워크 경계다. `.env.*`와 생성 `next-env.d.ts`를 코드 정본과 혼동하지 않는다.

## 파일 확장자와 metadata 위치

UI 특수 파일 layout/page/loading/not-found/error/global-error/template/default는 `.js`, `.jsx`, `.tsx`를 쓰고 endpoint route는 `.js`, `.ts`다. instrumentation/proxy는 request 관측과 전처리 파일이며 `.env`, `.env.local`, `.env.production`, `.env.development`는 환경별 값을 담는다. 환경 파일과 생성 `next-env.d.ts`는 버전 관리에서 제외한다. `.gitignore`는 이 범위를, tsconfig/jsconfig는 TypeScript/JavaScript 설정을 관리한다.

| Metadata 파일 | 정적 형식 | 생성 형식 |
| --- | --- | --- |
| favicon | ico | 생성 파일 convention 없음 |
| icon | ico/jpg/jpeg/png/svg | js/ts/tsx |
| apple-icon | jpg/jpeg/png | js/ts/tsx |
| opengraph-image, twitter-image | jpg/jpeg/png/gif | js/ts/tsx |
| sitemap | xml | js/ts |
| robots | txt | js/ts |

`app/blog/layout.tsx`는 `/blog`와 아래 author route 모두를 감싼다. `[slug]`는 한 segment, `[...slug]`는 한 개 이상, `[[...slug]]`는 없는 경로도 받는다. slot/interception은 [[NextJS-App-Parallel-Routes]], metadata 세부 계약은 [[NextJS-App-Metadata]]로 연결한다.

## layout과 loading의 적용 범위를 좁히기

`(shop)`에 account/cart를 옮기고 그 안에 layout을 두면 checkout은 그 layout을 공유하지 않는다. dashboard의 `(overview)` 안에 page와 loading을 함께 넣으면 URL을 바꾸지 않고 overview만 skeleton 경계에 넣는다. root layout을 나눌 때는 최상위 layout을 제거하고 각 route group layout에 html/body를 둔다.

공유 코드 전체를 app 밖에 두는 방식, app 루트 안에 두는 방식, 전역 공유는 app 루트에 두고 feature별 코드는 route 옆에 두는 방식 모두 가능하다. private prefix는 app 밖 코드에도 팀 convention으로 쓸 수 있지만 framework의 routing 제외 계약은 app 폴더에 적용된다.

## src 이동 시 같이 확인할 경로

components/lib 등 application code도 src로 옮길 수 있다. Tailwind v3의 `content` glob은 `./src/...`를 포함하도록 바꾸고 TypeScript `@/*` alias의 paths도 src를 가리키게 한다. public avatar 예제는 `/avatars/${id}.png`를 Image에 전달하고 alt와 64x64 크기를 지정한다. 변경 가능한 public 자산은 기본 max-age=0이며 favicon/robots는 app metadata convention을 사용한다.

## 이해 확인

1. app/blog/utils.ts를 만들면 외부에서 `/blog/utils`를 요청할 수 있는가?
2. 같은 segment의 layout이 await cookies에서 막힐 때 loading 파일이 보이지 않는 이유는?
3. src로 이동하면서 public과 `.env.local`까지 옮기면 왜 문제가 되는가?

## 출처

- [Next.js, project-structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js, file-conventions](https://nextjs.org/docs/app/api-reference/file-conventions)
- [Next.js, public-folder](https://nextjs.org/docs/app/api-reference/file-conventions/public-folder)
- [Next.js, route-groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Next.js, src-folder](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder)

## 관련 문서

- [[NextJS-App-Layouts]]
- [[NextJS-App-Parallel-Routes]]
- [[NextJS-App-Request-Proxy]]
