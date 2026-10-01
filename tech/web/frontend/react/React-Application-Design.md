---
tags: [web, frontend, react, architecture, component-design]
status: done
verified_at: 2026-10-01
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

### 검색 가능한 목록으로 state ownership 확인하기

목록과 검색 입력을 먼저 고정된 props로 렌더링해 component 구조를 확인한다. 단순한 화면은 상위부터, 작은 UI가 많은 화면은 재사용할 하위 component부터 만들 수 있다. 정적 버전에서 상호작용용 state를 미리 넣을 필요는 없다.

검색 가능한 상품 목록에서는 아래처럼 값의 역할을 나눈다.

| 값 | 현재 component에서의 역할 | 이유 |
|---|---|---|
| `products` | props | parent가 제공하는 원본 목록 |
| `query` | state | 사용자가 바꾼 검색어를 기억 |
| `inStockOnly` | state | 사용자가 바꾼 표시 조건을 기억 |
| `visibleProducts` | render 중 계산 | 원본 목록과 두 조건에서 도출 |

props로 받는다는 판단은 현재 component 기준이다. `products`가 상위의 state나 server cache에서 왔을 수 있으며, 전체 앱에서 state가 아니라는 뜻은 아니다.

```jsx
function ProductSearch({ products }) {
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const visibleProducts = products.filter(product => {
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!inStockOnly || product.stocked);
  });

  return (
    <>
      <SearchBar query={query} inStockOnly={inStockOnly}
        onQueryChange={setQuery} onStockChange={setInStockOnly} />
      <ProductList products={visibleProducts} />
    </>
  );
}
```

위 예시는 `useState`를 import하고 `SearchBar`, `ProductList`를 별도로 정의한 구성을 전제한다. 두 child가 같은 조건을 사용하므로 `ProductSearch`가 이를 소유한다. `SearchBar`는 text input의 `value={query}`와 `onChange={e => onQueryChange(e.target.value)}`를 연결하고, checkbox는 `checked`와 `e.target.checked`를 연결한다. 값만 고정해 전달하면 사용자가 입력해도 갱신되지 않는다.

data는 props로 내려가고, 변경 의도는 callback으로 owner에 돌아간다. callback이 상위 state를 바꿔 다음 props를 만들며, child가 props를 직접 수정하는 양방향 binding은 아니다.

### 이력 되돌리기로 state 모델 검증하기

되돌리기가 있는 작은 보드 UI는 component 분해, callback, 불변성과 derived state를 함께 연습할 수 있다. 화면을 완성한 뒤 이전 시점으로 이동해도 규칙이 유지되는지 확인한다.

| component | 책임과 계약 |
|---|---|
| `Square` | `value`를 표시하고 `onSquareClick`으로 클릭 의도를 전달 |
| `Board` | `squares`, `xIsNext`를 받아 표시하고 새 배열을 `onPlay`로 전달 |
| `Game` | 이력 `history`와 선택 시점 `currentMove`를 소유 |

처음에는 칸마다 local state를 둘 수 있지만 승자 판단이 모든 칸을 필요로 하면 Board로 올린다. 보드와 이력 목록이 같은 시점을 표시해야 하면 다시 Game으로 올린다. 상태 owner는 요구하는 상호작용이 넓어질 때 조정한다.

```js
const currentSquares = history[currentMove];
const xIsNext = currentMove % 2 === 0;
const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
```

현재 보드와 다음 차례를 별도 state로 복제하지 않는다. 한 수를 둘 때 보드를 `slice()`로 복사해 빈 칸만 바꾸고, 승자가 있거나 이미 찬 칸이면 변경하지 않는다. 새 이력을 저장한 뒤 `currentMove`는 `nextHistory.length - 1`로 옮긴다. 과거로 이동할 때는 index만 바꾸며, 과거에서 새 수를 두면 선택한 시점 뒤의 이력을 잘라 새 분기를 만든다.

승자 판단은 보드를 받는 순수한 `calculateWinner` 함수로 분리한다. 세 행, 세 열과 두 대각선의 index 묶음을 검사해 같은 값이 세 칸을 채우면 `X`나 `O`, 아니면 `null`을 반환한다. 승자가 없고 모든 칸이 차 있으면 무승부다. winner와 status 문구도 보드에서 계산하며 별도 state로 저장할 필요가 없다.

각 보드가 독립된 배열이어야 과거 snapshot이 유지된다. 칸이 문자열이나 `null`이면 얕은 복사로 충분하지만 객체를 저장한다면 변경하는 객체도 복사해야 한다. 이 예시의 수 번호는 이력 앞부분의 의미가 유지되고 중간 삽입이 없어 key로 쓸 수 있다. 일반적인 정렬 목록의 index key까지 안전하다는 뜻은 아니다.

**이해 확인**: 빈 칸 클릭, 같은 칸 재클릭, 승리 뒤 클릭, 시작 시점으로 이동, 과거 시점에서 새 수 두기를 직접 확인한다. 이어서 현재 시점 표시, 두 반복문으로 보드 생성, 이력 정렬 전환, 승리한 세 칸 강조, 무승부 표시, `(행, 열)` 기록을 구현하면 어떤 값은 계산할 수 있고 어떤 값은 새 state가 필요한지 설명한다. 정렬한 이력을 표시할 때 key는 화면 index가 아닌 원래 수 번호를 유지한다.

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

## 반복 UI를 설정 data로 기술하기

같은 구조가 반복되는 UI는 JSX를 복제하지 않고 설정 data와 하나의 renderer로 나눈다. 위 `questionViews`가 type에서 component로의 mapping이라면 table column과 form field 목록은 같은 발상을 field 단위로 적용한 것이다.

- Table은 행 data 배열과 column 정의 배열을 받는다. Ant Design Table의 column은 header 문구 `title`, record에서 읽을 key `dataIndex`, column 식별자 `key`, 값을 가공하거나 삭제 button 같은 행 제어 UI를 그리는 `render`를 갖는다. 행 key는 기본으로 record의 `key`를 쓰므로 없으면 `rowKey`에 stable id를 지정한다. 둘 다 없으면 list key 경고가 난다.
- 옵션 form은 구역 제목과 field 목록을 가진 group으로 기술하고, field마다 name, label, 입력 종류, required rule, placeholder, 최대값과 선택지 같은 설정을 둔다. question type별 세부 field를 공통 group에 병합한 뒤 `map`으로 `Form.Item`을 렌더링한다.

field나 question type 추가가 JSX 수정이 아니라 data 추가가 되고 label, validation과 layout 규칙이 renderer 한곳에서 일관된다. 반대로 설정이 조건부 노출, field 간 validation과 비동기 option까지 떠안으면 읽고 디버깅하기 어려운 작은 DSL이 된다. 불규칙한 경우를 위해 `render` 같은 escape hatch를 남기고 type별 설정의 누락은 compile time에 잡는다.

```tsx
const detailFields = {
  text: [
    { name: "placeholder", label: "안내 문구", input: "text" },
    { name: "max", label: "최대 글자 수", input: "number" },
  ],
  textarea: [{ name: "placeholder", label: "안내 문구", input: "text" }],
  select: [
    { name: "items", label: "선택지", input: "textarea" },
    { name: "max", label: "최대 선택 수", input: "number" },
  ],
} satisfies Record<Question["type"], readonly FieldConfig[]>;
```

입력 표현과 저장 schema 사이의 변환(select 선택지의 textarea 문자열과 배열)은 renderer가 아니라 적용 boundary에 둔다([[React-Form-Builder-Practice#편집 form의 적용 시점 commit|편집 form의 적용 시점 commit]]).

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

- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]]
- [[React-Core-Mental-Model|React 핵심 mental model]]
- [[React-State-Management|공유 state 선택]]
- [[DTO-Layering|API DTO와 domain model 경계]]
- [[React-Render-Purity-and-Trees|render tree와 module 의존 관계]]

## 출처

- [React, Thinking in React](https://react.dev/learn/thinking-in-react)
- [React, Tutorial: Tic-Tac-Toe](https://react.dev/learn/tutorial-tic-tac-toe)
- [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React, Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [Ant Design, Table](https://ant.design/components/table/)
- IT Share, [SurveyPie project 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161794)
- IT Share, [SurveyPie와 Admin 소개](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161795)
- IT Share, [요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161797)
- IT Share, [Component 구조 설계](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161798)
- IT Share, [Data 정의](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161799)
- IT Share, [Project 설정](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161800)
- IT Share, [기본 component 구현](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161801)
- IT Share, [설문 list component](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161832)
- IT Share, [Option editor](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161838)
- IT Share, [SurveyPie service 회고](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161842)
