---
tags: [web, frontend, react, routing, css]
status: done
verified_at: 2026-09-30
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
import { BrowserRouter, Routes, Route } from "react-router";

<BrowserRouter>
  <Routes>
    <Route path="surveys/:surveyId/steps/:step" element={<SurveyStep />} />
  </Routes>
</BrowserRouter>
```

강의의 React Router v6 `Routes`, `element`, `useParams`, `useNavigate` mental model은 v8의 Declarative mode에서도 유효하다. 바뀐 것은 package와 import 경로, 최소 요구 버전이다. 설치한 current major의 import와 API를 공식 문서에서 확인하고, v5의 `Switch`, `component`, `useHistory` 예제와 섞지 않는다.

| major | package와 import | 요구 조건 |
|---|---|---|
| v6 | `react-router-dom` | v6 시기 예제의 표준 |
| v7 | `react-router` import 권장, `react-router-dom`은 호환용 re-export이며 deprecated | React 18 이상 |
| v8 (2026-06-17) | `react-router-dom` 제거, `RouterProvider`와 `HydratedRouter`는 `react-router/dom`, 나머지는 `react-router` | Node 22.22.0+, React 19.2.7+, ESM-only, framework mode는 Vite 7+ |

2026-09-30 npm 기준 `react-router-dom`의 최신 배포는 7.18.4이고 v8 배포는 없다. `npm install react-router-dom`은 v7 호환 package를 설치하므로 v6식 code가 동작하더라도 current major가 아니다. v8로 올리려면 `react-router-dom`을 제거하고 import를 바꾼다. React 19.2.7 미만 app은 React를 먼저 올리거나 v7에 머문다.

`Link`는 client navigation과 접근 가능한 anchor semantics를 제공한다. click handler에서 모든 이동을 명령형 `navigate`로 처리하지 않고, submit 완료나 조건부 redirect처럼 imperative navigation이 필요한 경우에만 사용한다.

## navigation 뒤에 남는 state

Client routing은 History API의 `pushState`로 session history entry를 추가할 뿐 문서를 다시 요청하지 않는다. 뒤로 가기와 앞으로 가기는 `popstate`로 알려지고 router가 바뀐 URL에 맞는 element를 렌더링한다.

- 내부 이동에 `<a href>`를 쓰면 browser가 새 document를 요청해 page 전체를 다시 load하므로 JavaScript memory의 전역 store와 component state가 모두 사라진다. `Link`는 `<a>`를 렌더링하되 client navigation으로 처리하므로 Network 탭에 document 요청이 생기지 않는다.
- Router 안이지만 `Routes` 밖에 둔 element는 page 전환에도 유지되고 match된 route element만 바뀐다.

공통 layout의 위치에 따라 이동 뒤 남는 state가 달라진다.

| 배치 | 장점 | 한계 |
|---|---|---|
| App에서 `Routes` 전체를 layout으로 감싼다 | 중복이 없다 | 모든 page에 같은 틀을 강제해 전체 화면 page를 추가하기 어렵다 |
| page component마다 layout을 렌더링한다 | page별로 box, full 같은 layout을 고른다 | 이동 시 같은 위치에 다른 page component가 렌더링돼 layout subtree가 remount되고 menu 선택과 펼침 같은 내부 state, layout 안의 scroll 위치가 초기화된다 |
| path 없는 layout route와 `<Outlet />` | 여러 layout group을 두면서 같은 group 안의 이동에서는 layout을 유지한다 | layout 경계가 route tree에 드러나므로 route 정의와 함께 설계한다 |

```jsx
<Routes>
  <Route element={<MainLayout />}>
    <Route path="surveys" element={<SurveyListPage />} />
    <Route path="builder/:surveyId" element={<BuilderPage />} />
  </Route>
  <Route path="surveys/:surveyId/steps/:step" element={<SurveyStep />} />
</Routes>
```

`MainLayout`은 content 영역에 `<Outlet />`을 두고 child route는 그 자리에 렌더링된다. path 없는 route는 URL segment를 추가하지 않는다. page마다 선택된 menu key를 prop으로 넘기기보다 현재 route에서 derive한다([[React-Form-Builder-Practice#Admin과 UI library|Admin과 UI library]]).

## route parameter는 Hook 한곳에서 해석한다

resource identity는 `surveys/:surveyId`처럼 path parameter로, 선택적인 filter, 정렬과 page는 search parameter로 둔다. path 이름은 `page`, `test` 같은 임의 이름보다 `survey`, `done`처럼 화면 내용을 드러낸다. 질문 step을 route로 두면 browser 뒤로 가기로 이전 질문에 돌아갈 수 있다.

URL parameter는 string이고 외부 입력이다. 숫자 범위와 entity 존재를 검증하며 invalid step을 명시적인 오류나 redirect로 처리한다. 여러 step의 answer를 URL 전환마다 component local state로 잃지 않도록 state owner와 persistence를 설계한다.

```tsx
const useStep = (): number | null => {
  const { step } = useParams();
  const isNumeric = step !== undefined && /^\d+$/.test(step);
  return isNumeric ? Number(step) : null;
};
```

- 파싱과 검증을 `useStep`, `useSurveyId` 같은 Hook 한곳에 두면 호출처마다 반복되지 않는다. `useCurrentQuestion`처럼 이를 조합하는 Hook은 URL 형식을 몰라도 되고, 질문 수를 아는 그 Hook에서 상한을 검사한다.
- 같은 개념의 parameter 이름은 route 정의 전체에서 통일한다. 한 route는 `:surveyId`, 다른 route는 `:id`로 정의하면 `surveyId`를 읽는 Hook을 재사용할 수 없다.
- store selector나 data layer처럼 component 밖에서 `window.location.pathname`을 직접 파싱하지 않는다. route 형식이 바뀌면 깨지고 navigation에 반응하지 않으며 router의 해석을 중복한다. id를 명시적 인자로 넘기고 cache key에 포함한다([[React-Server-State-and-API#SWR cache model|SWR cache model]]).

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

button처럼 variant(primary, secondary, tertiary)와 상태(default, hover, pressed, disabled)가 겹치는 요소는 색만 다른 component를 variant마다 만들지 않고 variant를 prop으로 받는다. variant를 key로 하는 map에서 token 묶음을 고르면 조건 분기가 줄고, 상태는 `&:hover`, `&:active`, `&:disabled` 같은 pseudo-class로 적용한다.

| token 저장 | 강점 | 약점 |
|---|---|---|
| CSS custom property(`--color-primary`) | cascade로 subtree별 theme을 덮어쓰고 plain CSS와 CSS Modules에서도 쓴다. component를 다시 render하지 않고 값을 바꾼다 | 이름 오타가 type check로 잡히지 않는다 |
| JavaScript object | TypeScript 타입, 조건 로직과 CSS-in-JS에서 고르기 쉽다 | JavaScript에서만 읽을 수 있어 plain CSS에서 쓰려면 CSS 변수로 내보내는 단계가 필요하다 |

위 `tones`처럼 JavaScript map의 값이 CSS 변수 참조를 가리키면 variant 이름은 타입으로 제한하고 실제 값은 cascade로 바꿀 수 있다. 방법 자체보다 design 값을 한곳에서 관리하고 재사용하기 쉽게 만드는 목적을 기준으로 고른다.

## native form control을 대체할 때의 접근성

기본 checkbox와 radio는 CSS만으로 원하는 모양을 내기 어려워 input을 숨기고 span 같은 대체 element를 그리곤 한다. 이때 input에 `display: none`을 주면 accessibility tree에서 빠지고 focus도 받을 수 없어 keyboard와 screen reader 사용자가 선택지를 조작할 수 없다.

- `appearance: none`으로 input 자체를 스타일링하거나, input을 시각적으로만 숨기고 focus 가능한 상태로 둔다.
- `<label>`로 input과 대체 element를 묶어 시각 요소 click이 input을 toggle하게 한다.
- `input:focus-visible + span`, `input:checked + span`, `input:disabled + span`처럼 native 상태를 선택자로 이어 focus 표시와 선택 상태를 그린다.
- design tool이 주는 CSS는 참고만 한다. design tool의 layer 구조와 code의 HTML 구조가 달라 그대로 붙이면 맞지 않는다.

label, error 연결과 keyboard 동작 같은 공통 계약은 [[React-State-Effects-and-Events#controlled와 uncontrolled form|controlled와 uncontrolled form]]을 따른다.

## 관련 문서

- [[React-Application-Design|React application 설계]]
- [[Browser-URL-Flow|Browser URL 처리 흐름]]
- [[Browser-CSS-Animation-and-Compatibility|CSS animation과 browser compatibility]]

## 출처

- [React Router, Picking a Mode](https://reactrouter.com/start/modes)
- [React Router, Declarative Routing](https://reactrouter.com/start/declarative/routing)
- [React Router, Upgrading from v7](https://reactrouter.com/upgrading/v7)
- [React Router, Route (v8 API)](https://api.reactrouter.com/v8/functions/react-router.Route.html)
- [React Router v8.0.0 Release Notes — GitHub](https://github.com/remix-run/react-router/blob/main/CHANGELOG.md#v800)
- [react-router-dom README v7.0.0 — GitHub](https://github.com/remix-run/react-router/blob/react-router%407.0.0/packages/react-router-dom/README.md)
- [react-router-dom — npm](https://www.npmjs.com/package/react-router-dom)
- [React, Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React DOM, Common Components](https://react.dev/reference/react-dom/components/common)
- [MDN, History.pushState()](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- [MDN, Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
- [MDN, display](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display)
- [MDN, appearance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/appearance)
- [styled-components, Basics](https://styled-components.com/docs/basics)
- [styled-components, Security](https://styled-components.com/docs/advanced#security)
- IT Share, [React Router 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161803)
- IT Share, [React Router v6 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161804)
- IT Share, [Router로 survey step 구분](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161805)
- IT Share, [styled-components](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161807)
- IT Share, [질문 유형별 component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161808)
- IT Share, [Style variable](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161809)
- IT Share, [나머지 component styling](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161810)
- IT Share, [Custom Hook](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161815)
- IT Share, [Async selector로 API 연동](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161818)
- IT Share, [응답 완료 page](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161821)
- IT Share, [Admin component 구조](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161826)
- IT Share, [Ant Design 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161828)
- IT Share, [Admin router 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161829)
