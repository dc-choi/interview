---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js response header 규칙", "NextJS-Config-Headers"]
---

# Next.js response header 규칙

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## headers

동기/비동기 `headers()`는 `{ source, headers: [{ key, value }], basePath?, locale?, has?, missing? }[]`를 반환한다. page/public filesystem 검사 전에 적용되며 여러 규칙이 같은 key를 설정하면 뒤 규칙이 덮어쓴다. 모든 matching rule의 결과를 생각해야 한다.

```js
export default {
  headers: async () => [{
    source: '/api/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Access-Control-Allow-Origin', value: 'https://app.example.com' },
    ],
  }],
}
```

## path와 조건 matching

`/blog/:slug`는 단일 segment만, `:slug*`는 0개 이상, `+`는 1개 이상, `?`는 0/1개를 매칭한다. 패턴은 path 시작에 고정된다. regex는 `/post/:id(\\d+)`처럼 parameter 뒤에 쓰고 JS string escaping을 적용한다. literal regex 특수문자는 escape한다.

`has`와 `missing`은 header, cookie, host, query의 type/key/value를 가진다. source와 모든 has가 맞고 모든 missing이 맞지 않아야 한다. value 생략은 존재 여부, named regex group은 capture를 제공한다. basePath는 기본 자동 prefix, locale은 Pages i18n 설정과 연계하며 false일 때 직접 명시한다.

## Cache-Control

내용 hash가 있는 immutable assets의 `public, max-age=31536000, immutable`은 next.config headers로 덮어쓸 수 없다. 일반 response는 별도 cache policy를 설정할 수 있다. Pages API에서는 `res.setHeader`, getServerSideProps에서는 `context.res.setHeader`를 사용한다. getStaticProps ISR은 revalidate를 사용한다.

```ts
import type { GetServerSidePropsContext } from 'next'

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59')
  return { props: {} }
}
```

public shared cache에 사용자별 비공개 response를 넣지 않는다. App caching은 Data/Full Route/Router cache와 HTTP CDN policy가 각각 달라 headers만으로 모두 조절되지 않는다.

## 보안과 성능 header

- `Access-Control-Allow-Origin`은 허용 origin을 지정한다. credentials, method/header와 preflight 요구도 함께 맞춘다.
- `X-DNS-Prefetch-Control`은 DNS prefetch를 제어한다.
- `Strict-Transport-Security`는 HTTPS 강제 기간과 subdomain/preload 정책이다. HTTP-only subdomain까지 포함할지 확인한다.
- `X-Frame-Options`는 frame embed를 제한한다. CSP의 frame-ancestors가 더 세밀한 현대 대안이다.
- `Permissions-Policy`는 browser feature/API 사용을 제한하며 옛 Feature-Policy 이름과 구분한다.
- `X-Content-Type-Options: nosniff`는 MIME 추측을 제한한다.
- `Referrer-Policy`는 navigation에서 전송하는 출처 정보를 조절한다.
- `Content-Security-Policy`는 script/resource 실행 정책이다. nonce처럼 request-time 값은 정적 config보다 runtime에서 작성한다.

## 검증

headers는 9.5, has는 10.2, missing은 13.3에서 도입됐다. production route, public file, 중첩 path, matching/nonmatching cookie/query를 요청해 최종 response를 검사한다. host/CDN이 header를 추가/삭제하는지도 확인한다. config helper test는 Proxy와 filesystem routes를 제외한다.

## capture와 자동 prefix의 상세

header key와 value 모두 path capture를 쓸 수 있다. /blog/:slug는 /blog/a만, :slug*는 /blog와 중첩 경로를 매칭한다. 숫자 제한은 /blog/:post(\\d{1,})이고 literal /english(default)는 source 문자열에서 /english\\(default\\)/:slug로 escape한다. 특수문자 (,),{,},:,*,+,?를 literal로 쓰면 escaping이 필요하다.

has/missing type은 header/cookie/host/query, key는 선택한 항목 이름, value는 string 또는 undefined다. value 없는 조건은 존재를 확인하고 first-(?<name>.*)처럼 named capture가 있어야 name을 header에 interpolate한다. page:home, cookie authorized:true 같은 literal match는 일치 확인으로만 쓰고 출력은 고정값으로 지정한다. host example에 정의되지 않은 :authorized를 넣지 않는다.

basePath:false는 source prefix를 생략한다. headers 레퍼런스의 external rewrite only 문구는 headers 역할에 맞지 않으며 같은 페이지의 /without-basePath 예시와 상충하므로 rewrite destination 제약으로 일반화하지 않는다.

Pages i18n source는 자동 locale prefix를 처리하고 locale:false면 직접 prefix를 넣는다. defaultLocale en에서 source /en, locale:false는 /를 매칭하는 내부 처리 예시다. /(.*)는 /(en|fr|de)/(.*)로 변환되어 최상위 /나 /fr에는 매칭되지 않을 수 있어 /:path*와 구분한다. App [lang] 사용자 routing이 next.config i18n을 자동 enable하는 것은 아니다.

## header 값 예시와 한계

CORS 예시의 methods는 GET, POST, PUT, DELETE, OPTIONS, allow-headers는 Content-Type, Authorization이다. Allow-Origin *는 credential 요청에 그대로 사용할 수 없으므로 API 요구에 맞는 origin과 OPTIONS 응답을 구성한다.

X-DNS-Prefetch-Control:on은 link/image/CSS/script의 DNS를 background에서 해석해 사용 전 지연을 줄이는 힌트다. HSTS의 max-age=63072000; includeSubDomains; preload는2년 HTTPS 정책이며 HTTP-only 하위 도메인을 차단한다. preload token 자체가 browser preload list 등록 절차를 완료하지는 않는다.

X-Frame-Options:SAMEORIGIN은 같은 origin embed를 허용하고 현대 정책은 CSP frame-ancestors를 검토한다. Permissions-Policy의 camera=(), microphone=(), geolocation=(), browsing-topics=()는 각 기능을 허용하지 않는 예시이며 옛 이름은 Feature-Policy다. X-Content-Type-Options의 유효값은 nosniff이고 upload 파일의 Content-Type 혼동을 줄인다. Referrer-Policy:origin-when-cross-origin은 cross-origin에 origin만 보내는 정책 예시다.

## Pages 응답 cache의 정확한 시간 범위

Pages ISR은 getStaticProps.revalidate로 관리하고 API는 res.setHeader(Cache-Control,s-maxage=86400) 후 JSON 응답을 낼 수 있다. getServerSideProps의 public,s-maxage=10,stale-while-revalidate=59는 fresh 10초 뒤 최대 59초 stale window이므로 생성 시점부터 총 69초까지의 조건이다. 원문 comment의 before 59 seconds를 총 age 59초로 해석하지 않는다. 인증/개인화 응답에 public cache를 무조건 적용하지 않고 cache key와 공유 여부를 먼저 정한다. 기존 타입 예시는 GetServerSidePropsContext를 유지한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [Next.js, pages/api-reference/config/next-config-js/headers](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers)

## 관련 문서

- [[NextJS-Config-Rewrites]]
- [[NextJS-Config-Cache-Policy]]
