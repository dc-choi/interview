---
tags: [web, frontend, react, architecture, component-design]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["React Application Design", "React 컴포넌트 설계"]
---

# React application 설계

실무 React 개발은 화면을 먼저 component로 자르는 작업이 아니라 요구사항, data와 state ownership을 함께 모델링하는 작업이다. 기획서와 design guide에서 정상 흐름뿐 아니라 loading, empty, error, permission, validation과 responsive 상태를 추출한다.

## 요구사항에서 계약 만들기

1. 사용자가 수행하는 task와 URL 단위 화면을 나눈다.
2. server에서 오는 원본 data와 client가 만드는 draft를 구분한다.
3. 각 화면의 loading, empty, error와 retry 상태를 적는다.
4. field constraint, 접근성, analytics와 보안 요구를 함께 기록한다.
5. API request/response와 오류 계약을 backend와 합의한다.

Wireframe의 box마다 component를 만들지 않는다. 독립적인 책임, 반복되는 UI 규칙, 별도 state나 test 경계가 있을 때 분리한다.

## component tree와 data flow

React 공식 Thinking in React 흐름은 다음 순서를 제안한다.

- UI를 component hierarchy로 나눈다.
- 먼저 정적인 version을 만든다.
- 최소이면서 완전한 state 표현을 찾는다.
- state를 소유할 가장 가까운 공통 parent를 찾는다.
- event callback으로 child의 의도를 owner에 전달한다.

Derived value를 별도 state로 복제하지 않는다. 질문 목록이 있으면 질문 개수, 현재 질문과 progress는 render 중 계산할 수 있다. 같은 entity를 여러 state에 중복 저장하기보다 id로 연결한다.

## 재사용은 시각적 유사성보다 의미

Button component는 variant, size와 disabled/loading 상태를 명확한 props로 제한할 수 있다. 모든 CSS 값을 props로 받아 범용 renderer로 만들면 사용처가 design system 내부 구현에 결합된다.

Question body처럼 type별 동작이 다르면 discriminated data와 명시적 mapping을 사용한다.

```tsx
import type { ComponentType } from "react";

const questionViews = {
  text: TextQuestion,
  select: SelectQuestion,
  textarea: TextareaQuestion,
} satisfies Record<Question["type"], ComponentType<QuestionProps>>;
```

새 type 추가 시 data schema, rendering, validation, serialization을 함께 확장할 수 있어야 한다.

## folder와 library 선택

Feature와 use case 가까이에 component, state, API와 test를 둔다. `components`, `utils`, `constants`라는 전역 폴더는 실제 공유가 확인될 때만 키운다. library 선택은 popularity보다 다음 계약으로 평가한다.

- React와 TypeScript 지원 범위, maintenance 상태
- 접근성, SSR와 hydration 지원
- bundle과 runtime cost
- 필요한 customization과 migration 비용
- error, loading과 async cancellation 모델

UI library, state library와 data-fetching library는 서로 다른 문제를 푼다. library 수를 늘리는 것이 architecture가 아니며, project 종료 후에도 version과 contract를 유지할 책임이 생긴다.

## 완료 기준

화면이 보이는 것만으로 완료하지 않는다. URL 직접 진입, 새로고침, 느린 network, API 오류, 빈 data, keyboard, responsive layout와 duplicate submission을 검증한다. implementation 과정의 반복되는 결정을 문서와 reusable contract로 남긴다.

## 관련 문서

- [[React-Core-Mental-Model|React 핵심 mental model]]
- [[React-State-Management|공유 state 선택]]
- [[DTO-Layering|API DTO와 domain model 경계]]

## 출처

- [React, Thinking in React](https://react.dev/learn/thinking-in-react)
- [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React, Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- IT Share, [SurveyPie project 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161794)
- IT Share, [SurveyPie와 Admin 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161795)
- IT Share, [요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161797)
- IT Share, [Component 구조 설계](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161798)
- IT Share, [Data 정의](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161799)
- IT Share, [Project 설정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161800)
- IT Share, [기본 component 구현](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161801)
- IT Share, [SurveyPie service 회고](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161842)
