---
tags: [web, frontend, react, form, admin, validation]
status: done
verified_at: 2026-09-30
category: "웹&네트워크(Web&Network)"
aliases: ["React Form Builder", "React 설문 Builder"]
---

# React form builder 설계

Survey와 admin builder는 같은 schema를 읽지만 다른 use case를 수행한다. 응답 화면은 질문을 순서대로 제시하고 답을 검증하며, builder는 schema 자체를 생성, 편집하고 저장한다. UI tree보다 먼저 shared contract를 정의한다.

## schema와 invariant

```typescript
type Question =
  | { id: string; type: "text"; required: boolean; maxLength?: number }
  | { id: string; type: "select"; required: boolean; options: Option[]; maxSelections: number };
```

- `id`는 React key, edit target와 API identity에 공통으로 사용한다.
- type별 option을 discriminated union으로 제한한다.
- option id와 표시 label을 분리하고 순서 변경에도 identity를 보존한다.
- server DTO와 edit draft가 다르면 adapter를 두고 한 object를 억지로 공유하지 않는다.

Validation은 UI의 disabled 조건만이 아니라 submit boundary에서 다시 실행한다. client validation은 feedback을 빠르게 하지만 server authorization과 validation을 대신하지 않는다.

## 응답 흐름

Required, 길이, 선택 개수 규칙은 field component마다 임의 구현하지 않고 schema 기반 validator로 일관되게 계산한다. 오류는 해당 field와 연결하고 focus를 이동할 수 있어야 한다.

Progress는 `currentIndex / total`만 표시하는 장식이 아니다. 의미 있는 `<progress>` 또는 `role="progressbar"`와 현재/전체 값을 제공한다. 조건부 질문이 있으면 전체 개수와 완료 기준이 어떻게 바뀌는지 정의한다.

Submit은 idle, submitting, succeeded, failed 상태를 구분한다. 중복 click을 막고 오류 시 answer를 보존하며, 성공 후 이동은 server 응답이 완료된 다음 수행한다.

## Admin과 UI library

Ant Design 같은 UI library는 layout, table, form과 접근성 기반을 제공하지만 product requirement를 자동으로 해결하지 않는다. 설치한 major 문서를 기준으로 component API, token customization, bundle, SSR와 React 지원 범위를 확인한다.

Builder처럼 도구 panel과 주 작업 영역이 나란한 화면을 비율로 나누면 창이 좁아질 때 원래 작은 panel까지 줄어 쓰기 어려워진다. 최소 사용 폭이 있는 panel은 내용 기준 고정 폭으로 두고 preview 같은 주 영역이 남은 공간을 채우게 한다(CSS로는 `flex: 0 0 350px`와 `flex: 1 1 auto`). 고정 폭을 유지할 수 없는 좁은 화면에는 panel 접기나 세로 배치 같은 breakpoint 규칙을 따로 정한다.

Ant Design Grid(6.x 기준)는 한 행을 24칸으로 보고 `Col`의 `span`으로 차지할 칸 수, `offset`으로 왼쪽 여백 칸 수를 정하며 `xs`(576px 미만)부터 `xxl`(1600px 이상), 6.3.0부터는 `xxxl`(1920px 이상)까지 breakpoint별 속성을 받는다. `Col`의 `flex`는 숫자 n이면 `n n auto`, `"350px"` 같은 길이 문자열이면 `0 0 350px`, `"auto"`면 `1 1 auto`로 바뀐다.

Library 부품이 요구사항을 막으면 내부 구조에 결합되는 override를 쌓기보다 작은 자체 component로 대체한다. 제목 말줄임과 하단 영역 추가를 library Card가 지원하지 않으면 wrapper, header, body를 가진 Card를 직접 만드는 식이다.

Menu의 selected state를 별도로 저장하기보다 현재 route에서 derive한다. URL 직접 진입과 browser 뒤로 가기에도 highlight가 맞아야 한다. Admin 권한은 menu를 숨기는 client 조건만으로 보호하지 않고 server에서 강제한다.

## Builder state transition

질문 추가, 삭제, 복제, 이동과 option 수정은 reducer action으로 모델링하기 좋다.

```typescript
type BuilderAction =
  | { type: "question/added"; afterId: string | null }
  | { type: "question/removed"; questionId: string }
  | { type: "question/moved"; questionId: string; toIndex: number };
```

Immer는 immutable update의 중첩 boilerplate를 줄이지만 invariant를 자동으로 보장하지 않는다. Reducer 안에서 stable id, 최소 option 개수와 선택 fallback을 검사한다.

한 칸 이동은 인접한 두 항목의 교환이다. 첫 질문을 위로, 마지막 질문을 아래로 옮기는 요청처럼 `toIndex`가 0부터 `length - 1` 범위를 벗어나면 reducer에서 no-op로 처리한다. handler에 index를 넘기면 직전 삭제나 이동으로 index가 달라질 수 있으므로 `questionId`로 대상을 찾는 action이 안전하다([[React-Local-State-and-Persistence|selectedId 원칙]]과 같은 이유).

### Immer draft 규칙

`produce(base, recipe)`는 원본의 Proxy인 draft를 recipe에 넘기고, draft에 한 변경을 반영한 다음 state를 반환한다. base는 바뀌지 않는다. 바뀌지 않은 부분은 같은 참조를 유지하고 변경된 경로만 새 참조를 받으므로(structural sharing) 참조 비교로 변경을 감지하는 React state, `memo`와 selector에 맞는다.

```typescript
setSurvey(produce(draft => {
  draft.questions.push(createQuestion());
}));
```

- recipe만 넘기면 base를 나중에 받는 curried producer가 된다. setter의 updater로 넘기면 React가 대기 중인 최신 state를 넘기므로 closure에 잡힌 오래된 state로 계산하지 않는다.
- `draft = next`처럼 recipe 인자를 재할당하면 반영되지 않는다. 전체를 교체하려면 새 값을 return한다.
- 한 recipe에서 draft를 수정하면서 새 값도 return하지 않는다. Redux Toolkit reducer의 `(state, action) => state.push(action.payload)`는 push 결과를 암묵적으로 return해 오류가 나므로 중괄호 본문이나 `void`를 쓴다.
- draft를 그대로 log하면 Proxy가 찍히므로 `current(draft)`로 plain copy를 만든다. 비용이 드는 연산이므로 필요한 곳에만 쓴다.

## 편집 form의 적용 시점 commit

질문 card를 선택하는 preview와 선택된 질문을 편집하는 option panel은 서로 다른 가지에 있으므로 선택된 `questionId`는 두 영역의 공통 owner나 공유 store에 둔다. 편집 값은 영역마다 갱신 전파 요구와 render 비용을 보고 전략을 고른다.

| 영역 | 전략 | 이유 |
|---|---|---|
| 설문 제목 한 줄 | controlled input, 입력마다 draft 갱신 | preview에 즉시 보여야 하고 비용이 작다 |
| 질문 option form | form store의 working copy, 적용 button에서 한 번 commit | 여러 field를 입력마다 전역 store에 반영하면 넓은 범위가 다시 render된다 |

Redux Style Guide도 대부분의 form state를 Redux에 두지 말고, 최종 data가 Redux에 가더라도 편집 중 값은 local에 두었다가 완료 시점에 dispatch하라고 권장한다. 편집한 속성을 즉시 보여 주는 WYSIWYG live preview는 예외로 든다.

Ant Design Form에서 `name`을 가진 `Form.Item`의 child는 Form store가 value와 onChange를 주입하는 controlled field다. React의 DOM 소유 uncontrolled input과 다르므로 child에 `value`, `defaultValue`와 data 수집용 `onChange`를 직접 두지 않는다.

- `initialValues`는 Form 초기화와 reset에만 적용된다. 선택 질문이 바뀔 때 prop만 바꾸면 field가 갱신되지 않으므로 `form.setFieldsValue`로 다시 채우거나 `key={selectedQuestionId}`로 Form을 remount한다. `setFieldsValue`는 validation message도 초기화한다.
- 적용 전에 다른 질문을 선택하면 편집 중인 값이 사라진다. 경고, 자동 적용, 폐기 중 정책을 정한다.
- form 표현과 schema type이 다르면 적용이나 저장 boundary에서 question type별로 변환한다. select 선택지를 textarea 문자열로 편집한다면 저장 시 배열로 split하고 form에 채울 때 join하며, 공백 trim, 빈 항목 제거와 항목 안의 구분자 문자까지 한 쌍으로 정의한다. 변환이 빠지면 배열을 기대하는 code가 문자열을 받아 오류가 난다.

같은 input을 lifecycle 중 controlled와 uncontrolled 사이에서 바꾸는 것은 React가 금지하는 동작이고([[React-State-Effects-and-Events#controlled와 uncontrolled form|controlled와 uncontrolled form]]), 영역마다 다른 전략을 고르는 것은 정당한 설계다. Ant Design Form처럼 library가 field store를 소유하면 그 contract를 따르고, Redux와 form store에 같은 draft를 두고 입력마다 동기화하는 이중 저장을 만들지 않는다. 편집 중 working copy를 form store에 두고 적용 시점에만 Redux에 commit하는 구조는 이중 저장이 아니다. Live preview가 필요한 최소 schema를 공유하고 입력 중 임시 상태는 가까이 둔다.

## 생성과 수정 mode

Create와 edit은 화면을 많이 공유해도 초기화와 API semantics가 다르다.

| 구분 | Create | Edit |
|---|---|---|
| 초기값 | 명시적 default schema | server snapshot |
| 저장 | 보통 `POST` | 보통 `PUT` 또는 `PATCH` |
| identity | server가 생성 가능 | route id와 일치 확인 |
| reset | 새 draft | 마지막 저장 snapshot |

Route parameter가 바뀔 때 이전 survey draft가 남지 않도록 key나 reducer reset action으로 수명을 명시한다. 저장 success 뒤 server가 반환한 canonical entity와 cache를 갱신하고 list 정렬과 pagination도 revalidate한다. Unsaved change navigation 정책과 optimistic concurrency가 필요한지도 정한다.

같은 Builder를 `/builder`(생성)와 `/builder/:surveyId`(수정)에 공유하면 mode는 route parameter 존재 여부에서 derive한다. id가 없으면 조회를 건너뛰어 not found 요청을 막고, draft가 아직 `null`이면 render하지 않거나 기본 schema로 초기화해 `title` 같은 field 접근 오류를 막는다.

- 생성 성공 응답(`201 Created`의 body나 `Location` header)에서 얻은 id로 `/builder/:surveyId`에 이동해야 다음 저장이 `PUT`이 된다. 생성 URL에 남으면 같은 화면에서 저장을 다시 누를 때 설문이 중복 생성된다. 뒤로 가기로 생성 URL에 돌아오지 않게 하려면 `navigate(path, { replace: true })`를 검토한다.
- component local state는 unmount 때 사라지지만 전역 store의 draft와 선택 id는 route가 바뀌어도 남는다. reset 규칙은 parameter가 바뀔 때뿐 아니라 parameter가 없는 생성 route에 진입할 때도 적용하고, draft를 가리키는 `selectedQuestionId` 같은 부속 state까지 함께 초기화한다.
- 목록은 server-state cache, 편집 대상은 한 번 적재한 전역 draft라면 같은 설문이 두 곳에 존재한다. 저장과 삭제 뒤 목록 key를 명시적으로 revalidate한다([[React-Server-State-and-API#SWR cache model|SWR cache model]]).
- `id`와 `createdAt` 같은 server 권한 field는 server가 정한다. mock server 한계 때문에 client에서 `Date.now()`를 넣은 예제를 실제 API 계약으로 옮기지 않는다.

## 관련 문서

- [[React-Application-Design|React application 설계]]
- [[React-State-Management|공유 state 관리]]
- [[React-Server-State-and-API|Server state와 mutation]]
- [[Runtime-Validation-Libraries|Runtime validation]]

## 출처

- [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React, Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [React, Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [Ant Design, Components Overview](https://ant.design/components/overview/)
- [Ant Design, Form](https://ant.design/components/form/)
- [Ant Design, Grid](https://ant.design/components/grid/)
- [Ant Design GitHub, Grid Col source](https://github.com/ant-design/ant-design/blob/master/components/grid/col.tsx)
- [Immer, Update Patterns](https://immerjs.github.io/immer/update-patterns)
- [Immer, produce](https://immerjs.github.io/immer/produce/)
- [Immer, Returning new data from producers](https://immerjs.github.io/immer/return/)
- [Immer, Pitfalls](https://immerjs.github.io/immer/pitfalls/)
- [Immer, Using produce with React setState](https://immerjs.github.io/immer/example-setstate/)
- [Immer, current](https://immerjs.github.io/immer/current/)
- [Redux Toolkit, Writing Reducers with Immer](https://redux.js.org/toolkit/usage/immer-reducers)
- [Redux, Style Guide](https://redux.js.org/style-guide/)
- [React Router, useNavigate](https://reactrouter.com/api/hooks/useNavigate)
- IT Share, [응답 완료 page](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161821)
- IT Share, [답변 validation](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161822)
- IT Share, [Progress bar](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161823)
- IT Share, [Admin 요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161825)
- IT Share, [Admin component 구조](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161826)
- IT Share, [Admin project 설정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161827)
- IT Share, [Ant Design 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161828)
- IT Share, [Admin router 적용](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161829)
- IT Share, [질문 preview](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161834)
- IT Share, [질문 추가와 삭제](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161835)
- IT Share, [Option editor](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161838)
- IT Share, [저장 기능](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161839)
- IT Share, [새 설문 생성](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161840)
