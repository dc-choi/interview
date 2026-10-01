---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["getStaticProps의 서버 실행과 반환 계약", "NextJS Pages Static Props"]
---

# getStaticProps의 서버 실행과 반환 계약

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 서버에서 만든 HTML과 JSON을 재사용한다

페이지 파일에서 독립된 `getStaticProps(context)`를 export하면 props로 빌드 시 HTML과 JSON을 생성한다. 일반 컴포넌트, `_app`, `_document`, `_error`에서는 사용할 수 없다. 컴포넌트의 property로 붙이는 API도 아니다.

서버에서만 실행하며 이 함수 전용 import는 클라이언트 bundle에서 제거된다. DB와 CMS를 직접 조회하거나 공유 `lib` 함수를 호출할 수 있다. 자신의 `/api`를 다시 HTTP 호출할 필요가 없다.

```tsx
import type { GetStaticProps, InferGetStaticPropsType } from 'next'

interface Product { id: string; title: string }

export const getStaticProps = (async () => {
  const response = await fetch('https://api.example.com/products')
  if (!response.ok) throw new Error('상품 조회 실패')
  const products: Product[] = await response.json()
  return { props: { products }, revalidate: 60 }
}) satisfies GetStaticProps<{ products: Product[] }>

export default function Page({ products }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <ul>{products.map(({ id, title }) => <li key={id}>{title}</li>)}</ul>
}
```

Link/router 이동은 미리 만든 JSON을 받아 props로 사용한다. 일반 정적 페이지의 클라이언트 이동마다 함수가 다시 실행되는 것은 아니다. ISR은 필요할 때 HTML/JSON을 다시 만든다. 개발에서는 요청마다 실행되어 production 캐시 모델을 검증할 수 없다.

## context와 실행 시점

| 필드 | 의미 |
| --- | --- |
| `params` | 동적 경로 params, `getStaticPaths`와 함께 사용 |
| `draftMode` | Draft Mode 활성 여부 |
| `preview`, `previewData` | 기존 Preview Mode, Draft Mode로 대체 권장 |
| `locale`, `locales`, `defaultLocale` | i18n 구성 |
| `revalidateReason` | `build`, `stale`, `on-demand` |

incoming request의 header, query, cookie를 받는 함수가 아니다. 요청별 판단은 SSR 또는 Proxy 같은 별도 경계에서 처리한다. 빌드, fallback 최초 생성, 시간 기반 background 재생성, on-demand 재검증 때 실행될 수 있다.

## 반환값은 결과 종류와 갱신 정책이다

`props`, `redirect`, `notFound` 중 하나를 반환하고 선택적으로 `revalidate`를 붙인다.

- `props`: JSON 직렬화 가능한 페이지 데이터. secret, token, 비공개 내부 필드를 넣지 않는다.
- `revalidate`: 초 단위 재생성 가능 간격. 기본 `false`는 시간 기반 갱신을 하지 않는다. 정확한 timer가 아니라 간격 이후 요청이 재생성을 유발한다.
- `notFound: true`: 이전에 성공한 페이지가 있어도 404로 전환할 수 있다. 삭제 콘텐츠 처리에도 사용하고 같은 재검증 정책을 따른다.
- `redirect: { destination, permanent }`: 내부/외부 이동. `statusCode`를 사용하면 `permanent`와 동시에 지정하지 않는다. `basePath: false`로 기본 경로 부착을 끌 수 있다.

빌드 전에 아는 redirect 목록은 next.config의 redirects에서 관리한다. 데이터 조회에 따라 달라지는 redirect는 해당 페이지의 생성 시점과 fallback 정책을 함께 확인한다.

파일시스템 데이터를 읽을 때는 `process.cwd()`로 프로젝트 루트를 기준으로 파일 위치를 계산한다. 컴파일 결과의 `__dirname`을 원래 프로젝트 경로로 가정하지 않는다. 여러 파일을 독립적으로 읽을 때는 `fs.promises.readdir` 뒤 각 `readFile` 작업을 `Promise.all`로 모아 props를 완성한다. Promise 배열을 그대로 직렬화하지 않는다.

## 관측과 실패 처리

`x-nextjs-cache`의 `MISS`는 아직 없는 경로, `HIT`는 유효한 cache, `STALE`은 만료되어 background 갱신 대상이다. HTTP cache와 서버 생성 결과 cache를 구별한다. 실패한 upstream 값을 정상 props로 반환하면 실패 내용도 cache에 들어갈 수 있으므로 응답 상태를 확인하고 오류를 throw한다.

## 파일 읽기와 공유 조회의 실행 예제

CMS 조회 helper를 API Route와 정적 페이지가 직접 공유할 수 있다. HTTP로 자신의 API를 왕복하지 않는다.

```tsx
// lib/load-products.ts
export const loadProducts = async () => {
  const response = await fetch('https://api.example.com/products')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}
// pages/products.tsx의 서버 함수
export const getStaticProps = async () => ({
  props: { products: await loadProducts() },
})
```

파일 기반 게시물은 Promise를 모두 기다린 plain object로 반환한다.

```tsx
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const getStaticProps = async () => {
  const directory = path.join(process.cwd(), 'posts')
  const names = await fs.readdir(directory)
  const posts = await Promise.all(names.map(async (filename) => ({
    filename,
    content: await fs.readFile(path.join(directory, filename), 'utf8'),
  })))
  return { props: { posts } }
}
```

해당 페이지는 `posts.map(({ filename, content }) => ...)`으로 파일명과 내용을 렌더링한다. markdown 해석이나 HTML 정화는 별도 처리다. 위 코드가 untrusted HTML을 안전하게 만든다는 뜻은 아니다.

SSG는 공개 cache 가능 데이터가 기본이다. Proxy로 URL variant를 나눌 수 있어도 사용자별 권한과 cache 격리는 별도 검증해야 한다. JSON 경로를 직접 열어 데이터가 노출될 수 있음을 확인한다. 서버 전용 import의 bundle 제거 여부는 next-code-elimination 도구 또는 실제 client bundle로 확인할 수 있다.

`revalidateReason`의 `build`는 빌드, `stale`은 기간 만료 또는 development 실행, `on-demand`는 요청형 재검증이다. 재검증으로 HTML과 client 이동용 JSON을 다시 만드는 과정에서 같은 페이지의 요청이 여러 번 관측될 수 있다.

SSG API는 v9.3, ISR은 v9.5, locale/notFound와 blocking은 v10, 요청형 ISR beta는 v12.1, stable은 v12.2, App Router stable과 새 데이터 모델은 v13.4에 도입됐다. Pages의 함수를 App의 함수 이름으로 단순 치환하지 않는다.

## 학습 확인

- SSR request context를 이 함수에 기대하면 어떤 데이터가 없는지 설명한다.
- HTML/JSON에 들어갈 필드를 직접 검사해 secret이 없는지 확인한다.
- 개발 서버와 production 서버에서 호출 횟수가 달라지는 이유를 설명한다.

## 출처

- [Next.js, get-static-props](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-props)
- [Next.js, get-static-props](https://nextjs.org/docs/pages/api-reference/functions/get-static-props)

## 관련 문서

- [[NextJS-Pages-Static-Paths]]
- [[NextJS-Pages-ISR]]
- [[NextJS-Pages-Preview-Draft]]
