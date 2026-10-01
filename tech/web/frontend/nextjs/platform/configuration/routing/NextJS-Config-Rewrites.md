---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js rewrite 순서와 URL proxy", "NextJS-Config-Rewrites"]
---

# Next.js rewrite 순서와 URL proxy

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## rewrites

`rewrites()`는 source URL을 유지하면서 destination을 제공하는 proxy mapping이다. client navigation에도 적용한다. 동기/비동기로 `{ source, destination, basePath?, locale?, has?, missing? }[]` 또는 `{ beforeFiles, afterFiles, fallback }`를 반환한다.

```js
export default {
  rewrites: async () => ({
    beforeFiles: [],
    afterFiles: [{ source: '/catalog/:slug', destination: '/products/:slug' }],
    fallback: [{ source: '/:path*', destination: 'https://legacy.example.com/:path*' }],
  }),
}
```

배열 반환은 filesystem 뒤, dynamic routes 앞에서 적용된다. phases object는 적용 순서를 더 세밀하게 지정한다. 외부 fallback proxy는 Next.js route를 점진적으로 옮길 때 유용하다.

## 라우팅 순서

1. headers
2. redirects
3. Proxy
4. beforeFiles rewrites
5. public, _next/static, non-dynamic pages
6. afterFiles rewrites
7. dynamic routes
8. fallback rewrites, 이후 404

beforeFiles는 한 번 매칭되었다고 즉시 filesystem 확인으로 끝내지 않고 규칙들을 계속 검사한다. afterFiles는 rewrite destination에서 filesystem/dynamic route가 해결되면 제공한다. source와 has/missing을 함께 판단한다.

Pages rewrite 문서의 오래된 순서 설명에는 Proxy 단계가 생략되어 있지만 이것을 Proxy가 실행되지 않는 계약으로 해석하지 않는다. 현재 App의 전체 순서와 adapter routing phases를 함께 확인한다. Pages getStaticPaths의 fallback true/blocking 동적 route는 fallback rewrite보다 우선하며 해당 fallback rewrites가 실행되지 않는 경우가 있다.

## parameter 전달

source parameter가 destination에 하나도 쓰이지 않으면 query로 자동 전달한다. 하나라도 destination에 쓰면 다른 source parameter까지 자동 query 전달하지 않는다. 필요한 query를 destination에 명시한다.

```js
// path에는 id를 쓰고 section은 query로 명시한다.
{ source: '/docs/:section/:id', destination: '/item/:id?section=:section' }
```

Pages 자동 정적 최적화에서는 rewrite query가 hydration 후 client query에 들어오므로 initial render에서 이미 존재한다고 가정하지 않는다.

## basePath와 locale

basePath는 source/destination에 자동 prefix하며 false는 external rewrites에서 사용한다. trailingSlash true인 앱은 source와 destination server의 slash 요구를 맞춘다. Pages i18n은 locale prefix를 자동 처리하며 false일 때 직접 작성한다. App 국제화는 locale segment와 Proxy를 통해 설계한다.

## matching과 운영

단일 segment, wildcard, regex와 header/cookie/query/host 조건은 [[NextJS-Config-Headers]]를 따른다. 허용할 external upstream을 고정하고 사용자 입력을 임의 destination으로 만들지 않는다. timeout, cache headers와 upstream 오류 처리까지 request flow를 확인한다. 단계별 test에서는 existing static route, dynamic route, 없는 route와 client/direct load를 비교한다.

## 고유 parameter 예시와 regex 문자

/old-about/:path* -> /about은 destination에서 source capture를 사용하지 않아 path를 query로 전달한다. /docs/:path* -> /:path*는 capture를 쓰므로 자동 query 전달을 끈다. /:first/:second -> /:first?second=:second는 first를 path, second를 query로 명시한다. Pages 정적/getStaticProps query 해석은 hydration 이후다.

rewrite의 literal escaping 문자 목록은 (, ), {, }, [, ], |, backslash, ^, ., :, *, +, -, ?, $다. JS 문자열과 path pattern escaping을 구분한다. 숫자 capture /old-blog/:post(\d{1,})와 /english\(default\)/:slug처럼 작성한다.

external /blog와 /blog/:slug 규칙은 해당 path를 upstream으로 proxy하며 visible URL을 바꾸지 않는다. trailingSlash:true이면 /blog/ 및 /blog/:path*/로 source를 맞추고 upstream도 필요하면 destination slash를 맞춘다. fallback 외부 catch-all은 Next route를 옮길 때마다 config를 바꾸지 않고 이전하지 않은 path만 upstream으로 보낸다.

phases object는 10.1부터, has는 10.2, missing은 13.3이다. 9.5 버전표의 Headers 표기는 rewrite 기능명의 오표기로 취급해 header 규칙 도입과 rewrite 계약을 섞지 않는다.

## Pages locale rewrite의 query와 순서

Pages i18n은 source/destination에 locale을 자동 prefix하며 locale:false에서는 두 경로를 직접 작성한다. defaultLocale en의 /en은 root를 가리키고 /:locale/api-alias/:path*를 /api/:path*로 보낼 수 있다. /(.*)는 /(en|fr|de)/(.*)로 바뀌어 root와 /fr에는 match하지 않지만 /:path*는 해당 범위를 포함한다. Pages source의 단계 목록에 Proxy가 빠져 있어도 headers/redirects 후 Proxy, beforeFiles, filesystem, afterFiles, dynamic, fallback 순서를 유지한다. getStaticPaths fallback:true 또는 blocking이 선택된 route에서는 config fallback rewrites를 실행하지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
- [Next.js, pages/api-reference/config/next-config-js/rewrites](https://nextjs.org/docs/pages/api-reference/config/next-config-js/rewrites)

## 관련 문서

- [[NextJS-Config-Headers]]
- [[NextJS-Adapter-Routing]]
