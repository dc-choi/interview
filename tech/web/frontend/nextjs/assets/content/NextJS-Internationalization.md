---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["App Router의 locale와 사전", "NextJS Internationalization"]
---

# App Router의 locale와 사전

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 언어 선택과 콘텐츠 번역은 별도 책임이다

locale은 en-US, nl-NL, nl처럼 언어와 지역 선호를 식별한다. localization은 콘텐츠를 번역/지역화하는 일이고 internationalization은 여러 locale에 맞는 route와 data 구조를 설계하는 일이다. URL prefix를 붙였다고 번역/시간대/통화 처리까지 완성되지 않는다.

App Router는 /en/products 같은 subpath 또는 locale별 domain을 설계할 수 있다. Pages의 next.config i18n/router.locale 계약을 App에 그대로 적용하지 않는다. Accept-Language는 초기 선호 탐색의 단서이며 사용자가 선택한 locale/cookie 정책과 우선순위를 정한다.

Negotiator로 accepted languages를 추출하고 @formatjs/intl-localematcher의 match(languages,locales,defaultLocale)로 지원 locale을 선택할 수 있다. 지원하지 않는 값에 fallback을 정한다.

## Proxy와 locale segment

Proxy는 이미 locale prefix가 있는 경로를 건드리지 않고 누락 경로만 redirect한다. 경로는 지원 목록과 startsWith('/locale/') 또는 정확히 '/locale'로 비교해 /english 같은 오검출을 피한다.

~~~ts
import { NextRequest, NextResponse } from 'next/server'
const locales = ['en', 'ko']
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (locales.some(locale =>
    pathname === '/' + locale || pathname.startsWith('/' + locale + '/')))
    return NextResponse.next()
  const locale = 'ko' // Accept-Language/cookie matching 결과
  const url = request.nextUrl.clone()
  url.pathname = '/' + locale + pathname
  return NextResponse.redirect(url)
}
export const config = { matcher: ['/((?!_next).*)'] }
~~~

URL clone으로 query를 보존한다. 예시 _next exclusion만으로 public asset/API/health 경로가 모두 제외되는 것은 아니다. 앱의 실제 path와 basePath를 확인해 matcher/검사를 보완한다. authorization은 locale redirect와 별개다.

App의 page/layout과 특수 파일은 app/[lang] 아래에 둘 수 있다. 해당 root layout이 html lang을 설정하고 page/layout은 await params로 locale을 읽는다.

## 서버 사전과 locale 검증

~~~ts
import 'server-only'
const dictionaries = {
  en: () => import('./dictionaries/en.json').then(module => module.default),
  ko: () => import('./dictionaries/ko.json').then(module => module.default),
}
export const hasLocale = (value: string): value is keyof typeof dictionaries =>
  Object.hasOwn(dictionaries, value)
export const getDictionary = (locale: keyof typeof dictionaries) =>
  dictionaries[locale]()
~~~

page에서 await params 후 hasLocale로 검증하고 unsupported는 notFound 처리한다. `in`은 `constructor`, `toString` 같은 상속 속성도 허용하므로 지원 locale 검사에는 own property만 확인한다. 사용자 문자열을 임의 파일 import로 연결하지 않는다. 사전 전체를 서버에서 읽어 필요한 번역을 렌더하면 전체 JSON을 client bundle에 넣을 필요가 없다. Client child에 전달한 번역값이나 RSC 결과는 사용자에게 전송되므로 비밀을 사전에 두지 않는다.

generateStaticParams는 [{lang:'en'},{lang:'ko'}]를 반환해 locale route를 build할 수 있다. CMS 글 목록과 locale 조합, 없는 번역 fallback/404 정책은 따로 정한다.

## root-params로 깊은 서버 코드에서 읽는다

app/[lang]/layout.tsx가 root layout이면 next/root-params의 lang getter를 server utility에서 사용할 수 있다.

~~~ts
import { lang } from 'next/root-params'
import { notFound } from 'next/navigation'
export async function getCurrentDictionary() {
  const locale = await lang()
  if (!hasLocale(locale)) notFound()
  return getDictionary(locale)
}
~~~

getter 이름은 root layout 위의 dynamic segment에서 생성된다. Server Components/server utility에서 사용하며 Client Components, Server Actions, Route Handlers는 지원하지 않는다. import 자체가 Client 사용을 막아 추가 server-only 없이도 해당 경계를 강제한다. params 객체를 arbitrary 실행 환경에서 자동 사용할 수 있다는 의미가 아니다.

캐싱과 root param 의존은 프로젝트의 Cache Components 계약을 확인한다. route locale, translation library locale, html lang, canonical/hreflang metadata가 서로 일치해야 한다.

## 실제 언어 협상과 정적 locale layout

```ts
// proxy.ts
import { match } from '@formatjs/intl-localematcher'
import Negotiator from 'negotiator'
import { NextRequest, NextResponse } from 'next/server'
const locales = ['en', 'nl']
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (locales.some(l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)))
    return NextResponse.next()
  const languages = new Negotiator({
    headers: { 'accept-language': request.headers.get('accept-language') ?? '' },
  }).languages()
  const candidates = languages.flatMap(language => {
    if (language === '*') return [] // 구체적 언어가 없으면 아래 기본 locale을 쓴다.
    try { return Intl.getCanonicalLocales(language) }
    catch { return [] } // 잘못된 tag 하나가 요청 전체를 실패시키지 않게 한다.
  })
  const locale = match(candidates, locales, 'en')
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(url)
}
export const config = { matcher: ['/((?!_next).*)'] }
```

`en-US,en;q=0.5`라면 이 지원 목록의 en으로 협상한다. 아래 사전과 generateStaticParams도 en/nl로 일치시킨다. en-US/nl-NL처럼 지역별 URL이 필요하면 Proxy, 사전 key와 정적 params를 함께 확장한다. 라이브러리는 별도 설치한다. `*`는 합법적인 언어 범위지만 Intl locale tag는 아니므로 그대로 match에 넘기지 않는다. 이 예제는 유효한 구체 언어를 우선 협상하고 없으면 en으로 이동하는 UI 정책이다. q=0의 거부 조건까지 엄격하게 집행하여 406을 반환하는 HTTP 협상기가 필요하면 별도 정책을 구현한다. public asset 제외도 서비스 경로에 맞춰 보강한다.

`dictionaries/en.json`:

```json
{ "products": { "cart": "Add to Cart" } }
```

`dictionaries/nl.json`:

```json
{ "products": { "cart": "Toevoegen aan Winkelwagen" } }
```

```tsx
// app/[lang]/page.tsx
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from './dictionaries'
export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const dictionary = await getDictionary(lang)
  return <button>{dictionary.products.cart}</button>
}
```

dictionaries의 key와 generateStaticParams의 지원 목록을 일치시킨다. 앞 절 en/ko 예를 위 en/nl 사전에 적용하면 ko를 nl로 바꾼다. `PageProps`/`LayoutProps`는 생성된 global type helper다.

```tsx
// app/[lang]/layout.tsx
export function generateStaticParams() { return [{ lang: 'en' }, { lang: 'nl' }] }
export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  return <html lang={(await params).lang}><body>{children}</body></html>
}
```

root-params dictionary를 선택하면 page는 `const dictionary = await getCurrentDictionary()`만 호출한다. 사전 lookup/404가 utility로 옮겨진 것뿐이고 Client/Action/Handler에서 getter를 쓸 수 없다는 제한은 그대로다.

## library 선택과 학습 확인

next-intl, next-international, next-i18n-router, Paraglide, Lingui, Tolgee, next-intlayer, gt-next 등은 메시지 포맷/타입/라우팅/번역 운영 역할이 다르다. route만 필요할 때와 복수형/번역 workflow가 필요할 때 요구를 구분한다.

- 지원 locale이 아닌 /xx/products와 번역 없는 글의 처리를 설명한다.
- 사전을 Server에서 읽는 것과 번역 결과가 사용자에게 보이는 것을 구분한다.
- lang getter를 Route Handler에 쓰지 않고 request URL에서 locale을 검증하는 이유를 설명한다.

## 출처

- [Next.js, internationalization](https://nextjs.org/docs/app/guides/internationalization)

- [Negotiator, language selection — GitHub](https://github.com/jshttp/negotiator/blob/master/lib/language.js)
- [FormatJS, CanonicalizeLocaleList — GitHub](https://github.com/formatjs/formatjs/blob/main/packages/intl-localematcher/abstract/CanonicalizeLocaleList.ts)

## 관련 문서

- [[NextJS-Pages-Internationalization]]
- [[NextJS-Link-and-Form]]
