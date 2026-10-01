---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image optimizer의 허용 범위와 캐시", "NextJS Image Configuration"]
---

# Image optimizer의 허용 범위와 캐시

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 이미지 URL도 서버 입력이다

기본 loader는 Next 서버가 원본을 가져와 변환하므로 원본 URL은 서버의 네트워크/CPU/메모리 사용을 유발한다. remotePatterns로 protocol, hostname, port, pathname, search를 제한한다. hostname만 허용하는 domains는14부터 deprecated다.

~~~js
export default {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'assets.example.com',
      port: '', pathname: '/account42/**', search: '' }],
    localPatterns: [{ pathname: '/assets/images/**', search: '' }],
    qualities: [50, 75],
    maximumRedirects: 0,
  },
}
~~~

불일치 원본은400을 반환한다. search 빈 문자열은 query 금지, `'?v=2'`는 정확한 query 허용이다. 생략은 임의 query 허용이다. URL 객체도15.3부터 지원되지만 new URL의 빈 search가 query 허용과 같지 않음을 확인한다.

`*`는 단일 path segment/subdomain, `**`는 경로 끝의 여러 segment 또는 hostname 시작의 여러 subdomain이다. 가운데 `**`는 지원하지 않는다. protocol/port/pathname/search 생략은 넓은 wildcard 효과가 있으므로 tenant별 저장소에서는 구체적으로 제한한다.

remote redirect 목적지는 remotePatterns로 다시 검사하지 않는다. 최대 기본3회이며 maximumRedirects0은 follow를 끈다. 초기 URL allowlist만으로 redirect 목적지까지 보장된다고 판단하지 않는다.

## 자원 사용과 SSRF 경계

| 설정 | 16.3.8 기준 동작 |
| --- | --- |
| maximumResponseBody | 원본 최대50,000,000bytes |
| maximumDiskCacheSize | 기본 startup 여유 disk의50%, 초과 시 LRU 삭제 |
| maximumDiskCacheSize0 | disk cache 비활성 |
| dangerouslyAllowLocalIP | 기본false, private network 접근 허용 시 SSRF 고려 |
| path | optimizer endpoint 기본 /_next/image |

disk 제한은16.1.7, body 제한은16.1.2부터다. 별도 cacheHandler를 사용하면 maximumDiskCacheSize는 무시된다. private IP 허용은 split-horizon DNS/VPC의400을 해결할 수 있지만 내부 서비스 접근 위험을 확대한다.

SVG는 vector라 resize 이득이 작고 스크립트/HTML 성격의 기능이 있다. 직접 unoptimized 제공을 우선 검토한다. optimizer에서 허용해야 한다면 다운로드 응답과 script 차단을 함께 둔다.

~~~js
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
~~~

contentDispositionType 기본은15부터 attachment다. 직접 endpoint 방문 시 다운로드하게 하는 보호이고 inline은 직접 렌더를 허용한다. images.contentSecurityPolicy는 이미지 응답 정책으로 앱 전체 CSP와 구분한다.

## 폭, 품질과 형식의 조합

기본 deviceSizes는 `[640,750,828,1080,1200,1920,2048,3840]`, imageSizes는 `[32,48,64,96,128,256,384]`다. 둘을 합쳐 후보 폭을 만든다. imageSizes는 화면보다 작은 sizes 이미지에 쓰며 가장 작은 deviceSizes보다 작게 둔다.

qualities 기본 `[75]`,16부터 허용 범위로 제한한다. 여러 품질은 변환 종류와 저장량을 늘린다. formats 기본 webp이며 Accept와 배열 순서로 출력 형식을 정한다. 불일치나 애니메이션은 원본 형식이다.

AVIF/WebP를 함께 쓰면 `['image/avif','image/webp']`로 우선순위를 정한다. 문서의 일반 비교는 AVIF encoding이 약50% 느리고 약20% 작다는 설명이며 모든 이미지의 성능 보장이 아니다. cold conversion, 실제 파일 크기, 저장량을 측정한다. 형식별 cache가 별도이며 CDN/Proxy는 Accept를 전달해야 한다.

## TTL과 무효화

minimumCacheTTL 기본14,400초(4시간)다. optimizer Max Age는 이 값과 원본 Cache-Control 중 큰 값이다. 원본이 긴 TTL을 내면 Next 설정을 줄여도 그것보다 짧아지지 않는다.

개별 정책은 /_next/image가 아니라 원본 /asset.jpg 응답에 headers로 설정한다. 일반적인 optimizer cache 무효화 API는 없으므로 변경 원본은 src 버전 변경을 고려한다. 필요하면 distDir/cache/images를 지우는 운영 절차를 사용한다. 정적 import의 내용 hash/immutable 응답은 변경 추적에 유리하다.

## 외부 loader와 빌드 경계

`loader({src,width,quality}) => string`은 URL 생성기이고 외부 이미지 서비스가 변환을 책임진다. per-image loader 또는 `loader:'custom', loaderFile:'./image-loader.js'`를 선택한다. loaderFile은 프로젝트 루트 상대경로의 default function export다.

전체 unoptimized:true는 최적화를 끄며 custom loader와 역할이 다르다. disableStaticImages는 다른 plugin의 이미지 import 처리와 충돌할 때 정적 이미지 import 기능을 끈다. static export는 기본 런타임 optimizer를 제공하지 않으므로 외부 loader/원본 제공으로 설계한다.

## 외부 loader와 비용 제한의 실행 설정

```js
// next.config.mjs
export default {
  images: {
    loader: 'custom',
    loaderFile: './image-loader.js',
    path: '/my-prefix/_next/image',
    maximumDiskCacheSize: 500_000_000,
    maximumResponseBody: 5_000_000,
    formats: ['image/avif', 'image/webp'],
    qualities: [25, 50, 75, 100],
    minimumCacheTTL: 14400,
  },
}
```

```js
// image-loader.js, App의 함수 전달 module은 Client 경계를 사용
'use client'
export default function loader({ src, width, quality }) {
  return `https://images.example.com/${src}?w=${width}&q=${quality ?? 75}`
}
```

custom loader일 때 실제 변환/cache/원본 크기 제한은 외부 서비스 책임이다. 위 Next default-loader 제한을 custom 서비스 보호장치로 오해하지 않는다. 각각을 사용하는 배포에서 필요한 설정만 선택한다. 전체 `unoptimized: true`는 별도 선택이며 source를 그대로 제공한다.

URL object 예시는 `remotePatterns: [new URL('https://example.com/account123/**')]`다. 같은 제한을 protocol=https, hostname=example.com, port='', pathname='/account123/**', search='' 객체로도 지정한다. subdomain 허용 `hostname: '**.example.com'`에서도 query/custom port를 막으려면 search/port를 명시한다. S3 공용 host는 hostname `s3.amazonaws.com`, pathname `/my-bucket/**`처럼 bucket 경로까지 제한한다.

최소 TTL을 31일로 늘리는 값은 `2678400`초다. 긴 TTL은 재최적화 호출을 줄이지만 원본 변경 반영이 느려지므로 content hash/src version을 함께 설계한다. 최대 disk 0은 cache를 끄고 최대 body 5,000,000 bytes는 50MB 기본보다 작은 허용 원본을 정한다.

## 학습 확인

- allowlist, redirect 제한, private network 차단의 책임을 구분한다.
- TTL을 줄였는데 오래된 이미지가 남으면 원본 header와 src를 확인한다.
- 형식/폭/품질 후보를 늘릴 때 저장 및 첫 요청 비용을 설명한다.

## 출처

- [Next.js, image](https://nextjs.org/docs/app/api-reference/components/image)

## 관련 문서

- [[NextJS-Image]]
- [[NextJS-Content-Security-Policy]]
- [[NextJS-Pages-Deployment]]
