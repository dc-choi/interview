---
tags: [web, frontend, react, form, admin, validation]
status: done
verified_at: 2026-08-04
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

Controlled와 uncontrolled field를 성능이라는 한 이유로 섞지 않는다. Ant Design Form처럼 library가 field store를 소유하면 그 contract를 따르고, Redux와 form store에 같은 draft를 이중 저장하지 않는다. Live preview가 필요한 최소 schema를 공유하고 입력 중 임시 상태는 가까이 둔다.

## 생성과 수정 mode

Create와 edit은 화면을 많이 공유해도 초기화와 API semantics가 다르다.

| 구분 | Create | Edit |
|---|---|---|
| 초기값 | 명시적 default schema | server snapshot |
| 저장 | 보통 `POST` | 보통 `PUT` 또는 `PATCH` |
| identity | server가 생성 가능 | route id와 일치 확인 |
| reset | 새 draft | 마지막 저장 snapshot |

Route parameter가 바뀔 때 이전 survey draft가 남지 않도록 key나 reducer reset action으로 수명을 명시한다. 저장 success 뒤 server가 반환한 canonical entity와 cache를 갱신하고 list 정렬과 pagination도 revalidate한다. Unsaved change navigation 정책과 optimistic concurrency가 필요한지도 정한다.

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
- [Immer, Update Patterns](https://immerjs.github.io/immer/update-patterns)
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
