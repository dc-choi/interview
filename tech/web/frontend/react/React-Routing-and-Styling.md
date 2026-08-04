---
tags: [web, frontend, react, routing, css]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["React Routing and Styling", "React Router와 Styling"]
---

# React routing과 styling

Client routing은 URL, history와 화면 tree를 동기화한다. 단순히 state로 page component를 바꾸면 주소 공유, 뒤로 가기, 새로고침과 deep link 계약이 사라진다.

## React Router의 현재 선택지

현재 React Router 문서는 Declarative, Data, Framework 세 mode를 구분한다.

- Declarative mode는 `BrowserRouter`, `Routes`, `Route`로 URL과 element를 연결한다.
- Data mode는 route object, loader, action, pending/error와 revalidation을 router에 통합한다.
- Framework mode는 route module과 build integration까지 제공한다.

```jsx
<BrowserRouter>
  <Routes>
    <Route path="surveys/:surveyId/steps/:step" element={<SurveyStep />} />
  </Routes>
</BrowserRouter>
```

강의의 React Router v6 `Routes`, `element`, `useParams`, `useNavigate` mental model은 Declarative mode에서 여전히 유용하다. 설치한 current major의 import와 API를 공식 문서에서 확인하고, v5의 `Switch`, `component`, `useHistory` 예제와 섞지 않는다.

URL parameter는 string이고 외부 입력이다. 숫자 범위와 entity 존재를 검증하며 invalid step을 명시적인 오류나 redirect로 처리한다. 여러 step의 answer를 URL 전환마다 component local state로 잃지 않도록 state owner와 persistence를 설계한다.

`Link`는 client navigation과 접근 가능한 anchor semantics를 제공한다. click handler에서 모든 이동을 명령형 `navigate`로 처리하지 않고, submit 완료나 조건부 redirect처럼 imperative navigation이 필요한 경우에만 사용한다.

## styling 선택

React는 한 가지 CSS 방식을 강제하지 않는다.

| 방식 | 장점 | 확인할 경계 |
|---|---|---|
| CSS file/module | browser CSS model과 정적 추출 | naming, scope, build 설정 |
| inline `style` | 값 기반의 작은 dynamic style | pseudo selector, media query와 cascade 제한 |
| styled-components | component와 dynamic style co-location | runtime, SSR, tooling과 library version |
| design system | 일관된 token과 접근성 contract | customization, bundle과 upgrade 비용 |

JSX `style`은 JavaScript object이며 hyphen 대신 camelCase property를 사용한다. 숫자 값은 property에 따라 px로 처리되거나 unitless이므로 React DOM reference를 확인한다. `className`은 CSS class를 지정한다.

styled-components의 interpolation에는 외부 입력을 무검증으로 넣지 않고 variant를 제한된 token에 mapping한다.

```tsx
const tones = {
  primary: "var(--color-primary)",
  danger: "var(--color-danger)",
} as const;
```

색상, spacing과 typography를 token으로 관리하되 `constants/color.js`에 값만 모았다고 자동으로 design system이 되는 것은 아니다. 이름은 사용 목적을 표현하고 contrast, focus, disabled와 responsive state를 component contract로 검증한다.

## 관련 문서

- [[React-Application-Design|React application 설계]]
- [[Browser-URL-Flow|Browser URL 처리 흐름]]
- [[Browser-CSS-Animation-and-Compatibility|CSS animation과 browser compatibility]]

## 출처

- [React Router, Picking a Mode](https://reactrouter.com/start/modes)
- [React Router, Route](https://api.reactrouter.com/v7/functions/react-router.Route.html)
- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)
- [styled-components, Basics](https://styled-components.com/docs/basics)
- [styled-components, Security](https://styled-components.com/docs/advanced#security)
- IT Share, [React Router 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161803)
- IT Share, [React Router v6 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161804)
- IT Share, [Router로 survey step 구분](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161805)
- IT Share, [styled-components](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161807)
- IT Share, [질문 유형별 component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161808)
- IT Share, [Style variable](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161809)
- IT Share, [나머지 component styling](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161810)
