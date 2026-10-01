---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 next/legacy/image의 계약과 전환", "NextJS Pages Legacy Images"]
---

# 기존 next/legacy/image의 계약과 전환

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 호환 API의 유지 범위

Next.js 13에서 이전 next/image가 `next/legacy/image`로 이름을 바꿨다. v16에서 deprecated이며 미래 제거 예정이다. 이 문서는 기존 앱 유지와 migration용이다. 새 코드는 `next/image`를 사용하고 현재 optimizer/API는 [[NextJS-Image]]에서 확인한다.

## 기존 layout과 크기 모델

| layout | 크기 변화 | srcset와 주의 |
| --- | --- | --- |
| `intrinsic` 기본 | 컨테이너가 작아지면 축소, 원 크기보다 확대 안 함 | 1x/2x, sizes 무시 |
| `fixed` | 지정 width/height 고정 | 1x/2x, sizes 무시 |
| `responsive` | 부모 폭에 따라 축소/확대 | width 후보, 기본 100vw, 부모 block |
| `fill` | 부모의 두 축을 채움 | width 후보, 부모 relative와 크기 필요 |

width/height는 intrinsic/fixed에서는 표시 크기, responsive/fill에서는 원본 비율이다. static import와 fill 이외에는 필요하다. remote src는 remotePatterns에 허용해야 한다. fill의 objectFit/objectPosition으로 crop과 위치를 조정한다.

```tsx
import Image from 'next/legacy/image'

<div style={{ position: 'relative', height: 240 }}>
  <Image src="/cover.jpg" alt="표지" layout="fill" objectFit="cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
</div>
```

sizes는 실제 slot 폭을 브라우저에 알려 다운로드 후보를 고르고 작은 srcset 후보를 줄인다. 이를 생략하면 100vw로 큰 이미지를 받을 수 있다. 폭이 3배여도 파일 크기가 반드시 9배라는 식으로 모든 codec의 결과를 단정하지 않는다.

## 기존 loading과 callback

`priority`는 preload하고 lazy loading을 끄며 화면 위 LCP 후보에 사용한다. 기본 loading은 lazy이고 eager는 즉시 로드한다. `placeholder`는 empty/blur, static jpg/png/webp/avif는 blurDataURL 자동 생성, dynamic src는 직접 제공한다. 작은 base64 thumbnail을 사용한다.

legacy `onLoadingComplete`는 `{ naturalWidth, naturalHeight }` 객체를 받는다. native img ref가 아니다. `style`보다 layout 자동 style이 우선할 수 있다. width CSS를 바꾸면 height:auto로 비율을 보존한다.

`lazyBoundary` 기본 200px은 IntersectionObserver margin, `lazyRoot`는 scroll parent DOM ref다. custom component면 ref forwarding이 필요하다. srcSet/ref는 직접 전달하지 않고 decoding은 async다. `unoptimized`는 원본 src를 그대로 사용한다.

## optimizer 설정과 cache

loader는 `{ src, width, quality }`에서 URL string을 만든다. legacy는 default, imgix, cloudinary, akamai, custom provider config를 사용했고 기본 path는 `/_next/image`다. static export는 기본 optimizer 서버가 없으므로 다른 loader가 필요하다.

remotePatterns는 protocol/host/port/path/query를 제한하고 search는 정확한 문자열이다. `*`는 한 segment/subdomain, `**`는 끝 path 또는 앞 subdomain 여러 개다. 중간에는 쓰지 않는다. 필드 생략은 넓은 wildcard가 되므로 의도한 범위만 허용한다. domains는 v14부터 deprecated이며 protocol/port/path 제한을 못 한다.

deviceSizes 기본 `[640,750,828,1080,1200,1920,2048,3840]`, imageSizes 기본 `[32,48,64,96,128,256,384]`는 후보 폭이다. imageSizes는 작은 slot용이며 최소 deviceSizes보다 작게 정한다. quality는 1~100, 기본 75다. 현재 v16 quality 허용목록 설정도 사용한 optimizer와 함께 확인한다.

format은 Accept header와 설정 순서로 선택하고 기본 WebP다. AVIF는 encoding 비용과 저장소를 늘릴 수 있다. CDN/proxy가 Accept를 전달해야 한다. animated GIF/APNG/WebP 감지는 best effort이며 확실히 bypass하려면 unoptimized로 지정한다.

기본 optimizer 결과는 `<distDir>/cache/images`에 저장하고 만료 후 stale 응답과 background 재최적화를 한다. TTL은 minimumCacheTTL과 upstream Cache-Control 중 긴 값이고 upstream s-maxage가 max-age보다 우선한다. 현재 기본 minimumCacheTTL은 14400초다. MISS/HIT/STALE을 관측한다. 자동 invalidate API가 없어 src 변경 또는 cache 삭제가 필요할 수 있다. static import는 content hash로 immutable cache한다.

SVG는 script 등 active content 위험을 고려한다. 알려진 SVG는 unoptimized가 권장되고 optimizer 허용에는 dangerouslyAllowSVG와 attachment, 제한적인 CSP를 함께 검토한다. 기본 Content-Disposition은 attachment다. `disableStaticImages`는 다른 image import plugin과 충돌하는 경우에만 선택한다.

## 새 Image로 옮길 때

새 API는 span wrapper를 없애 native img aspect ratio를 사용하고 layout/objectFit/objectPosition을 CSS로 옮긴다. IntersectionObserver 대신 native lazy loading으로 바뀌어 lazyBoundary/lazyRoot는 제거된다. alt는 필수이고 onLoadingComplete argument는 img reference로 달라진다. 현재 onLoadingComplete도 deprecated이므로 onLoad 사용을 검토한다.

codemod의 static 사용 변환과 props spread 동적 사용을 구분해 수동 검토한다. wrapper selector, loading, crop, CLS/LCP, remote restriction과 이미지 요청량을 전환 전후 비교한다.

## scroll root와 custom loader의 기존 예제

```tsx
import Image from 'next/legacy/image'
import { useRef } from 'react'

export default function Gallery() {
  const root = useRef<HTMLDivElement>(null)
  return <div ref={root} style={{ overflowX: 'scroll', width: 500 }}>
    <Image lazyRoot={root} lazyBoundary="200px" src="/one.jpg"
      alt="첫 사진" width={500} height={500} />
    <Image lazyRoot={root} src="/two.jpg" alt="둘째 사진"
      width={500} height={500} />
  </div>
}
```

custom Container를 쓰면 `forwardRef<HTMLDivElement, { children: ReactNode }>((props, ref) => <div ref={ref}>...</div>)`로 실제 scroll DOM에 ref를 전달한다. lazyRoot 기본 null은 document viewport이고 lazyBoundary는 margin 유사 문자열이다.

```tsx
import Image from 'next/legacy/image'
const loader = ({ src, width, quality }) =>
  `https://images.example.com/${src}?w=${width}&q=${quality ?? 75}`
export default function Photo() {
  return <Image loader={loader} src="me.png" alt="프로필"
    width={500} height={500} onLoadingComplete={({ naturalWidth, naturalHeight }) => {
      console.log({ naturalWidth, naturalHeight })
    }} />
}
```

per-image loader는 images의 기본 loader 설정보다 우선한다. 기존 provider 예시는 `images: { loader: 'imgix', path: 'https://example.com/myaccount/' }`이며 Cloudinary/Akamai도 각 loader 이름을 쓴다. default는 dev/start/custom server에서 동작하고 Vercel에서는 플랫폼 optimizer를 사용한다. provider별 cache는 해당 서비스 정책을 따른다.

기본 optimizer가 모르는 형식이나 애니메이션 원본은 그대로 제공한다. 알려진 형식은 JPEG/PNG/WebP/AVIF/GIF/TIFF다. SVG는 unoptimized 또는 SVG 허용 config를 사용하며 신뢰 경계를 유지한다. legacy 원본 제공 wrapper도 `next/legacy/image`를 import하고 `<Image {...props} unoptimized />`를 반환한다. 전체 images.unoptimized는 v12.3부터 설정할 수 있다.

priority 기본 false, loading 기본 lazy, placeholder 기본 empty, quality 기본75다. modern preload와 legacy priority를 혼용하지 않는다. all layout에는 wrapper/sizer가 있고 responsive 부모는 display:block, fill 부모는 relative+크기다. automatic layout style은 inline style보다 우선할 수 있다.

캐시 진단은 `x-nextjs-cache`, Vercel은 `x-vercel-cache`를 읽는다. width 후보를 줄이고 출력 format을 하나로 제한하면 생성 variant와 저장량을 줄일 수 있다. Next의 기본값을 직접 덮어쓴 설정은 후속 default 변경을 따라가지 않으므로 upgrade에서 다시 검토한다. 공통 allowlist/format/TTL/SVG 설정의 구체 코드와 default는 [[NextJS-Image-Configuration]]에 연결하되 legacy loader config만 이 절을 따른다.

## 학습 확인

- intrinsic과 responsive가 원본보다 큰 부모에서 어떻게 다른지 확인한다.
- 새 API로 바꾼 뒤 wrapper 기반 selector가 남았는지 검색한다.
- sizes와 DPR이 다운로드 이미지 폭에 미치는 영향을 확인한다.

## 출처

- [Next.js, image-legacy](https://nextjs.org/docs/pages/api-reference/components/image-legacy)

## 관련 문서

- [[NextJS-Image]]
- [[NextJS-Pages-Deployment]]
- [[NextJS-Pages-Upgrades]]
