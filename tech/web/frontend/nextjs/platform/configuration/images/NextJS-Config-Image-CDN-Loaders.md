---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["이미지 CDN loader별 URL 변환", "NextJS-Config-Image-CDN-Loaders"]
---

# 이미지 CDN loader별 URL 변환

기준: Next.js 16.3.8 공식 문서. 실험 옵션은 정식 기능과 구분한다.

## loader input과 provider API

loaderFile은 앱 루트 상대 파일의 default function이다. ImageLoaderProps의 src:string, width:number, quality?:number를 받아 string URL을 반환한다. custom loader는 실제 이미지 bytes를 변환하지 않으며 provider가 width/quality/format을 구현해야 한다. Client 경계가 필요한 함수 serialization과 SSR 실행 가능성은 별개다.

## provider별 parameter 계약

| provider | 고유 변환 예시 |
| --- | --- |
| Akamai | query imwidth=width, quality는 예시에서 사용 안 함 |
| AWS CloudFront | format=auto, width, quality 기본 75 |
| Cloudinary | path f_auto,c_limit,w_WIDTH,q_QUALITY, quality 없으면auto |
| Cloudflare | /cdn-cgi/image/width=WIDTH,quality=QUALITY,format=auto/SRC, 기본 75 |
| Contentful | fm=webp,w,q, 기본 75 |
| Fastly | auto=webp,width,quality, 기본 75 |
| Gumlet | format=auto,w,q, 기본 75 |
| ImageEngine | imgeng=/w_WIDTH/cmpr_COMPRESSION, compression=100-(quality 또는 50) |
| Imgix | auto 기존 getAll 값을 comma 결합 또는 format, fit 기존 또는 max, w 기존 또는 width, q 기본 50 |
| PixelBin | /v2/CLOUD/t.resize(w:WIDTH)~t.compress(q:QUALITY)/SRC?f_auto=true, 기본 75 |
| Sanity | /images/PROJECT/DATASET/SRC, auto=format,fit=max,w, quality가 있을 때만q |
| Sirv | format 기존 getAll comma 결합 또는 optimal, w 기존 또는 width, q 기본 85 |
| Supabase | width,quality, 기본 75 |
| Thumbor | /WIDTHx0/filters:quality(QUALITY)/SRC, 기본 75 |
| ImageKit.io | ?tr=w-WIDTH,q-QUALITY, 기본 80 |
| Nitrogen AIO | 기존aio 항목에 w-WIDTH와 존재하는q-QUALITY를추가해semicolon결합 |

표의 기본 품질은 해당 공식 loader 예시의 fallback이며 Image quality prop 자체의 기본값/qualities allowlist와 구분한다. src의 leading slash, query와 URL encoding은 provider 형식에 맞춰 처리한다. 프로젝트, dataset, cloud 계정과 imagekit ID는 사용자 계정으로 교체하는 입력이다.

Imgix와 Sirv는 기존 width/auto/format/fit을 보존하는 URLSearchParams 접근을 보여 준다. quality는 예시의 선택값으로 덮어쓴다. ImageEngine은 quality와 compression을 반대 척도로 변환하므로 quality를 cmpr에 그대로 넣지 않는다. Nitrogen은 aio 기존 배열을 읽고 추가해 기존 directives를 보존한다.

## 수정할 예시와 SSR 경계

Thumbor 예시의 domain 바로 뒤 WIDTHx0 연결은 leading slash가 누락될 수 있다. 정상 URL은 origin/path separator와 filters, src를 명시적으로 연결한다. 제공자가 요구하는 서명/unsafe prefix는 실제 API 계약에서 별도로 확인한다.

Nitrogen 예시는 new URL(src,window.location.href)를 사용한다. loader가 server prerender에서 실행될 때 window가 없으므로 고정 public origin 또는 server/client에 유효한 base를 전달한다. use client를 붙이는 것만으로 SSR 중 window 접근이 안전해지지 않는다.

~~~ts
'use client'
import type { ImageLoaderProps } from 'next/image'
export default function cloudfront({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src, 'https://images.example.com')
  url.searchParams.set('format', 'auto')
  url.searchParams.set('width', String(width))
  url.searchParams.set('quality', String(quality ?? 75))
  return url.href
}
~~~

URL query를 set하면 width/quality를 문자열로 변환하고 반환은 url.href다. 각 provider의 인증/allowed origin/signature를 loader 코드에 넣을 때 browser에 전달되는 secret이 없는지 확인한다. 일반 로컬 파일은 provider 원본에 실제 업로드/접근 가능해야 한다.

## 학습 확인

- 같은 품질 75라도 ImageEngine의 cmpr와 다른 CDN의 q가 어떻게 다른지 설명한다.
- 기존 URL query를 보존하는 provider와 path transformation provider를 구분한다.
- SSR에서 window를 사용하는 loader를 production build로 확인한다.

## 출처

- [Next.js, images](https://nextjs.org/docs/app/api-reference/config/next-config-js/images)
- [Next.js, images](https://nextjs.org/docs/pages/api-reference/config/next-config-js/images)

## 관련 문서

- [[NextJS-Config-CSS-Images]]
- [[NextJS-Image-Configuration]]
