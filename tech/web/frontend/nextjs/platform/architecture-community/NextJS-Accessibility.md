---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 접근성과 route announcement", "NextJS-Accessibility"]
---

# Next.js 접근성과 route announcement

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## route announcer

full document navigation은 보조 기술이 page title을 읽을 수 있지만 client transition은 문서가 새로 load되지 않는다. Next.js는 next/link navigation에서도 route announcer를 제공한다. 읽을 page 이름은 document.title, 첫 h1, 마지막 URL pathname 순서로 선택한다.

page별 descriptive title과 heading을 제공하면 의미 없는 URL 대신 사용자가 이동한 곳을 알 수 있다. metadata가 늦게 바뀌는 dynamic page와 error/not-found에서도 title이 맞는지 확인한다. announcer가 있다고 모든 focus 이동과 dialog semantics가 해결되는 것은 아니다.

## lint와 runtime 확인

jsx-a11y 계열 lint는 aria-props/proptypes, unsupported elements, role required/supported props, image alt 등의 오류를 조기에 찾는다. Next.js 16은 ESLint CLI를 독립 실행해야 하므로 접근성 문서의 통합 lint 설명을 build 자동 검사 보장으로 취급하지 않는다.

keyboard로 모든 interactive element에 접근할 수 있는지, focus order/visible focus, dialog close/focus restoration, screen-reader announcement, forms labels/errors를 확인한다. 자동 lint는 contrast, 실사용 language 의미와 모든 interaction을 검증하지 않는다.

## 디자인 기준

WCAG 2.2와 WebAIM/A11y Project 체크리스트를 참고해 target conformance를 정한다. foreground/background contrast를 측정하고 animation에는 prefers-reduced-motion을 반영한다. route transitions와 dynamic content updates가 사용자에게 인지되고 키보드 흐름을 끊지 않도록 설계한다.

## 정확한 a11y lint 이름과 자료

aria-props는 속성 이름, aria-proptypes는 값 타입, aria-unsupported-elements는 element 지원, role-has-required-aria-props는 필수 속성, role-supports-aria-props는 role별 허용 속성을 확인한다. image alt, 올바른 role/aria도 포함한다. WCAG 2.2, WebAIM WCAG checklist, A11y Project와 foreground/background contrast, prefers-reduced-motion을 기준 자료로 연결한다. Next config lint 자동 실행을 보장하는 오래된 문구 대신 16의 독립 ESLint CLI를 따른다.

## 출처

- [Next.js, architecture/accessibility](https://nextjs.org/docs/architecture/accessibility)

## 관련 문서

- [[NextJS-ESLint]]
- [[NextJS-Browser-Support]]
