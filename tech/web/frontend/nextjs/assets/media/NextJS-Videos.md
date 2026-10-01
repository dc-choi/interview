---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["영상의 로딩과 저장 경계", "NextJS Videos"]
---

# 영상의 로딩과 저장 경계

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 영상 제공 방식의 선택

직접 파일은 native video로 playback/control을 관리한다. YouTube/Vimeo 같은 platform은 iframe으로 제공해 운영/플레이어 기능을 맡긴다. 자체 호스팅은 저장/대역폭/변환/CDN 비용까지 책임진다. Next의 화면 streaming이 media transcoding이나 adaptive bitrate를 자동 제공하지는 않는다.

~~~tsx
export default function Video() {
  return <video width={640} height={360} controls preload="none"
    poster="/intro-poster.jpg">
    <source src="https://media.example.com/intro.mp4" type="video/mp4" />
    <track src="/intro-ko.vtt" kind="captions" srcLang="ko" label="한국어" />
    <a href="https://media.example.com/intro.mp4">영상 다운로드</a>
  </video>
}
~~~

width/height 또는 CSS aspect-ratio로 box를 예약해 CLS를 막는다. poster는 preload none에서 frame을 아직 받지 않아도 표시한다. subtitles는 대화 번역, captions는 청각 정보를 포함하는 용도로 요구에 맞게 선택한다. 표준 controls는 keyboard/screen reader 사용을 돕는다.

## preload와 autoplay

preload none은 재생 전 다운로드를 줄이고 metadata는 길이/크기 등 metadata, auto는 더 적극적인 로딩 힌트다. browser 정책에 따라 실제 요청은 달라질 수 있다.

autoPlay에는 보통 muted와 iOS playsInline이 필요하지만 모든 환경에서 자동 재생을 보장하지 않는다. loop는 반복 playback이다. 배경 영상은 사용자의 reduced motion/데이터 사용과 pause UI를 제품 기준에 맞게 검토한다.

iframe은 title, allowFullScreen, loading lazy, 크기/aspect-ratio를 지정한다. sandbox는 provider가 필요로 하는 권한과 기능을 확인해 선택한다. fold 위의 중요한 player는 lazy 선택이 적절한지 확인한다. responsive CSS는 iframe 자체와 주변 box 모두에 적용한다.

~~~tsx
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="서비스 소개"
  loading="lazy" allowFullScreen
  style={{ width: '100%', aspectRatio: '16 / 9', border: 0 }} />
~~~

## 서버 URL 조회와 Suspense

async Server Component가 CMS/storage에서 player URL을 조회하고 Suspense로 주변 페이지를 먼저 보낼 수 있다. skeleton은 최종 box와 같은 비율을 예약한다.

~~~tsx
import { Suspense } from 'react'
const Player = async () => {
  const src = await getVerifiedVideoUrl() // 서비스의 server 함수
  return <iframe src={src} title="소개" allowFullScreen
    style={{ width: '100%', aspectRatio: '16 / 9' }} />
}
export default function Page() {
  return <Suspense fallback={<div style={{ aspectRatio: '16 / 9' }}>준비 중</div>}>
    <Player />
  </Suspense>
}
~~~

이 boundary는 서버 URL 조회/render를 기다린다. 브라우저가 iframe player나 video bytes를 모두 다운로드한 시점까지 기다리는 것은 아니다. 실제 playback ready UI는 media/player events와 별도로 연결한다.

## storage 결과와 운영 책임

Vercel Blob은 dashboard/server/client upload로 저장하고 @vercel/blob list 등으로 URL을 가져올 수 있다. prefix/limit 조회가 정확한 파일 존재/순서를 보장한다고 가정하지 않는다. 결과 없음을 처리하고 video/caption 경로를 각각 확인한다. blobs[0], blobs[1]을 검증 없이 서로 다른 파일 역할로 사용하지 않는다.

고정 객체 ID/manifest로 영상 URL과 caption URL을 함께 관리하면 잘못된 subtitle 매칭을 줄일 수 있다. runtime upload는 public 디렉터리가 아니라 별도 object storage에 저장한다.

MP4/WebM의 container와 codec 지원, compression, resolution/bitrate, CDN egress를 함께 검토한다. FFmpeg 등으로 인코딩하고 모바일/네트워크 조건에서 확인한다. adaptive bitrate가 필요하면 HLS/DASH와 플레이어/hosting 기능을 별도로 선택한다.

next-video는 Blob/S3/Backblaze/Mux 등의 저장 통합을 제공한다. Cloudinary CldVideoPlayer, Mux, Fastly, ImageKit IKVideo는 각각 encoding/player/CDN 기능을 제공하는 후보이며 요구에 맞는 primary integration 자료를 확인한다. library 목록은 어느 서비스가 최선이라는 권고가 아니다.

## native 속성 전체와 Blob 조회 예제

| video 속성 | 타입/예시와 의미 |
| --- | --- |
| src | `/intro.mp4`, 직접 media 파일 URL, 또는 source child 사용 |
| width, height | 320/240, player box 크기 |
| controls | boolean, 기본 재생 제어 |
| autoPlay, loop, muted | boolean, 자동 재생/반복/초기 음소거 |
| poster | `/poster.jpg`, 첫 frame 전 이미지 |
| preload | none/metadata/auto, 로딩 힌트 |
| playsInline | boolean, iOS에서 inline playback |

| iframe 속성 | 타입/예시와 의미 |
| --- | --- |
| src | provider embed URL |
| width, height | 500/300, box 크기 |
| allowFullScreen | boolean, 전체 화면 허용 |
| sandbox | 제한 policy, provider 호환 권한만 허용 |
| loading | lazy 등 로딩 policy |
| style | `{ border: 0, aspectRatio: '16 / 9' }` |
| title | 접근성 frame 설명 |

외부 player의 source URL을 조회하는 Server Component에는 Suspense를 둘 수 있다. fallback `<p>영상 준비 중</p>` 또는 최종 player 비율을 예약한 skeleton을 선택한다. 제한 데이터 요금제와 network 조건에서 iframe/media 로딩 policy를 조정한다.

Vercel dashboard Storage에서 Blob store를 선택하고 table 오른쪽 위 Upload로 파일을 올린다. server action upload 또는 client upload는 별도 provider 절차와 인증을 따른다. @vercel/blob을 설치하고 server에 조회 credential을 설정한다.

```tsx
// app/page.tsx
import { Suspense } from 'react'
import { list } from '@vercel/blob'
async function findFile(path: string) {
  const { blobs } = await list({ prefix: path, limit: 100 })
  return blobs.find(blob => blob.pathname === path)?.url
}
async function BlobVideo() {
  const [url, captionsUrl] = await Promise.all([
    findFile('intro.mp4'), findFile('intro.en.vtt'),
  ])
  if (!url) return <p>영상을 찾을 수 없습니다.</p>
  return <video controls preload="none" width={640} height={360} aria-label="소개 영상">
    <source src={url} type="video/mp4" />
    {captionsUrl && <track src={captionsUrl} kind="subtitles" srcLang="en" label="English" />}
    Your browser does not support the video tag.
  </video>
}
export default function Page() {
  return <Suspense fallback={<div style={{ aspectRatio: '16 / 9' }}>영상 준비 중</div>}>
    <BlobVideo />
  </Suspense>
}
```

원문의 prefix 조회+limit1/2와 blobs[0]/[1] 구조는 해당 파일의 존재나 역할을 보장하지 않는다. 이 예제는 정확한 pathname과 없는 결과를 검사한다. limit 밖의 파일 또는 pagination이 있는 큰 목록은 continuation cursor로 조회하거나 고정 manifest/객체 URL을 저장한다.

self-hosting은 소유/독립성, 배경 영상 등 맞춤 재생, traffic 증가에 대한 storage 성능/확장, 대역폭 비용과 기존 생태계 통합을 비교한다. MP4는 호환성, WebM은 web 목적에 맞는 선택 후보이며 실제 codec을 함께 확인한다. FFmpeg 압축은 화질과 용량을 조절하고 모바일은 낮은 해상도/bitrate를 검토한다. Blob 같은 storage는 CDN 기능을 함께 제공할 수 있다.

next-video의 Video는 Blob/S3/Backblaze/Mux 저장 통합, Cloudinary CldVideoPlayer는 drop-in player와 Adaptive Bitrate Streaming 예제, Mux는 course starter와 embedding 예제, Fastly는 on-demand/streaming delivery, ImageKit IKVideo는 Next 통합과 Node SDK를 제공하는 자료다. 기능 선택은 각 provider 문서에서 확인한다. accessible advanced player가 필요하면 react-player/video.js 같은 대안을 검토한다.

## 학습 확인

- Suspense 완료와 player playback ready를 분리해 설명한다.
- preload none 영상의 poster와 aspect-ratio가 필요한 이유를 설명한다.
- storage list 결과가 비었거나 caption 순서가 바뀌었을 때 처리를 정한다.

## 출처

- [Next.js, videos](https://nextjs.org/docs/app/guides/videos)

## 관련 문서

- [[NextJS-Third-Party-Integrations]]
- [[NextJS-Image]]
- [[NextJS-Pages-Deployment]]
