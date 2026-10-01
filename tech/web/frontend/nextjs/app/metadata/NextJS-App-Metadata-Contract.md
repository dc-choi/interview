---
tags: [nextjs, app-router, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Metadata의 평가, 병합과 streaming"]
---

# Metadata의 평가, 병합과 streaming

## 선언 위치와 우선순위

Server Component의 layout/page에서 static metadata object 또는 async generateMetadata를 export한다. 둘을 같은 segment에서 동시에 export할 수 없다. Client Component에는 이 export를 두지 않는다. file-based favicon/icon/OG/robots/sitemap metadata가 programmatic metadata보다 우선한다. 상위 layout의 default와 하위 page의 override 관계를 따져야 한다.

```ts
import type { Metadata, ResolvingMetadata } from 'next'
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  const inherited = (await parent).openGraph?.images ?? []
  return {
    title: post.title,
    openGraph: { images: [post.image, ...inherited] },
  }
}
```

params는 async다. page의 searchParams도 Promise이며 layout은 searchParams를 받지 않는다. parent는 먼저 resolve된 상위 metadata의 Promise다. fetch는 generateMetadata, page/layout, generateStaticParams 등에서 동일 요청이 memoize될 수 있다. ORM 조회는 React cache로 같은 render의 중복을 줄인다. notFound/redirect 같은 render control flow도 사용할 수 있다.

## shallow merge와 title

metadata는 root부터 leaf 순서로 평가하고 shallow merge한다. 중복 key는 마지막 segment가 덮어쓴다. openGraph/robots 같은 nested object도 field별 deep merge가 아니라 object 단위 replacement다. parent image만 유지하고 싶으면 await parent에서 가져와 명시적으로 합친다.

| title 형식 | 의미 |
| --- | --- |
| string | 해당 segment의 제목 |
| default | 자식이 title을 제공하지 않을 때 fallback |
| template | 자식의 제목에 적용할 pattern, %s 자리. default를 함께 정의 |
| absolute | 상위 template를 무시하는 완성된 제목 |

layout의 template는 해당 layout 자신의 title에 적용되지 않는다. page는 끝 segment라 자신의 template가 실질적인 자식 title을 만들지 못한다. 같은 segment의 title.default에도 그 segment template가 적용되는 것으로 생각하지 않는다.

## metadataBase와 URL 결합

metadataBase는 상대 canonical/OG image 등 URL field의 기준 URL이다. 일반 Metadata API에서는 new URL을 사용할 수 있다. use cache에서 반환하는 metadata라면 URL instance의 serialization 제한 때문에 string처럼 지원되는 값을 선택한다.

상대 URL은 slash를 정규화하여 metadataBase에 결합된다. leading slash나 ../를 넣어 일반 URL의 root-relative 동작을 기대하기보다 Next metadata의 composition 규칙을 확인한다. 이미 절대 URL인 field는 base를 우회한다. base 없이 상대 URL을 쓰면 build 오류가 날 수 있다. 개발 localhost fallback에 의존해 공개 OG/canonical을 생성하지 않는다.

## streaming과 bot

정적 metadata는 build/prerender에서 결정할 수 있다. request-time generateMetadata는 UI를 먼저 표시한 뒤 metadata가 준비되면 body에 append하는 streaming을 사용할 수 있다. DOM을 확인하는 bot은 이 값을 읽을 수 있다. HTML-limited bot은 head 안에 metadata가 필요하여 렌더링을 기다리는 blocking 경로를 사용한다.

htmlLimitedBots regex를 설정하면 기본 bot 목록에 추가하는 것이 아니라 전체 판단 규칙을 override한다. 모든 request를 HTML-limited로 취급하는 pattern은 streaming 이점을 줄인다. 실제 검색/공유 crawler를 공식 bot 동작과 함께 확인한다.

Cache Components에서 page 전체가 정적인데 metadata만 request data에 의존하면 의도를 모호하게 만든다. cache 가능한 metadata 조회에는 use cache를 적용한다. 의도적으로 request-time인 경우 explicit dynamic boundary/marker를 Suspense 아래에 두어 판단을 표현한다. 나머지 article까지 불필요하게 dynamic으로 만들지 않는다. viewport는 initial UI에 필요한 값으로 같은 streaming 계약이 아니므로 별도 문서를 따른다.

## 지원 범위와 검사

charset과 기본 viewport는 framework가 제공한다. metadata.themeColor/colorScheme/viewport는14부터 deprecated이며 viewport API로 옮긴다. http-equiv는 적절한 response header, base/noscript는 직접 markup, style은 CSS import, script는 Script component를 사용한다.

preload/preconnect/dns-prefetch 같은 resource hint는 ReactDOM API를 Client Component에서 사용해 서버 초기 render에 포함할 수 있다. Image/Font/Script는 필요한 resource hint를 자체 처리하기도 한다. metadata object에 지원하지 않는 key를 임의로 추가해 원하는 tag가 생긴다고 가정하지 않는다.

검증은 page 최종 DOM과 raw HTML, client navigation 뒤 값, bot용 응답, canonical 절대 URL, duplicate title/meta를 나누어 본다. 정상 browser head만 보고 공유 crawler preview가 올바르다고 단정하지 않는다.

## metadata 입문과 파일 제공

기본 head는 charset utf-8과 viewport width=device-width,initial-scale=1이다. static Blog layout은 Metadata title/description을 export한다. slug Page의 generateMetadata는 Promise params/searchParams와 ResolvingMetadata parent를 받아 post.title/description을 반환한다. DB getPost는 module의 React.cache(async slug => findFirst(eq(posts.slug,slug)))로 만든다. metadata와 Page가 같은 slug를 읽어 단일 render의 조회 결과를 공유한다.

파일 방식은 favicon/apple/icon, OG/Twitter, robots, sitemap의 static 또는 code variant다. special Handler는 기본 cached이며 production hash와 generated URL/type/size를 head에 자동 반영한다. Proxy matcher에서는 이 파일들을 제외한다. root favicon은 bookmark/search 표시, OG는 social preview용이다. root OG보다 blog OG가 우선하고 jpg 외 jpeg/png/gif도 지원한다. dynamic OG는 slug의 getPost와 1200x630 PNG size/JSX CSS로 생성한다. HTML head 태그는 DevTools에서 확인한다.

dynamic metadata는 UI를 막지 않고 별도 stream할 수 있으나 Twitterbot/Slackbot/Bingbot 같은 HTML-limited UA는 blocking head로 받는다. prerender page는 build에서 metadata가 이미 결정되어 stream하지 않는다. htmlLimitedBots로 판단을 customize하거나 streaming을 전면 disable할 수 있으며 UI 초기 표시 성능과 bot 조건을 함께 확인한다.

## 타입, title와 URL 조합 예

props params 표의 값은 await 후 shape다. shop/1은 {slug:'1'}, shop/1/2는 {tag:'1',item:'2'}, catch-all은 {slug:['1','2']}다. searchParams는 ?a=1에서 {a:'1'}, a/b별 string, ?a=1&a=2에서 {a:['1','2']}이며 Page만 받는다. PageProps/LayoutProps로 첫 인자를 typed하고 parent:ResolvingMetadata는 상위 결과의 Promise다. 반환은 Metadata 또는 Promise<Metadata>이며 정적 object와 일반/async 함수를 지원한다. JSDoc `@type {import('next').Metadata}`도 가능하다. IDE plugin은 명시 type이 없어도 검사를 돕는다. metadata export가 있는 Page는 server로 두고 hooks/events만 InteractiveComponent client 파일로 옮긴다.

title string은 그대로 title 태그가 된다. root default Acme와 child metadata={}는 Acme를 상속한다. root template '%s | Acme', default Acme와 하위 About은 About | Acme가 된다. 같은 segment의 title에는 자기 layout template가 적용되지 않는다. absolute About은 parent template를 무시한다. layout string/default는 가장 가까운 상위 template를 반영한 child default, layout absolute는 상위 template를 무시한 default, layout template는 새 child 규칙이다. page가 title을 생략하면 가까운 parent의 resolved title을 쓴다. 원문 absolute 예의 template-only parent는 default 필수 설명과 상충하므로 실제 예에는 default도 둔다.

metadataBase=https://example.com일 때 /와 ./는 origin에, payments,/payments,./payments,../payments는 모두 https://example.com/payments에 결합한다. 절대 beta URL은 그대로다. root base는 하위 모든 URL field에 적용된다. base와 canonical '/', languages '/en-US','/de-DE', OG '/og-image.png'는 완전한 URL 태그로 생성된다. base에 subdomain/base path도 가능하고 중복 slash는 하나로 정규화한다. cache 함수가 반환하는 URL instance는 지원되지 않으므로 직렬화 형태를 확인한다.

평가 순서는 root layout → blog layout → slug page다. root title Acme/openGraph{title,description}에서 blog가 title Blog/openGraph{title:Blog}를 설정하면 description은 사라진다. about이 title만 바꾸면 OG 전체는 상속한다. shared openGraphImage 상수를 각 page의 openGraph에 spread하면 image는 공유하고 title은 Home/About별로 선택할 수 있다.

## resource hint, dynamic metadata와 이력

Client PreloadResources는 ReactDOM.preload(href,{as}), preconnect(origin,{crossOrigin?}), prefetchDNS(origin)를 호출한다. initial SSR에서도 head의 preload/preconnect/dns-prefetch link를 출력하며 각각 resource 선제 다운로드, origin 연결 시작, DNS 미리 해결을 담당한다. next/font/image/script의 통합 hint와 중복 비용을 확인한다. unsupported http-equiv는 HTTP header, base/noscript는 직접 markup, style/stylesheet는 CSS import, script는 Script API로 작성한다.

Googlebot처럼 JS/DOM을 검사하는 bot은 metadata가 body에 append된 뒤 읽을 수 있다. facebookexternalhit 같은 HTML-limited bot은 head metadata가 완료될 때까지 block한다. `htmlLimitedBots: /.*/`는 모든 UA를 blocking으로 만들고 기본 목록을 override한다. streaming은 TTFB/LCP를 줄일 수 있으나 override는 response를 늦출 수 있다.

Cache Components의 다른 부분도 request time이면 metadata가 그 content와 함께 stream한다. 나머지 page가 완전히 prerender 가능하면 metadata만 runtime인 경우에는 명시적 선택이 필요하다. 외부 site-metadata DB는 generateMetadata의 use cache로 title/description을 반환한다. 개인화 cookie가 필요하면 Connection 컴포넌트에서 connection()을 await하고 null을 반환하여 Suspense의 DynamicMarker 안에 둔다. Page 상단에서 connection을 await하면 정적 article까지 shell에서 빠지므로 article과 marker를 형제로 둔다.

13.2metadata/generateMetadata도입,14.0metadata의viewport/themeColor/colorSchemedeprecated,15.2metadata streaming도입이다.

## 이해 확인

1. 하위 openGraph.description만 설정하면 상위 images는 자동 deep merge되는가?
2. htmlLimitedBots를 override하면 기본 bot 목록은 그대로 더해지는가?
3. generateMetadata와 viewport의 request-time 결과를 같은 streaming으로 취급해도 되는가?

## 출처

- [Next.js, metadata-and-og-images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js, metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Next.js, generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

## 관련 문서

- [[NextJS-App-Metadata-Fields]]
- [[NextJS-App-Metadata-Images]]
- [[NextJS-App-Viewport]]
- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-HTTP-Interrupts]]
