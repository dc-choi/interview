---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js redirect 규칙", "NextJS-Config-Redirects"]
---

# Next.js redirect 규칙

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## redirects

`redirects()`는 `{ source, destination, permanent, basePath?, locale?, has?, missing? }[]`를 동기/비동기로 반환한다. true는 영구 308, false는 임시 307이며 두 code 모두 원래 HTTP method를 보존한다. 301/302의 일부 client처럼 POST가 GET으로 바뀌는 문제를 피한다. 특수 client 대응에는 permanent 대신 statusCode를 쓸 수 있지만 둘을 같이 지정하지 않는다.

```js
export default {
  redirects: async () => [{
    source: '/old-blog/:slug',
    destination: '/blog/:slug',
    permanent: false,
  }],
}
```

`/old-blog/a?draft=1`의 query는 destination에 전달된다. `/` 없이 `:slug`를 작성하면 literal pattern과 redirect loop를 만들 수 있다. source/destination을 함께 검사한다.

## matching과 우선순위

filesystem page/public보다 먼저 검사한다. path parameters, wildcard/regex, has/missing의 AND 조건은 [[NextJS-Config-Headers]]와 같은 형태다. basePath는 source/destination에 자동 적용된다. `basePath: false`는 external redirect용이고 내부 sub-path 우회를 위한 일반 해법으로 사용하지 않는다.

Pages에서는 Link/router.push client navigation에 next.config redirects가 자동 적용되지 않으며 matching Proxy가 존재하는 조건을 확인해야 한다. direct load와 client navigation을 따로 테스트한다.

## i18n 차이

Pages의 next.config i18n은 source/destination에 locale을 자동 처리하며 `locale: false`면 source/destination을 수동 작성한다. App은 locale dynamic route와 Proxy로 request별 언어를 처리하며 config에 `/en/old` 같은 명시적 경로를 둘 수 있다. Pages의 자동 prefix를 App의 국제화 계약으로 옮기지 않는다.

## 선택과 확인

URL 변경을 사용자와 search engine에 알릴 때 redirect를 사용한다. URL을 유지하며 다른 서버/route를 제공하려면 rewrite다. route-handler나 getServerSideProps/getStaticProps에서도 context에 따라 redirect할 수 있다. 영구 redirect가 browser/CDN에 남은 뒤 rollback이 어려울 수 있으므로 처음에는 temporary로 동작을 확인할 수 있다. 9.5 도입, has 10.2, missing 13.3이다.

## 조건 예시와 역사적 client 지원

/:path((?!another-page$).*) 같은 negative regex는 redirect destination이 자기 규칙에 다시 걸리지 않게 제외하는 예시다. header 존재 has, 특정 header 부재 missing, query page:home과 cookie authorized:true의 AND, host value:example.com을 조합할 수 있다. value가 literal이면 named capture가 없으므로 목적지에 그 이름을 자동 값으로 쓰지 않는다.

App의 /:locale/old-path -> /:locale/new-path 또는 /:locale(en|fr|de)/:path* 같은 pattern은 config에 정한 locale 경로 매핑이다. /de/old-path -> /en/new-path로 언어를 바꾸는 명시적 규칙도 가능하다. Accept-Language에 따른 request별 선택은 Proxy의 책임이다.

308에서 IE11 호환 Refresh header 추가는 역사적 client 지원 계약이다. 현재 Next.js 최소 browser 지원을 IE11로 확대하지 않는다. API Routes/Route Handlers는 요청 입력으로 redirect하고 getServerSideProps는 request마다, getStaticProps는 build/재생성 시점에 redirect 결과를 만든다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)
- [Next.js, pages/api-reference/config/next-config-js/redirects](https://nextjs.org/docs/pages/api-reference/config/next-config-js/redirects)

## 관련 문서

- [[NextJS-Config-Headers]]
- [[NextJS-Config-Rewrites]]
