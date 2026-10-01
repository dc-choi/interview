---
tags: [nextjs, app-router, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["manifest, robots와 sitemap"]
---

# manifest, robots와 sitemap

## manifest와 web app 설정

app root의 manifest.json/manifest.webmanifest 또는 manifest.ts/js는 web app manifest를 제공한다. 코드 함수는 MetadataRoute.Manifest를 반환한다. 기본으로 static cache되는 special Route Handler지만 dynamic Request API를 쓰면 달라진다.

```ts
import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '지식 노트', short_name: '노트', start_url: '/',
    display: 'standalone', background_color: '#fff', theme_color: '#111',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  }
}
```

manifest에는 description 등 web manifest field를 넣을 수 있다. name/icons/display를 제공했다고 Service Worker, offline storage, push notification이 자동 구현되는 것은 아니다. public icon의 URL, 실제 size/type와 start_url의 basePath를 확인한다.

## robots의 규칙

app root robots.txt 또는 robots.ts는 crawler directive를 제공한다. function은 MetadataRoute.Robots를 반환한다. rules는 object 또는 array이며 userAgent, allow/disallow, crawlDelay를 지정할 수 있다. userAgent/allow/disallow는 string이나 array를 지원한다. sitemap은 string/array, host도 제공할 수 있다.

```ts
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/private/' }],
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

other는16.3부터 추가 custom directive를 key의 원래 casing대로 출력한다. 값은 string/number 또는 배열이 가능하다. framework가 모든 custom directive의 표준 적합성이나 target bot 지원을 검증하는 것은 아니다. robots는 crawl 협약이며 private endpoint의 auth를 대체하지 않는다. noindex metadata와 crawl 차단의 목적도 구분한다.

## sitemap의 entry

sitemap.xml 정적 파일 또는 sitemap.ts 함수는 공개 canonical URL을 검색엔진에 제공한다. MetadataRoute.Sitemap은 entry array다. 각 entry는 url과 선택 lastModified(Date/string), changeFrequency(always/hourly/daily/weekly/monthly/yearly/never), priority, alternates.languages, images, videos 등을 지원한다.

lastModified는 실제 content 수정 근거에 맞춘다. 매 build 시각을 모두의 수정 시각으로 쓰면 의미를 왜곡할 수 있다. languages는 실제 대체 language route, images/videos는 지원되는 각 spec의 URL/title/thumbnail 등 fields에 맞춘다. 우선순위 값이 검색 ranking을 보장하지 않는다.

## 여러 sitemap과 generateSitemaps

하위 route에 sitemap.ts를 두어 주제별로 분리하거나 generateSitemaps에서 {id} array를 반환한다. 각 sitemap function은16부터 id: Promise<string>를 받아 await한다. 예전15의 동기 id 예제를 그대로 쓰지 않는다. dev와 production은 `/.../sitemap/[id].xml` 주소 형식이 일치한다.

```ts
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }]
}
export default async function sitemap({ id }: { id: Promise<string> }) {
  const index = Number(await id)
  if (!Number.isInteger(index) || index < 0) throw new Error('Invalid sitemap id')
  const start = index * 50_000
  const rows = await getPublicRows({ offset: start, limit: 50_000 })
  return rows.map(row => ({ url: `https://example.com/posts/${row.slug}` }))
}
```

한 sitemap의50,000 URL 제한을 고려해 분리한다. ID range를 사용할 때 BETWEEN의 양끝 포함으로 경계 record가 중복되지 않게 end-exclusive 조건이나 offset/limit을 명시한다. 실제 total에 맞춘 shard 수와 비어 있거나 삭제된 route의 처리를 확인한다.

## 확인할 출력

manifest Content-Type/아이콘, robots path와 대소문자, sitemap의 XML namespace/escaping/절대 canonical URL을 검사한다. DB query 성공만으로 XML이 유효하다고 말하지 않는다. cache된 special endpoint라면 publish 이후 revalidation과 새 URL이 언제 노출되는지도 확인한다.

## manifest와 robots의 전체 입력

static manifest의 name/short_name/description/start_url은 root JSON/webmanifest에 넣는다. MetadataRoute.Manifest 함수 예는 display:'standalone', background/theme '#fff', icon:'/favicon.ico', sizes:'any', type:'image/x-icon'을 더한다. manifest 옵션은 web standard와 함께 바뀔 수 있으므로 설치된 MetadataRoute.Manifest 타입과 공식 spec를 확인한다.

Robots의 rules 단일 object는 userAgent?:string|string[], allow/disallow?:string|string[], crawlDelay?:number, other?:Record<string,string|number|Array<string|number>>다. array 형태에서는 userAgent가 필수이며 나머지는 같다. sitemap?:string|string[]와 host?:string은 top-level에 둔다. robots.js/ts는 기본적으로 cached special Handler이고 runtime API나 구형 dynamic config를 쓰면 달라진다.

static/코드 공통 예는 User-Agent:*에 Allow:/, Disallow:/private/와 absolute Sitemap을 설정한다. agent별 예는 Googlebot에 allow /와 private 차단, Applebot/Bingbot에 전체 / 차단을 두며 각각 agent block으로 출력한다. 비표준 other 예는 SeznamBot의 Request-Rate:'10/1m'이다. Yandex Clean-param도 대상 syntax에 맞춰 쓸 수 있다. casing과 verbatim 값을 보존하며 배열은 같은 agent block에 값마다 한 줄을 출력한다. Next는 custom 이름/값을 검증하지 않는다. robots는 13.3, other는 16.3에 도입되었다.

## sitemap XML과 확장 필드 예

기본 정적 XML은 urlset의 `http://www.sitemaps.org/schemas/sitemap/0.9` namespace와 entry의 loc/lastmod/changefreq/priority를 쓴다. MetadataRoute.Sitemap 예는 root에 yearly/1, about에 monthly/0.8, blog에 weekly/0.5를 설정해 같은 XML을 생성한다. lastModified는 string 또는 Date다. images:['https://example.com/image.jpg']는 xmlns:image='http://www.google.com/schemas/sitemap-image/1.1'과 image:image/image:loc를 출력한다. videos:[{title,thumbnail_loc,description}]는 xmlns:video='http://www.google.com/schemas/sitemap-video/1.1'과 각 video 태그를 출력한다.

alternates.languages:{es:URL,de:URL}는 root/about/blog 각각의 번역 URL을 넣고 xmlns:xhtml='http://www.w3.org/1999/xhtml'의 xhtml:link에 rel=alternate/hreflang/href를 출력한다. 기본 함수는 url:string 필수, changeFrequency 일곱 가지 union/priority?:number/languages/images?:string[]/videos?:Videos[]를 지원한다. sitemap handler는 기본 cache되며 runtime 접근 조건은 별도다.

분할은 root와 products별 nested 파일 또는 generateSitemaps의 [{id:0},{id:1},{id:2},{id:3}] 반환으로 가능하다. 실제 총 record 수로 shard 개수를 계산한다. id는 16부터 Promise<string>이므로 `Number(await props.id)`로 변환하고 검증한 뒤 offset/limit 또는 끝값을 제외하는 범위로 50,000개 이하를 읽는다. 원문의 `id * 50000`은 TS string 산술이고 inclusive BETWEEN 경계는 중복 또는 최대 50,001개 가능성이 있어 그대로 복제하지 않는다. product.date를 lastModified, BASE_URL/product/{id}를 url로 매핑한다.

| 버전 | 변경 |
| --- | --- |
| 13.3 | sitemap파일 |
| 13.3.2 | generateSitemaps,예전dev URL은sitemap.xml/[id] |
| 13.4.14 | changeFrequency/priority |
| 14.2 | languages대체URL |
| 15.0 | generateSitemaps dev/production URL일치 |
| 16.0 | sitemapid가Promise<string> |

## 이해 확인

1. robots disallow로 개인 데이터 접근이 차단되는가?
2. manifest만 추가하면 offline 읽기를 보장하는가?
3. shard 경계를 inclusive BETWEEN으로 나누면 어떤 중복이 생길 수 있는가?

## 출처

- [Next.js, manifest](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js, robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js, sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js, generate-sitemaps](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps)

## 관련 문서

- [[NextJS-App-Metadata-Contract]]
- [[NextJS-App-Route-Handlers]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Offline]]
