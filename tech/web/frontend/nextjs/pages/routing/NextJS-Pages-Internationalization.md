---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 locale 경로와 정적 생성", "NextJS Pages Internationalization"]
---

# Pages Router의 locale 경로와 정적 생성

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 번역과 locale routing을 구분한다

Pages의 built-in i18n은 locale 감지와 URL routing을 제공한다. 메시지 번역, 복수형, 날짜 formatting은 별도 i18n library와 연결한다. v10부터 지원한 Pages 기능이며 App Router의 `[lang]` 구현과 동일한 convention이 아니다.

```js
module.exports = {
  i18n: {
    locales: ['ko', 'en', 'fr'],
    defaultLocale: 'ko',
    localeDetection: true,
    domains: [{ domain: 'example.fr', defaultLocale: 'fr' }],
  },
}
```

locale identifier는 language/region/script의 표준 표기를 따른다. 구성에 없는 세부 지역은 가능한 언어 locale, 없으면 기본 locale로 fallback할 수 있다.

## sub-path와 domain 전략

sub-path는 `/blog`, `/en/blog`, `/fr/blog`로 구분하고 default locale에는 prefix가 없다. domain 전략은 domain별 default locale과 선택적 다른 locales를 배정한다. `www`나 다른 subdomain도 실제 hostname을 구성해야 한다. 로컬 domain 시험에는 `http: true`를 사용할 수 있다.

루트 방문에서 Accept-Language와 domain으로 locale을 감지해 prefix 또는 domain으로 redirect한다. `NEXT_LOCALE` cookie는 Accept-Language보다 우선한다. `localeDetection: false`는 자동 감지를 끄지만 경로/domain locale 정보는 유지한다.

기본 locale에도 prefix를 붙이려면 placeholder `default` locale, 자동 감지 해제와 Proxy redirect 같은 workaround가 필요하다. `_next`, API, public 파일은 제외하고 query를 보존한다. 일반 설정만으로 default prefix가 붙는다고 가정하지 않는다.

## 현재 locale과 전환

router의 `locale`, `locales`, `defaultLocale` 및 데이터 함수 context에서 locale을 읽는다. `getStaticPaths` context에는 `locales`, `defaultLocale`이 있다.

```tsx
const { pathname, query, asPath } = router
void router.push({ pathname, query }, asPath, { locale: 'en' })
```

이 방식은 dynamic params와 숨겨진 href query를 유지한다. Link의 `locale="fr"`는 locale을 바꾸고 `locale={false}`는 href의 locale prefix를 직접 관리한다.

Next.js는 HTML lang을 넣지만 페이지 언어 변형의 hreflang 관계는 자동으로 알지 못한다. `next/head`에 alternate 관계를 직접 구성한다.

## locale 수가 빌드 비용을 곱한다

동적 SSG에서 미리 만들 locale 변형을 `paths`의 `{ params, locale }`로 명시한다. locale을 생략하면 default만 생성한다. 자동 정적 페이지와 non-dynamic `getStaticProps` 페이지는 locale별로 생성된다. 10페이지와 50locale이면 500번의 생성 작업이 생긴다.

인기 경로/locale만 build하고 fallback으로 나머지를 생성할 수 있다. non-dynamic 데이터가 특정 locale에 없으면 `notFound: true`로 해당 변형을 만들지 않는다.

built-in i18n routing은 static export와 통합되지 않는다. 정적 host가 필요한 경우 build-time locale URL 구조를 따로 설계한다. `locales`와 `domains`는 각각 총 100의 config 한도가 있다. custom Proxy routing으로 우회할 수 있지만 build와 runtime 비용이 사라지는 것은 아니다.

## domain, default prefix와 SSG 코드

```js
// next.config.js
module.exports = { i18n: {
  locales: ['en-US', 'fr', 'nl-NL', 'nl-BE'], defaultLocale: 'en-US',
  domains: [
    { domain: 'example.com', defaultLocale: 'en-US' },
    { domain: 'example.fr', defaultLocale: 'fr' },
    { domain: 'example.nl', defaultLocale: 'nl-NL', locales: ['nl-BE'], http: true },
  ],
} }
```

위 구성은 example.com/blog, example.fr/blog, example.nl/blog, example.nl/nl-BE/blog를 만든다. www.example.com을 locale domain으로 일치시키려면 해당 hostname을 명시한다. 원문이 www.example.com/blog도 나열하지만 domain 설정이 자동 www alias를 등록하는 계약은 아니다. http:true는 로컬 시험용이며 배포 도메인 HTTPS 구성과 구분한다. sub-path만 쓰면 domains를 빼고 /blog, /fr/blog, /nl-NL/blog 형태다. nl-BE가 없고 nl이 있으면 nl로, nl도 없으면 default로 fallback한다.

```js
// default locale prefix workaround
module.exports = {
  i18n: { locales: ['default', 'en', 'de', 'fr'], defaultLocale: 'default', localeDetection: false },
  trailingSlash: true,
}
```

```ts
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
const supported = new Set(['en', 'de', 'fr'])
export function proxy(request: NextRequest) {
  const { pathname, search, locale } = request.nextUrl
  if (pathname.startsWith('/_next') || pathname === '/api' || pathname.startsWith('/api/') || /\.[^/]*$/.test(pathname))
    return NextResponse.next()
  if (locale !== 'default') return NextResponse.next()
  const preferred = request.cookies.get('NEXT_LOCALE')?.value ?? 'en'
  const selected = supported.has(preferred) ? preferred : 'en'
  return NextResponse.redirect(new URL(`/${selected}${pathname}${search}`, request.url))
}
```

cookie를 지원 목록으로 검증한다. 확장자 기반 public-file 검사는 앱 URL 규칙에 맞춰 조정한다. localeDetection false는 Accept-Language 자동 redirect를 끄며 domain/path locale 추출은 유지한다. 자동 감지에서 `fr;q=0.9`가 example.com 루트로 오면 위 domain 구성은 example.fr로, sub-path 구성은 /fr로 이동한다. NEXT_LOCALE=en이 있으면 cookie가 우선한다.

```tsx
import Link from 'next/link'
import { useRouter } from 'next/router'
export function LocaleLinks() {
  const router = useRouter()
  return <>
    <Link href="/another" locale="fr">프랑스어</Link>
    <Link href="/fr/another" locale={false}>직접 prefix</Link>
    <button onClick={() => router.push(
      { pathname: router.pathname, query: router.query }, router.asPath, { locale: 'fr' },
    )}>현재 경로 유지</button>
  </>
}
```

단순 페이지 이동은 `router.push('/another', '/another', { locale: 'fr' })`도 가능하다. locale prop을 생략한 Link는 현재 locale을 유지한다.

```ts
import type { GetStaticPaths, GetStaticProps } from 'next'
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [
    { params: { slug: 'post-1' }, locale: 'en-US' },
    { params: { slug: 'post-1' }, locale: 'fr' },
  ], fallback: true,
})
export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const res = await fetch(`https://cms.example.com/posts?locale=${encodeURIComponent(locale ?? '')}`)
  if (!res.ok) throw new Error('게시물 조회 실패')
  const posts = await res.json()
  return posts.length ? { props: { posts } } : { notFound: true }
}
```

동적 page는 fallback 중 UI와 params 조회를 [[NextJS-Pages-Static-Paths]]처럼 구현한다. non-dynamic page에는 getStaticPaths 없이 getStaticProps만 둔다. 자동 정적 최적화도 locale별 페이지가 생성된다. react-intl/react-i18next/Lingui/Rosetta/next-intl/next-translate/next-multilingual/Tolgee/Paraglide/next-intlayer/gt-react 등은 번역/formatting 역할을 보완하는 별도 선택이며 built-in은 routing/locale parsing만 맡는다.

## 학습 확인

- cookie와 Accept-Language가 다를 때 선택 결과를 확인한다.
- locale 변경 뒤 dynamic ID와 검색 query가 유지되는지 확인한다.
- locale 수 증가가 getStaticProps 호출 횟수에 미치는 영향을 계산한다.

## 출처

- [Next.js, internationalization](https://nextjs.org/docs/pages/guides/internationalization)

## 관련 문서

- [[NextJS-Pages-Static-Paths]]
- [[NextJS-Pages-Navigation]]
- [[NextJS-Pages-Deployment]]
