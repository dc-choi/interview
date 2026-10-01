---
tags: [browser, css, animation, transition, compatibility, accessibility]
status: done
verified_at: 2026-10-01
category: "CS - JavaScript"
aliases: ["Browser CSS Animation", "브라우저 CSS 애니메이션과 호환성"]
---

# 브라우저 CSS 애니메이션과 호환성

CSS transition은 property value 변화 사이를 보간하고 CSS animation은 `@keyframes` timeline을 실행한다. JavaScript timer로 frame을 직접 밀기 전에 CSS/Web Animations API가 rendering lifecycle과 사용자 접근성 요구를 더 잘 만족하는지 검토한다.

## transform과 transition

```css
.thumbnail {
  overflow: hidden;
}

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

hover 확대가 기대와 다르게 움직이면 세 가지 배치를 확인한다.

- selector: pseudo-class는 앞 selector에 붙여 쓴다. `.thumbnail:hover`는 hover된 `.thumbnail` 자신이고, `.thumbnail :hover`는 공백이 descendant combinator라 `.thumbnail` 안에서 hover 상태인 자손이다. hover된 element의 조상도 `:hover`에 일치하므로 중간 wrapper까지 함께 바뀐다.
- clip: transform은 element를 그린 결과 전체를 새 좌표계로 옮기므로 같은 element에 둔 `overflow: hidden`의 clip 영역도 함께 커진다. 확대는 자식 image에, clip은 변형하지 않는 wrapper에 둔다. clip을 목록 전체에 두면 목록 바깥 경계에서만 잘리고 항목끼리 겹치는 부분은 남는다.
- transition: 전환이 시작될 때 쓰는 duration, delay, timing function은 변화 후(after-change) style에서 찾는다. hover로 들어갈 때는 `:hover` 규칙이, 나올 때는 기본 규칙이 변화 후 style이다. transition을 `:hover`에만 두면 나올 때 기본 규칙의 duration 0s가 쓰여 즉시 돌아가므로 기본 상태에 둔다. 기본 상태에 둔 delay는 hover를 벗어날 때도 적용돼 반응이 늦어 보일 수 있다. 방향별로 다르게 하려면 `:hover`에 다른 duration이나 delay를 덮어쓴다.

timing function은 linear/ease/ease-in/ease-out/ease-in-out/cubic-bezier/steps 등으로 진행률을 정의한다. transition과 animation의 기본값은 `ease`이고 keyword는 다음 곡선과 같다.

| keyword | 정의 | 속도 변화 |
|---|---|---|
| `linear` | 입력 진행률을 그대로 출력 | 일정 |
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | 초반에 급히 가속하고 후반에 길게 감속 |
| `ease-in` | `cubic-bezier(0.42, 0, 1, 1)` | 느리게 시작해 가속한 채 끝남 |
| `ease-out` | `cubic-bezier(0, 0, 0.58, 1)` | 빠르게 시작해 감속하며 끝남 |
| `ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)` | 양 끝이 느림 |

- `transition` 한 항목에서 시간으로 해석되는 첫 값은 duration, 두 번째 값은 delay다. `transition: transform 1s 200ms`의 1s가 duration이고, 두 값의 순서를 바꾸면 의도한 delay가 duration이 된다. 시간을 하나만 쓰면 delay는 0s다.
- property마다 다른 값은 콤마로 항목을 나눈다(`transition: transform 180ms ease-out, opacity 120ms linear 60ms`). property를 생략하면 `transition-property` 초기값 `all`이 적용되므로 `transition: 180ms`는 `transition: all 180ms`와 같다.
- Web Animations API의 `element.animate()`는 `easing` 기본값이 `linear`라 CSS transition에서 옮긴 효과는 곡선이 달라진다.

duration과 delay가 UX 응답을 느리게 만들거나 motion sickness를 유발하지 않게 한다.

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
- prefix 선언을 남기면 표준 property를 마지막에 둔다. 지켜야 할 순서는 이것 하나이고 prefix끼리의 순서는 대개 결과를 바꾸지 않으므로 외울 대상이 아니다.
- experimental feature는 prefix보다 feature query, progressive enhancement와 fallback을 설계한다.
- obsolete prefix를 복사하면 dead code와 상충 declaration만 늘 수 있다.

표준을 마지막에 두는 이유는 두 규칙의 조합이다. parser는 모르는 property나 잘못된 값을 가진 선언 하나만 버리고, 남은 선언 사이에서 origin, importance, layer와 specificity가 같으면 나중에 나온 선언이 이긴다. 그래서 prefix만 아는 browser는 prefix 선언을, 둘 다 아는 browser는 마지막 표준 선언을 쓴다. 순서를 뒤집으면 둘 다 아는 browser가 초안 시절의 prefix 구현을 적용할 수 있다.

prefix 구현은 초안 문법을 따르므로 같은 값도 뜻이 다를 수 있다. `-webkit-linear-gradient()`는 2011년 초안 문법의 alias라 첫 인자가 시작 변(`top`)이고 각도는 오른쪽이 0deg, 반시계 방향이다. 표준 `linear-gradient()`는 도착 방향(`to bottom`)을 쓰고 위쪽이 0deg, 시계 방향이라 `-webkit-linear-gradient(0deg, ...)`는 `linear-gradient(90deg, ...)`와 같다. prefix 선언을 복사할 때 값의 의미까지 같다고 가정하지 않는다.

prefix가 selector에 붙으면 영향이 규칙 전체로 커진다. selector list에 browser가 모르는 selector가 하나라도 있으면 list 전체가 invalid라 style rule이 통째로 버려진다. `::-moz-selection, ::selection { ... }`은 `::-moz-selection`을 모르는 browser에서 `::selection` 스타일까지 적용되지 않으므로 규칙을 나눠 쓴다. `:is()`, `:where()`의 forgiving selector list는 모르는 항목만 버리지만 pseudo-element는 넣을 수 없다. 모르는 `::-webkit-` pseudo-element는 web compat 규칙에 따라 parse 시점에 유효로 취급되고 아무것도 match하지 않으므로 규칙을 무효로 만들지 않는다.

IE 사용자를 이유로 prefix 목록을 늘리던 판단은 현재 기준이 아니다. Microsoft Lifecycle 공지 기준 IE 11 desktop app은 2022-06-15 Windows 10 Semi-Annual Channel 등에서 지원이 끝났고, Windows 10 LTSC와 Windows Server의 IE 11은 이 공지 범위 밖이다. 남은 legacy 요구는 browser matrix에 명시하고 그 matrix로 prefix를 생성한다.

## JavaScript 연동

class를 토글해 state를 표현하고 `transitionend`/`animationend`는 event 누락, 여러 property, cancellation을 고려한다. business flow를 animation completion 하나에만 의존시키지 않는다. 복잡한 timeline/취소가 필요하면 Web Animations API의 `Animation` lifecycle을 검토한다.

## 출처

- [CSS Animations Level 1](https://www.w3.org/TR/css-animations-1/)
- [CSS Transitions Level 2](https://www.w3.org/TR/css-transitions-2/)
- [CSS Transitions Level 1, Starting of transitions](https://drafts.csswg.org/css-transitions-1/#starting), [CSS Easing Functions Level 1](https://drafts.csswg.org/css-easing-1/), [MDN, KeyframeEffect() constructor](https://developer.mozilla.org/en-US/docs/Web/API/KeyframeEffect/KeyframeEffect)
- [Media Queries Level 5, prefers-reduced-motion](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
- [Selectors Level 4, Invalid Selectors and Error Handling](https://drafts.csswg.org/selectors-4/#invalid), [Selectors Level 4, -webkit- Parsing Quirks for Web Compat](https://drafts.csswg.org/selectors-4/#compat)
- [CSS Cascading and Inheritance Level 5, Order of Appearance](https://drafts.csswg.org/css-cascade-5/#cascade-order), [CSS 2.1, Rules for handling parsing errors](https://www.w3.org/TR/CSS21/syndata.html#parsing-errors)
- [Compatibility Standard, -webkit-linear-gradient()](https://compat.spec.whatwg.org/#css-gradients-webkit-linear-gradient), [CSS Images Module Level 3, Linear Gradients](https://drafts.csswg.org/css-images-3/#linear-gradients), [CSS Image Values and Replaced Content Module Level 3, W3C Working Draft 17 February 2011](https://www.w3.org/TR/2011/WD-css3-images-20110217/)
- [Microsoft Lifecycle, Internet Explorer 11 desktop app support ended for certain versions of Windows 10](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support-windows-10)
- [transform/transition](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102186), [timing/delay](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102187), [vendor prefix](https://www.inflearn.com/courses/lecture?courseId=328275&unitId=102188)

## 관련 문서

- [[Browser-DOM-Manipulation-and-Safety|브라우저 DOM 조작]]
- [[Event-Bubbling-Capturing|DOM event 전파]]
- [[Browser-URL-Flow#6. 렌더링 파이프라인|브라우저 rendering pipeline]]
