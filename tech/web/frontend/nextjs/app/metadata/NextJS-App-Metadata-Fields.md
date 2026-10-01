---
tags: [nextjs, app-router, metadata]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Metadata field와 출력 계약"]
---

# Metadata field와 출력 계약

## 기본 문서 정보

Metadata field는 supported key에 맞춰 head metadata를 생성한다. description, generator, applicationName, referrer, keywords(string/array), authors(name/url), creator, publisher, formatDetection(email/address/telephone 자동 인식) 등을 사용할 수 있다. 검색엔진이 모든 값을 동일하게 ranking signal로 사용한다는 계약은 아니다. content와 공개 주소에 맞는 값만 둔다.

```ts
export const metadata = {
  title: { default: '지식 노트', template: '%s | 지식 노트' },
  description: '공개 기술 지식을 정리합니다.',
  metadataBase: new URL('https://example.com'),
  alternates: { canonical: '/notes', languages: { ko: '/ko/notes', en: '/en/notes' } },
  formatDetection: { telephone: false },
}
```

웹 서비스 작성자 공개 정보와 vault 내부 제3자 개인정보를 구분한다. 문서 예시에는 실제 비공개 이름/연락처를 넣지 않는다.

## Open Graph와 Twitter

openGraph는 title, description, url, siteName, locale, type과 images를 지원한다. images는 URL 또는 width/height/alt 등이 있는 object 배열이다. videos/audio도 URL과 type/size 관련 field를 설정할 수 있다. article type에는 publishedTime, modifiedTime, expirationTime, authors, section, tags 같은 article 전용 field가 있다. 모든 type에 article fields가 동일하게 유효하다고 가정하지 않는다.

Twitter는 card(summary, summary_large_image, app 등), site/siteId, creator/creatorId, title, description, images와 app field를 지원한다. app에는 iPhone/iPad/Google Play용 id, url, name 등을 지정한다. OG 값과 Twitter 값이 공유되는 일부 fallback이 있어도 필요한 card/type/이미지 결과를 실제 출력에서 확인한다.

file-based OG/Twitter image는 object 안의 image 설정보다 우선할 수 있다. 이미지의 alt, 크기와 URL은 접근성 및 preview 계약에 맞춘다. 공유 crawler마다 지원하는 card/type가 다르므로 공식 spec과 실제 preview를 추가 확인한다.

## robot과 link 계열

robots는 index/follow/nocache와 googleBot별 noimageindex, max-video-preview, max-image-preview, max-snippet 같은 control을 제공한다. robots meta와 robots.txt는 별도이며 noindex와 crawl 차단의 의미도 다르다. private resource를 robots만으로 보호하지 않는다.

icons에는 icon, shortcut, apple과 other를 URL/string/object/array로 넣을 수 있다. media, type, sizes 같은 세부 field가 가능하다. manifest는 web app manifest URL이다. alternates는 canonical, languages, media, types의 link 대안을 설정한다. archives/assets/bookmarks와 pagination(previous/next)는 link 관계를 표현한다.

파일 convention 아이콘을 함께 사용할 때 이중/override 결과를 확인한다. canonical을 사용자 query나 임의 host로 구성하면 동일 content의 정본 주소가 흔들릴 수 있다.

## verification, app과 provider 확장

verification에는 google/yahoo/yandex/me 등 지원 provider와 other map을 쓸 수 있다. 검증 token은 공개 meta 방식으로 사용되는 값인지, server secret인지 구분한다. itunes는 appId/appArgument, appleWebApp은 capable/title/statusBarStyle/startupImage(media별 object 포함)를 지원한다.

appLinks는 iOS/Android/Web용 url/app_name/app_store_id/package 등을 표현한다. category는 content category, facebook은 appId 또는 admins 배열을 지원하며 동시에 지정할 수 없다. pinterest는 richPin, other는 사용자 정의 meta name/content를 string 또는 배열로 표현한다. other를 이용해 지원 key의 타입 오류를 무조건 우회하지 않는다.

## 임의 출력과 금지된 기대

| 요구 | 사용할 경계 |
| --- | --- |
| themeColor/colorScheme/viewport | viewport 또는 generateViewport |
| http-equiv 정책 | response HTTP header |
| base/noscript | layout/page의 직접 markup |
| CSS | CSS import 또는 필요한 stylesheet |
| script | Script component 등의 script API |
| preload/preconnect/DNS hint | ReactDOM resource hint API 또는 framework 통합 |

추가 field가 필요한 경우 exact meta/link tag 생성 결과를 확인한다. object의 field가 TS에서 통과하는 것과 browser/bot이 그 tag를 이해하는 것은 다른 증거다. nested object의 shallow merge와 file convention 우선순위 때문에 특정 field가 사라지면 이 두 규칙부터 확인한다.

## field에서 태그로 가는 구체적 대응

| 입력 | 생성되는 출력 |
| --- | --- |
| description/generator/referrer/creator/publisher | 같은 name의 meta content |
| applicationName | application-name meta |
| keywords:['Next.js','React','JavaScript'] | keywords content를 쉼표로 결합 |
| authors:[{name},{name,url}] | author meta와 URL의 rel=author link |
| formatDetection:{telephone:false,address:false,email:false} | format-detection의 telephone=no,address=no,email=no |
| robots.index/follow:true,nocache:false | robots content=index,follow |
| googleBot.index/follow:true,max-video-preview:-1,max-image-preview:large,max-snippet:-1 | googlebot meta의 각 directive |
| manifest:absoluteURL | rel=manifest link |
| category:technology | name=category content=technology |
| archives/assets/bookmarks:URL[] | 각각 같은 rel의 link |
| pagination.previous/next | rel=prev/next link |

OG website 예는 url/siteName, locale en_US, type website와 800x600/1800x1600 이미지 두 개(둘째는 alt 포함), 800x600 video, 단일 audio의 absolute URL을 설정한다. 출력 property는 og:title/description/url/site_name/locale/type 및 각 image/video/audio와 width/height/alt다. article 예는 publishedTime을 article:published_time, authors 배열을 반복 article:author로 출력한다. file-based image는 실제 파일과 config를 수동으로 동기화할 필요를 줄인다.

Twitter large image 예는 card/title/description/siteId/creator/creatorId/images URL을 twitter:card/title/description/site:id/creator/creator:id/image로 출력한다. app card 예는 images.url/alt와 app.name, id.iphone/ipad/googleplay, url.iphone/ipad를 넣어 twitter:app:name/id/url:{platform}을 만든다. card markup은 X 외의 서비스에서도 사용될 수 있다.

icon/shortcut/apple/other의 단일 string 또는 URL object 배열은 rel=icon/shortcut icon/apple-touch-icon/other.rel로 출력한다. dark media icon은 prefers-color-scheme 조건, 전용 apple icon은 sizes 180x180/type image/png를 지원한다. Chromium Edge는 msapplication-*가 더 이상 필요하지 않다. verification.google/yahoo/yandex는 google-site-verification/y_key/yandex-verification, other.me 배열은 반복 name=me를 만든다. itunes appId/appArgument는 apple-itunes-app의 app-id/app-argument로 출력한다. appleWebApp은 mobile-web-app-capable=yes, title/status bar와 media 조건의 startup image link를 만든다.

alternates.canonical은 canonical link, languages en-US/de-DE는 hreflang, media max-width 600은 media attribute, types application/rss+xml은 type attribute를 가진 alternate link다. appLinks.ios.url/app_store_id, android.package/app_name, web.url/should_fallback은 al:{platform}:{key} property meta로 변환된다. facebook.appId는 fb:app_id, admins string/array는 반복 fb:admins이며 둘을 동시에 쓰지 않는다. pinterest.richPin:true는 pinterest-rich-pin meta, other.custom:string 또는 string[]는 같은 name의 custom meta를 한 개 또는 반복 출력한다.

## 이해 확인

1. robots meta에서 noindex를 설정하면 confidential data 접근도 막히는가?
2. facebook appId와 admins를 함께 제공할 수 있는가?
3. metadata.other에 viewport를 중복 생성하면 framework viewport 계약이 해결되는가?

## 출처

- [Next.js, generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

## 관련 문서

- [[NextJS-App-Metadata-Contract]]
- [[NextJS-App-Crawler-Files]]
- [[NextJS-App-Viewport]]
- [[NextJS-App-Metadata-Images]]
