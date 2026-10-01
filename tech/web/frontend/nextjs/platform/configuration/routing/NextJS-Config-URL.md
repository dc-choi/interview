---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js URL prefix와 정규화", "NextJS-Config-URL"]
---

# Next.js URL prefix와 정규화

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## basePath

문자열 기본값 `''`이며 `/docs`처럼 앱 전체를 sub-path에서 제공한다. build 시 client bundle에 인라인되어 runtime 환경 변수만 바꿔 변경할 수 없다. next/link와 router의 내부 link에는 자동으로 붙는다. `next/image`의 로컬 src는 `/docs/photo.png`처럼 명시적으로 prefix를 넣어야 한다. CDN host를 바꾸는 assetPrefix와 목적이 다르다.

## assetPrefix

CDN URL 문자열을 설정하면 `.next/static`의 JS/CSS가 `https://cdn.example.com/_next/static/...`에서 로드된다. public 파일에는 적용되지 않으며 직접 URL을 작성한다. Pages의 `/_next/data`는 getStaticProps/getServerSideProps 모두 main domain을 사용한다. ISR consistency 때문에 정적 props도 예외가 아니다.

CDN에는 `.next/static`만 `_next/static` 구조로 올린다. `.next` 전체를 공개하면 server code와 configuration이 노출될 수 있다. 개발 phase에서는 prefix를 해제하고 production에서만 켤 수 있다. Vercel에서는 CDN이 자동 설정되어 보통 수동 prefix가 필요 없다.

## trailingSlash

boolean 기본 false는 `/about/`를 `/about`으로 redirect한다. true는 반대이며 static file extension URL과 `.well-known/`은 예외다. export에서는 true가 `/about/index.html`, false가 `/about.html`을 만든다.

## skipTrailingSlashRedirect

boolean 기본 비활성화이며 true면 자동 slash redirect를 끈다. `/about`과 `/about/`를 요청한 형식으로 제공하고 client navigation도 그대로 유지한다. 사용자 정의 redirects/rewrites는 여전히 적용된다. trailingSlash 설정 자체는 generated URL과 export filename에 영향을 주므로 지우지 않는다.

마지막 segment에 dot이 있으면 기본 normalization은 파일처럼 취급해 slash를 제거한다. `/version/1.2.3/`와 `/gcc.git/`도 대상이다. 앞 segment의 dot은 같은 의미가 아니다. 두 형식을 모두 제공하면 SEO 중복이 생기므로 canonical URL 또는 선택적 Proxy redirect를 설정한다. 13.1부터 있는 고급 옵션이며 일반 앱에는 기본 동작이 적합하다.

## skipProxyUrlNormalize

boolean true면 Proxy 입출력의 URL normalization을 해제한다. App에서 `_rsc` query와 rsc/router headers가 보존되고 Pages에서는 `/_next/data/build-id/hello.json`이 `/hello`로 바뀌지 않고 그대로 보인다. redirect Location과 rewrite destination도 작성한 그대로 전달된다.

```js
export default { skipProxyUrlNormalize: true }
```

Proxy matcher는 여전히 destination URL을 기준으로 작동하며 filesystem routing과 next.config의 redirects/rewrites가 다른 규칙으로 바뀌지 않는다. 내부 navigation header에 따라 서로 다른 보안/콘텐츠를 제공하지 않는다. 16에서 `skipMiddlewareUrlNormalize`를 개명했고 옛 이름은 warning을 내며 양쪽을 동시에 설정하면 오류다.

## 확인 예시

sub-path, CDN, direct load, Link navigation, data/RSC request와 slash URL을 각각 확인한다. `/docs/about`, `/docs/about/`, public image, hashed chunk가 같은 배포를 가리키는지 검사한다. 설정 단위 테스트만으로 Proxy와 CDN의 조합을 증명할 수 없다.

## Proxy 정규화의 각 필드

| 대상 | 기본 normalization | skipProxyUrlNormalize:true |
| --- | --- | --- |
| nextUrl | data URL을 route로 복원하고 locale 추출 | 요청 pathname 그대로 |
| request.url | normalized URL | 원본 request URL |
| _rsc query | 제거 | 유지 |
| navigation headers | 제거 | 유지 |
| rewrite destination | build ID로 재serialize | 작성한 URL 그대로 |
| redirect Location | relative URL로 변경 | 작성한 URL과 slash 유지 |
| trailingSlash:true | Proxy 전 slash 추가 | pathname 변경 없음 |

유지하는 내부 header는 rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, next-hmr-refresh다. App client navigation에서 _rsc 값과 rsc:'1'을 읽을 수 있고 기본 설정에서는 null이다. matcher의 경로 매칭 설정을 바꾸는 flag는 아니다. 13.1의 옛 이름 도입, 16.0 개명/codemod, 두 이름 동시 설정의 오류를 구분한다.

## slash 응답과 선택적 Proxy

존재하는 /about route에서 trailingSlash:false이면 /about은 200, /about/은 308로 /about에 redirect한다. true이면 반대로 /about이 308, /about/이 200이다. skip:true이면 두 형식 모두 원래 요청 그대로 제공하며 사용자 redirect/rewrite는 여전히 적용한다. 200 예시는 route 존재가 전제이며 임의의 없는 경로가 200이 된다는 보장은 아니다.

마지막 segment에 dot이 있는 /gcc.git/와 /version/1.2.3/은 두 slash 설정 모두 308로 slash를 뺀다. /version/1.2.3/my-page/는 마지막 segment에 dot이 없어 true에서 유지하고 false에서 제거한다. /.well-known/x/도 true에서 유지, false에서 제거한다. skip:true는 이 자동 변환을 끄며 export에서 href /me를 /me/로 강제 변경하지 않는다.

legacy prefix만 원형을 보존하고 신규 route에 slash를 추가할 수 있다. prefix 검사는 정확한 path 또는 prefix+'/' 경계로 하고 redirect는 nextUrl.clone의 pathname만 바꿔 query를 유지한다.

~~~ts
const url = request.nextUrl.clone()
const path = url.pathname
const legacy = ['/docs', '/blog'].some(prefix =>
  path === prefix || path.startsWith(prefix + '/'))
const lastSegment = path.split('/').filter(Boolean).at(-1) ?? ''
if (!legacy && !path.endsWith('/') && !lastSegment.includes('.')
    && !path.startsWith('/.well-known/')) {
  url.pathname = path + '/'
  return NextResponse.redirect(url)
}
return NextResponse.next()
~~~

단순 startsWith('/docs')는 /docs-old까지 포함하므로 분기 범위를 검증한다. 13.1부터의 고급 flag이며 일반 앱은 기본 정규화를 시작점으로 사용한다.

## trailingSlash의 정적 export와 예외

trailingSlash는 9.5에 추가됐다. 기본 false는 /about/를 /about로 redirect하며 true는 반대로 /about/를 canonical URL로 쓴다. 확장자 파일 /file.txt, /images/photos/picture.png와 /.well-known/subfolder/config.json은 slash를 붙이지 않는다. output: export에서 true이면 /about/index.html, false이면 /about.html을 생성하므로 static host의 URL 해석과 함께 정한다.

## Pages assetPrefix와 data request

assetPrefix는 public 파일에 자동 적용되지 않으며 Pages의 /_next/data getServerSideProps 요청은 동적이어서 main domain을 사용한다. getStaticProps data 요청도 ISR 지원과 일관성을 위해 실제 ISR 사용 여부와 관계없이 main domain을 사용한다. CDN에 JavaScript/CSS를 올리는 것만으로 이 JSON route까지 동일 prefix로 보내지 않는다.

## Pages Proxy의 data URL 확인

skipProxyUrlNormalize:true이면 client navigation GET /_next/data/build-id/hello.json의 nextUrl.pathname을 그대로 읽고 false이면 /hello로 정규화된다. data request와 직접 page 요청의 URL 차이를 허용하는 custom routing이라면 두 경로를 모두 처리한다. 이는 원문의 App RSC URL 예제와 구별되는 Pages 고유 사례다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath)
- [Next.js, pages/api-reference/config/next-config-js/basePath](https://nextjs.org/docs/pages/api-reference/config/next-config-js/basePath)
- [Next.js, app/api-reference/config/next-config-js/assetPrefix](https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix)
- [Next.js, pages/api-reference/config/next-config-js/assetPrefix](https://nextjs.org/docs/pages/api-reference/config/next-config-js/assetPrefix)
- [Next.js, app/api-reference/config/next-config-js/trailingSlash](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash)
- [Next.js, pages/api-reference/config/next-config-js/trailingSlash](https://nextjs.org/docs/pages/api-reference/config/next-config-js/trailingSlash)
- [Next.js, app/api-reference/config/next-config-js/skipTrailingSlashRedirect](https://nextjs.org/docs/app/api-reference/config/next-config-js/skipTrailingSlashRedirect)
- [Next.js, pages/api-reference/config/next-config-js/skipTrailingSlashRedirect](https://nextjs.org/docs/pages/api-reference/config/next-config-js/skipTrailingSlashRedirect)
- [Next.js, app/api-reference/config/next-config-js/skipProxyUrlNormalize](https://nextjs.org/docs/app/api-reference/config/next-config-js/skipProxyUrlNormalize)
- [Next.js, pages/api-reference/config/next-config-js/skipProxyUrlNormalize](https://nextjs.org/docs/pages/api-reference/config/next-config-js/skipProxyUrlNormalize)

## 관련 문서

- [[NextJS-Config-Redirects]]
- [[NextJS-Config-Rewrites]]
