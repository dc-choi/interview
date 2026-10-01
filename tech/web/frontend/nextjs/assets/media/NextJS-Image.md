---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image의 크기와 로딩 계약", "NextJS Image"]
---

# Image의 크기와 로딩 계약

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 이미지 최적화와 레이아웃 예약

`next/image`는 HTML img를 확장해 이미지 URL, srcset, 로딩을 관리한다. 실제 화면 크기는 CSS가 결정하고 `width`, `height`는 원본 비율과 공간 예약에 쓰인다. 이 둘을 혼동하면 CLS를 막으면서도 잘못된 해상도를 내려받을 수 있다.

| 입력 | 필요한 정보 |
| --- | --- |
| public 경로 문자열 | width/height 또는 fill |
| 절대 remote URL | remotePatterns 허용, width/height 또는 fill |
| 정적 import | 파일에서 크기 추론, 지원 raster 형식의 blur 추론 |

`src`와 `alt`는 필수다. alt는 이미지를 대신해도 문맥 의미가 유지되는 설명이며 캡션을 중복하는 부연 문장이 아니다. 순수 장식은 `alt=""`로 둔다. 원본 인증 헤더는 기본 optimizer가 전달하지 않으므로 보호 이미지에는 직접 제공 방식이나 `unoptimized`를 검토한다.

~~~tsx
import Image from 'next/image'
import photo from './photo.jpg'

export default function Card() {
  return <Image src={photo} alt="산 능선" sizes="100vw"
    style={{ width: '100%', height: 'auto' }} />
}
~~~

정적 import 또는 fill이 아니면 width와 height를 모두 지정한다. width를 CSS로 바꾸면 `height: auto`로 비율을 보존한다. fill은 부모를 채우며 img는 absolute positioning을 쓴다. 부모에 relative/fixed/absolute 위치와 실제 높이 또는 aspect-ratio가 있어야 한다.

~~~tsx
<div style={{ position: 'relative', aspectRatio: '16 / 9' }}>
  <Image src="/hero.jpg" alt="서비스 화면" fill
    sizes="(max-width: 768px) 100vw, 50vw"
    style={{ objectFit: 'cover' }} />
</div>
~~~

contain은 비율을 보존하고 안에 맞추며 cover는 빈 공간을 없애는 대신 잘라낸다. Image에는 className/style을 사용한다. scoped styled-jsx는 다른 컴포넌트 내부 img에 그대로 적용되지 않으므로 global 범위를 별도로 선택한다.

## sizes와 다운로드 해상도

`sizes`는 CSS를 바꾸는 속성이 아니라 브라우저에 예상 렌더 폭을 알려 srcset 후보를 고르게 하는 속성이다. fill/반응형 이미지에서 생략하면100vw로 가정해 불필요하게 큰 파일을 받을 수 있다.

sizes 없는 고정 크기는 보통1x/2x 제한 후보, sizes 있는 반응형은640w 등의 폭 후보를 만든다. 실제 grid 폭과 breakpoint를 같은 기준으로 맞춘다. `srcSet`은 직접 전달하지 않고 sizes, deviceSizes, imageSizes 또는 getImageProps를 사용한다.

quality는1~100, 기본75다. 허용 qualities에 없는 prop 값은 가장 가까운 값으로 보정된다. 직접 optimizer REST 요청은 허용되지 않은 quality에400을 반환한다. 낮은 품질 원본에 높은 quality를 적용해도 디테일이 복원되지 않는다.

## 로딩과 placeholder

| 선택 | 의미와 적용 조건 |
| --- | --- |
| loading lazy(기본) | viewport 근처까지 지연 |
| loading eager | 위치에 관계없이 즉시 요청 |
| fetchPriority high | 브라우저 요청 우선순위 힌트 |
| preload true | head preload link, 확실한 LCP 후보에 제한 |
| decoding async(기본) | 다른 화면 갱신과 decode 분리 |

16에서 priority가 deprecated 되고 preload가 추가됐다. preload를 loading/fetchPriority와 함께 사용하지 않는다. viewport에 따라 LCP 후보가 달라지면 모두 preload하지 않고 eager 또는 fetchPriority를 검토한다.

placeholder 기본 empty, blur에는 blurDataURL이 필요하며 data:image/...도 허용된다. 정적 jpg/png/webp/avif import는 애니메이션이 아니면 작은 blur를 자동 생성한다. remote/dynamic은 직접 제공한다. 작은10px 이하 이미지를 확대해 흐리게 하므로 큰 data URL은 전송 비용을 늘린다.

`onLoad(event)`는 img가 로드되고 placeholder가 제거된 뒤 실행된다. event.target이 img다. `onError(event)`는 로드 실패에 사용한다. 콜백은 Client Component에 둔다. deprecated `onLoadingComplete(img)`와 인자 형태가 다르다. decoding sync는 다른 갱신과 atomic presentation, auto는 브라우저 결정이다.

## 원본 유지와 진단

unoptimized는 크기/품질/형식 변환 없이 src를 제공한다. 작은 파일, SVG, 애니메이션이나 인증 원본에 적합할 수 있으며 전체 설정도 가능하다. svg로 끝나는 src는 자동으로 최적화를 우회한다.

overrideSrc는 생성되는 img의 src만 바꾸고 srcset은 그대로 둔다. 이미지 URL을 유지하는 마이그레이션에 쓰며 최적화 전체를 끄는 기능이 아니다. 일반 img 속성은 전달되지만 srcSet은 제외된다.

네트워크 탭에서 선택된 후보, 실제 표시 폭, 허용 URL, 원본 인증, optimizer 상태를 확인한다. Safari15~16.3 회색 테두리는16.4에서 수정됐다. 구형 Safari lazy/blur/aspect-ratio 지원 차이는 현재 최소 지원 기준과 구분한다. Firefox 로딩 중 흰 배경에는 placeholder/AVIF를 검토한다.

## 전체 prop 타입과 기본값

| prop | 타입 | 기본값 또는 필수 조건 |
| --- | --- | --- |
| src | string/static import | 필수, 내부 path/절대 remote URL/파일 객체 |
| alt | string | 필수, 장식은 빈 문자열 |
| width, height | 정수 px | static import/fill 외에는 두 값 필요 |
| fill | boolean | 기본 false |
| loader | `({ src, width, quality }) => string` | 사용자 URL 생성 함수 |
| sizes | string | 반응형/fill의 실제 CSS slot |
| quality | 정수 1~100 | 75, allowlist로 보정 |
| preload | boolean | false, loading/fetchPriority와 중복 지정하지 않음 |
| priority | boolean | v16 deprecated |
| placeholder | empty/blur/data image URL | empty |
| blurDataURL | data URL string | remote/dynamic blur면 직접 제공 |
| style, className | CSS 객체/string | native img 스타일 |
| loading | lazy/eager | lazy |
| decoding | async/sync/auto | async |
| unoptimized | boolean | false |
| overrideSrc | string | img src만 override |
| onLoad, onError | event callback | target은 native img |
| onLoadingComplete | img callback | v14 deprecated |

`onLoad={(event) => ...}`에서 이미지 치수는 `event.currentTarget.naturalWidth` 등으로 읽을 수 있다. `onError`에서는 target id/실패 상태를 기록한다. ref를 native img로 사용할 수 있으며 일반 native 속성은 전달된다. `srcSet`은 Image가 생성한다. App에서 함수 prop과 custom loader를 정의하는 모듈은 Client 경계, Pages는 일반 component 경계를 따른다.

작은 원본의 예시는 1KB 미만이다. 원본 제공이 더 효율적일 수 있으며 size 기준만으로 자동 opt-out하는 정책으로 이해하지 않는다. blurDataURL은 작은 단색 PNG나 Plaiceholder 등으로 준비할 수 있다. shimmer/color data URL은 임의 JavaScript가 아니라 이미지 placeholder로 사용한다.

## 학습 확인

- 원본 width1200, CSS width300일 때 예약 비율과 다운로드 후보를 구분한다.
- fill 부모 높이와 sizes가 각각 없을 때 실패 양상을 설명한다.
- 품질90 요청이 prop과 직접 REST 요청에서 어떻게 다른지 확인한다.

## 출처

- [Next.js, image](https://nextjs.org/docs/app/api-reference/components/image)

## 관련 문서

- [[NextJS-Image-Configuration]]
- [[NextJS-Image-Patterns]]
- [[NextJS-Pages-Images]]
