---
tags: [browser, css, animation, transition, compatibility, accessibility]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["Browser CSS Animation", "브라우저 CSS 애니메이션과 호환성"]
---

# 브라우저 CSS 애니메이션과 호환성

CSS transition은 property value 변화 사이를 보간하고 CSS animation은 `@keyframes` timeline을 실행한다. JavaScript timer로 frame을 직접 밀기 전에 CSS/Web Animations API가 rendering lifecycle과 사용자 접근성 요구를 더 잘 만족하는지 검토한다.

## transform과 transition

```css
.thumbnail img {
  transition: transform 180ms ease-out;
}

.thumbnail:hover img,
.thumbnail:focus-visible img {
  transform: scale(1.05);
}
```

- `transform: scale()`은 layout box 크기 자체를 바꾸지 않고 visual transform을 적용한다.
- `overflow: hidden`은 확대된 영역을 자르지만 focus outline/content clipping을 확인한다.
- `transition: all`보다 실제 변하는 property를 명시한다.
- transform/opacity는 compositor 최적화 후보지만 항상 별도 layer/GPU를 보장하지 않는다.
- `will-change`를 상시 남발하면 memory/layer 비용이 늘 수 있으므로 측정한다.

timing function은 linear/ease/ease-in/ease-out/ease-in-out/cubic-bezier/steps 등으로 진행률을 정의한다. duration과 delay가 UX 응답을 느리게 만들거나 motion sickness를 유발하지 않게 한다.

## reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .thumbnail img {
    transition: none;
  }
}
```

animation이 정보 전달의 유일한 수단이 되지 않게 하고 keyboard/focus interaction에도 같은 state 변화가 보여야 한다. 자동 반복/큰 이동에는 stop/pause 정책을 검토한다.

## vendor prefix는 compatibility data로 결정한다

과거의 `-webkit-`, `-moz-`, `-ms-`, `-o-` 목록을 모든 property에 기계적으로 붙이는 방식은 현재 코드의 기본이 아니다.

- target browser matrix와 현재 compatibility data를 확인한다.
- build pipeline의 Autoprefixer 같은 도구가 필요한 prefix만 생성하게 한다.
- 표준 property를 함께 유지하되 prefix 순서를 만능 규칙으로 외우지 않는다.
- experimental feature는 prefix보다 feature query, progressive enhancement와 fallback을 설계한다.
- obsolete prefix를 복사하면 dead code와 상충 declaration만 늘 수 있다.

## JavaScript 연동

class를 토글해 state를 표현하고 `transitionend`/`animationend`는 event 누락, 여러 property, cancellation을 고려한다. business flow를 animation completion 하나에만 의존시키지 않는다. 복잡한 timeline/취소가 필요하면 Web Animations API의 `Animation` lifecycle을 검토한다.

## 출처

- [CSS Animations Level 1](https://www.w3.org/TR/css-animations-1/)
- [CSS Transitions Level 2](https://www.w3.org/TR/css-transitions-2/)
- [CSS Conditional Rules, prefers-reduced-motion](https://drafts.csswg.org/mediaqueries-5/#prefers-reduced-motion)
- [transform/transition](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102186), [timing/delay](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102187), [vendor prefix](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102188)

## 관련 문서

- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작]]
- [[Event-Bubbling-Capturing|DOM event 전파]]
- [[Browser-URL-Flow#6. 렌더링 파이프라인|브라우저 rendering pipeline]]
