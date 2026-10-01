---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router에서 현재 Image 적용", "NextJS Pages Images"]
---

# Pages Router에서 현재 Image 적용

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## Image 최적화와 페이지 renderer를 구분한다

현재 `next/image`의 src/alt, 크기, fill/sizes, preload/loading/fetchPriority, placeholder, loader와 optimizer 보안/cache 계약은 Pages와 App에서 대부분 공유된다. 상세 API와 사례는 [[NextJS-Image]]에 둔다. 기존 `<span>` wrapper와 layout/objectFit API는 [[NextJS-Pages-Legacy-Images]]에 따로 있다.

Pages 컴포넌트는 App의 Server Component 직렬화 경계가 없으므로 onLoad/onError/custom loader callback을 쓰기 위해 use client 지시문을 추가하는 계약이 아니다. 그러나 SSR에서도 렌더링할 수 있어 browser 전용 window 접근을 render 전에 실행하지 않는다.

```tsx
import Image from 'next/image'
import cover from '../public/cover.jpg'

export default function Page() {
  return <Image src={cover} alt="공개 글의 표지"
    style={{ width: '100%', height: 'auto' }}
    sizes="(max-width: 768px) 100vw, 50vw" />
}
```

static import는 원본 width/height와 blur 정보를 build에서 알 수 있다. remote URL은 크기와 허용 remotePatterns를 제공한다. fill은 부모의 크기/position과 object-fit 정책을 먼저 정한다. sizes는 CSS 표시 slot을 알려 주며 CSS 자체를 대신하지 않는다.

## 배포와 운영 판단

Node server/default optimizer는 request-time 최적화다. output:export는 기본 image optimizer를 실행할 서버가 없어 custom 외부 loader 또는 unoptimized를 선택한다. CDN에서 Accept와 query width/quality variant를 맞추고 인증된 이미지는 optimizer가 원 request의 인증 header를 그대로 전달한다고 가정하지 않는다.

Image를 쓰는 이유는 다운로드 양, CLS와 LCP를 개선하려는 것이다. 모든 이미지 preload는 대역폭 경쟁을 만들 수 있다. decorative alt는 빈 문자열, meaningful alt는 이미지의 용도를 설명한다. encoded optimizer URL과 원본 URL의 cache 정책을 구분한다.

## public, import와 remote의 시작 예제

```tsx
// pages/index.tsx
import Image from 'next/image'
import profile from '../public/profile.png'
export default function Page() {
  return <>
    <Image src="/profile.png" alt="작성자 사진" width={500} height={500} />
    <Image src={profile} alt="작성자 사진" placeholder="blur" />
    <Image src="https://s3.amazonaws.com/my-bucket/profile.png"
      alt="작성자 사진" width={500} height={500} />
  </>
}
```

public은 root 폴더이고 URL은 /profile.png다. static import는 intrinsic dimensions/지원 형식 blurDataURL을 제공한다. remote는 크기와 blurDataURL을 수동 공급하거나 fill 부모 box를 지정한다. S3 allowlist는 protocol:https, hostname:s3.amazonaws.com, port:'', pathname:'/my-bucket/**', search:''로 제한한다. 빈 src/치수 없는 최소 source 예는 실행 가능한 이미지가 아니므로 실제 파일과 필수 props로 바꿨다.

원문의 dynamic image import는 async Server Component와 app/blog/[slug]/page.tsx를 사용하므로 Pages renderer에 그대로 넣을 수 없다. App에서 필요한 경우 `await import('@/content/blog/images/'+imageFilename)`처럼 고정된 정적 prefix가 포함된 import를 사용하고 지원 bundler가 그 prefix 아래 파일을 bundle한다. alias는 실제 tsconfig paths 설정이 필요하다. Pages에서 dynamic file 선택은 검증한 build manifest 또는 getStaticProps/getServerSideProps로 image data를 제공한다. 이를 runtime filesystem의 임의 위치에 접근 가능한 loader로 해석하지 않는다.

## 학습 확인

- 실제 CSS 폭과 sizes가 같은지 browser network에서 확인한다.
- static export에서 optimizer URL로 실패하는 요청이 없는지 확인한다.
- legacy props가 새 Image에 남아 있지 않은지 검색한다.

## 출처

- [Next.js, images](https://nextjs.org/docs/pages/getting-started/images)
- [Next.js, image](https://nextjs.org/docs/pages/api-reference/components/image)

## 관련 문서

- [[NextJS-Image]]
- [[NextJS-Pages-Legacy-Images]]
- [[NextJS-Pages-Deployment]]
