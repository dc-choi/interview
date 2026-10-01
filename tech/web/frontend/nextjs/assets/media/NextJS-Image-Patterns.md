---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image의 테마와 picture 패턴", "NextJS Image Patterns"]
---

# Image의 테마와 picture 패턴

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## getImageProps의 역할

`getImageProps(options)`는 `{ props }`로 기본 img에 전달될 속성을 반환한다. picture, canvas, wrapper에 최적화된 URL/srcset을 적용할 때 사용한다. React state를 쓰는 Image 경로를 피할 수 있지만 placeholder를 제거할 lifecycle이 없으므로 placeholder와 함께 사용하지 않는다.

~~~tsx
import { getImageProps } from 'next/image'
const { props } = getImageProps({ src: '/mountain.jpg', alt: '산 능선',
  width: 1200, height: 800 })
export default function Figure() {
  return <figure><img {...props} /><figcaption>산행 기록</figcaption></figure>
}
~~~

## Art direction과 반응형 해상도

srcset은 같은 이미지의 해상도 후보를 고르게 한다. art direction은 모바일/desktop에서 구도 자체가 다른 파일을 선택한다. 각각 getImageProps로 후보를 만든 뒤 source의 media로 분기한다.

~~~tsx
import { getImageProps } from 'next/image'
const common = { alt: '행사 안내', sizes: '100vw' }
const { props: { srcSet: desktop } } = getImageProps({ ...common,
  src: '/desktop.jpg', width: 1440, height: 875 })
const { props: mobile } = getImageProps({ ...common,
  src: '/mobile.jpg', width: 750, height: 1334 })
export default function Banner() {
  return <picture>
    <source media="(min-width: 1000px)" srcSet={desktop} />
    <img {...mobile} style={{ width: '100%', height: 'auto' }} />
  </picture>
}
~~~

비율이 다르면 viewport 전환에 따른 예약 공간도 점검한다. quality80/70을 쓰려면 qualities에 허용해야 하므로 예시 숫자가 실제 출력 quality를 보장하지 않는다.

## 밝고 어두운 테마

두 Image를 렌더하고 prefers-color-scheme으로 하나를 숨길 수 있다. 기본 lazy를 유지하면 선택된 이미지 로딩을 돕는다. 두 이미지에 preload/eager를 주면 숨긴 쪽도 다운로드될 수 있어 이 패턴에서 피한다. 우선순위는 fetchPriority high를 검토한다.

~~~css
.dark { display: none; }
@media (prefers-color-scheme: dark) {
  .light { display: none; }
  .dark { display: block; }
}
~~~

컴포넌트 API에서 preload/loading을 제외해 두 원본의 강제 선로딩을 막을 수 있다. 동일 의미 이미지면 같은 alt, 장식 배경이면 빈 alt다.

## CSS background와 마이그레이션

fill Image를 positioned viewport 컨테이너에 두고 cover/sizes100vw로 배경을 만들 수 있다. 장식 배경은 alt를 비우고 실제 내용을 별도 HTML로 제공한다.

CSS background가 필요하면 getImageProps의 srcSet을 `image-set(url(...) 1x, ...)`로 변환할 수 있다. 고정 크기 density descriptor에 적용하는 패턴이며 임의 원본을 검증 없이 CSS에 삽입하지 않는다. background에는 alt가 없으므로 정보를 배경에만 담지 않는다.

13의 현대 Image는 span wrapper와 layout/objectFit/objectPosition/lazyBoundary/lazyRoot props를 제거했다. object-fit/object-position은 CSS로 이동한다. 과거 컴포넌트는 next/legacy/image이며 현대 import와 계약이 다르다.

legacy codemod는 이름을 바꿔 기존 동작을 보존하는 단계다. modern 전환에서는 크기/부모 position/CSS를 실제 화면에서 확인한다. overrideSrc는 img src 유지에 사용하지만 srcset까지 동일한 것은 아니다.

## theme wrapper와 CSS image-set 코드

앞선 light/dark CSS class와 다음 wrapper를 함께 사용한다. alt와 크기 등 공통 props를 두 이미지에 전달한다.

```tsx
import Image, { type ImageProps } from 'next/image'
import styles from './theme.module.css'
type Props = Omit<ImageProps, 'src' | 'preload' | 'loading'> & {
  srcLight: string; srcDark: string
}
export const ThemeImage = ({ srcLight, srcDark, ...rest }: Props) => <>
  <Image {...rest} src={srcLight} className={styles.light} />
  <Image {...rest} src={srcDark} className={styles.dark} />
</>
```

App에서 직접 callback도 제공한다면 해당 module을 use client로 구성한다. CSS 클래스가 실제로 숨기는지와 두 이미지가 다운로드되는지는 network에서 확인한다.

```tsx
import { getImageProps } from 'next/image'
const { props: { srcSet = '' } } = getImageProps({
  alt: '', src: '/pattern.png', width: 128, height: 128,
})
const backgroundImage = `image-set(${srcSet.split(', ').map((candidate) => {
  const [url, density] = candidate.split(' ')
  return `url("${url}") ${density}`
}).join(', ')})`
export default function Background() {
  return <main style={{ minHeight: '100vh', backgroundImage }}>
    <h1>배경과 독립된 본문</h1>
  </main>
}
```

이 parser는 Next가 생성한 고정 크기 density srcset 형식에 한정한다. 임의 srcset 문자열이나 comma/space를 포함한 untrusted URL 처리용 범용 parser가 아니다. sizes가 있는 width descriptor를 같은 CSS density로 옮기지 않는다.

fill grid의 부모는 `position:relative`, 폭뿐 아니라 `height`/`aspectRatio`도 둔다. 예를 들어 400px card를 `aspectRatio:'4 / 3'`로 예약하고 `sizes="(min-width: 808px) 50vw, 100vw"`를 실제 grid 폭과 맞춘다. fullscreen background는 `position:relative; min-height:100vh` container와 fill/cover/sizes100vw를 결합한다. 정적 blur를 쓸 수 있고 품질100을 지정하려면 qualities 허용 목록에 100이 있어야 한다.

remote responsive는 width500/height300의 비율과 `width:'100%', height:'auto'`를 결합한다. objectFit은 crop CSS이고 sizes는 다운로드 slot이다. getImageProps art direction은 desktop1440x875와 mobile750x1334처럼 다른 원본/비율/quality를 선택하고 picture source media를 적용한다.

## 학습 확인

- 반응형 해상도와 art direction의 차이를 설명한다.
- getImageProps에서 blur를 사용할 수 없는 이유를 lifecycle과 연결한다.
- 테마 두 이미지의 preload가 중복 요청을 만드는지 확인한다.

## 출처

- [Next.js, image](https://nextjs.org/docs/app/api-reference/components/image)

## 관련 문서

- [[NextJS-Image]]
- [[NextJS-Image-Configuration]]
- [[NextJS-Pages-Legacy-Images]]
