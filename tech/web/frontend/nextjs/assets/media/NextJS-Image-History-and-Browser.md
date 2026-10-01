---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image API의 버전 이력과 브라우저 예외"]
---

# Image API의 버전 이력과 브라우저 예외

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 현재 API와 legacy 변경의 구분

| 버전 | 변경 |
| --- | --- |
| 16.1.7 | maximumDiskCacheSize |
| 16.1.2 | maximumResponseBody |
| 16.0 | qualities 기본 [75], preload 도입, priority deprecated, local IP/redirect 제한 |
| 15.3 | remotePatterns URL object 배열 |
| 15.0 | Content-Disposition 기본 attachment |
| 14.2.23 | qualities |
| 14.2.15 | decoding/localPatterns |
| 14.2.14 | remotePatterns.search |
| 14.2.0 | overrideSrc |
| 14.1.0 | getImageProps stable |
| 14.0 | onLoadingComplete/domains deprecated |
| 13.4.14 | placeholder의 image data URL |
| 13.2.0 | contentDispositionType |
| 13.0.6 | ref |
| 13.0 | 기존 Image를 legacy로, future Image를 현재 Image로 rename |
| 12.3 | remotePatterns/unoptimized config stable |
| 12.2 | remotePatterns/unoptimized experimental, layout raw 제거 |
| 12.1.1 | style, experimental layout raw |
| 12.1.0 | dangerouslyAllowSVG/contentSecurityPolicy |
| 12.0.9 | lazyRoot |
| 12.0 | formats/AVIF, wrapper div에서 span |
| 11.1 | onLoadingComplete/lazyBoundary |
| 11.0 | static import src, placeholder/blurDataURL |
| 10.0.5 | loader prop |
| 10.0.1 | layout prop |
| 10.0 | next/image 도입 |

13.0 현재 Image는 span wrapper, layout/objectFit/objectPosition/lazyBoundary/lazyRoot와 provider별 built-in loader config를 제거했다. alt 필수화, native img reference callback으로 바뀌었다. old transform은 import rename과 behavior conversion을 구분한다.

## native lazy loading의 과거 예외

Safari15.4 이전은 lazy가 eager로 fallback할 수 있고 Safari12 이전 blur는 empty로 fallback할 수 있다. Safari15 이전 auto width/height 비율 보존이 없어 CLS가 생길 수 있다. 현재 최소 브라우저 지원과 과거 호환성 조건을 나눈다.

Safari15~16.3 gray border 문제는 16.4에서 수정됐다. 해당 구버전을 실제 지원할 때 다음 workaround 또는 fold 위 eager 로딩을 선택할 수 있다.

```css
@supports (font: -apple-system-body) and (-webkit-appearance: none) {
  img[loading="lazy"] { clip-path: inset(0.6px); }
}
```

Firefox67+의 로딩 중 white background에는 AVIF 또는 placeholder를 검토한다. 이미지의 코드 변경만으로 특정 브라우저 렌더 문제를 완전히 제거했다고 단정하지 않고 실제 지원 브라우저에서 확인한다.

## 출처

- [Next.js, image](https://nextjs.org/docs/app/api-reference/components/image)

## 관련 문서

- [[NextJS-Image]]
- [[NextJS-Pages-Legacy-Images]]
