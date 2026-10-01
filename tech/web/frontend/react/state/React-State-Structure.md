---
tags: [web, frontend, react, state, state-machine, identity]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React State Structure", "React state 구조와 수명"]
---

# React state 구조와 수명

## UI를 state 전이로 설계한다

React UI는 button을 숨기고 spinner를 켜는 명령을 흩어 놓기보다 현재 state에서 보여야 할 화면을 선언한다. interaction 설계는 다음 순서로 진행한다.

1. empty, typing, submitting, success, error 같은 시각적 상태를 나열한다.
2. 입력, submit, 응답 성공/실패처럼 각 전이의 원인을 연결한다.
3. 화면을 표현하는 최소 state를 정한다.
4. 모순되거나 계산 가능한 state를 제거한다.
5. event와 응답 처리에서 state를 갱신하고 JSX를 state로 계산한다.

사용자 입력뿐 아니라 network 응답, timer 종료와 이미지 load도 전이의 원인이다. 동작을 붙이기 전에 각 상태를 prop으로 지정한 화면을 나란히 확인하면 비활성화, 오류와 성공 화면 누락을 찾기 쉽다.

```jsx
const [answer, setAnswer] = useState('');
const [status, setStatus] = useState('typing');
const [error, setError] = useState(null);
const isSubmitting = status === 'submitting';
const canSubmit = answer.length > 0 && !isSubmitting;

const handleSubmit = async event => {
  event.preventDefault();
  if (!canSubmit) return;
  setError(null);
  setStatus('submitting');
  try {
    await submitAnswer(answer);
    setStatus('success');
  } catch (error) {
    setError(error);
    setStatus('typing');
  }
};
// textarea의 disabled는 isSubmitting, button은 !canSubmit에서 계산한다.
```

empty는 `answer.length === 0`, error 표시 여부는 `error !== null`로 계산할 수 있다. 성공했는데 오류가 남는 것처럼 여러 값의 조합까지 제한해야 한다면 하나의 state object와 reducer로 전이를 묶는다([[React-State-Management#reducer로 전이 규칙을 모은다|reducer]]).

CSS class나 편집/보기 mode도 같은 원칙을 따른다. `isEditing`에 따라 input과 text를 조건부로 보여 주고, 이름의 합성은 render에서 계산한다. image와 배경 click이 서로 다른 상태를 선택한다면 state 계산과 [[React-State-Effects-and-Events#event handler|propagation 처리]]를 함께 확인한다.

## state 구조의 다섯 원칙

| 원칙 | 적용 사례 | 피하는 오류 |
|---|---|---|
| 함께 바뀌는 값 묶기 | pointer의 `{ x, y }` | x만 갱신하고 y를 놓침 |
| 모순 제거 | `isSending`, `isSent` 대신 `status` | 보내는 중이면서 완료인 상태 |
| 계산 가능한 값 제거 | `fullName`, packed count를 render에서 계산 | 삭제 뒤 집계가 틀어짐 |
| 같은 정보의 복제 제거 | 선택한 object 대신 `selectedId` | 목록 수정 뒤 선택 내용이 오래됨 |
| 깊은 중첩 줄이기 | id와 entity table로 관계 표현 | 변경 때 모든 조상 copy가 필요함 |

서로 독립적으로 바뀌는 state까지 한 object로 강제할 필요는 없다. 반대로 object setter는 부분 병합이 아니라 교체하므로 나머지 field를 spread로 보존한다.

### props를 state로 복제하지 않는다

`useState(messageColor)`는 첫 render에서 초기화할 뿐 다음 prop 변경을 자동 반영하지 않는다. parent가 지정하는 color라면 prop을 직접 사용한다. 이후 prop 변경을 의도적으로 무시하는 draft의 초기값이면 `initialColor`, `defaultColor`처럼 초기값임을 이름으로 드러낸다.

선택한 entity가 바뀔 때 초기 draft를 다시 만들고 싶다면 Effect로 기존 prop을 복제하기 전에 아래의 key reset이나 controlled ownership을 검토한다.

### 선택과 집계는 원본에서 계산한다

```jsx
const [selectedId, setSelectedId] = useState(null);
const selectedItem = items.find(item => item.id === selectedId) ?? null;
const packedCount = items.filter(item => item.packed).length;
const totalCount = items.length;
```

선택 object를 별도 저장하면 item 수정 때 새 object와 이전 선택 object가 달라진다. object 참조로 highlight를 비교하던 UI도 깜빡일 수 있다. id로 비교하면 내용 변경과 선택 identity를 분리한다. 선택 item 삭제 뒤 `null`로 둘지 다른 item으로 옮길지는 명시한다.

여러 개 선택은 id array 또는 Set으로 표현한다. 작은 목록은 array로 충분하며 대규모 반복 조회에서 Set을 검토한다. Set도 state object이므로 기존 Set에 `add`, `delete`하지 않고 복사한 Set을 갱신한다.

```jsx
setSelectedIds(current => {
  const next = new Set(current);
  if (next.has(itemId)) next.delete(itemId);
  else next.add(itemId);
  return next;
});
```

### 깊은 관계는 id로 평탄화한다

```jsx
const places = {
  root: { id: 'root', childIds: ['park'] },
  park: { id: 'park', childIds: ['garden'] },
  garden: { id: 'garden', childIds: [] },
};
```

삭제할 child id를 parent의 `childIds`에서 제거하고 새 parent를 root table에 넣으면 깊은 조상 copy를 줄인다. 연결만 끊고 table에서 지우지 않으면 도달 불가능한 entity와 하위 entity가 남을 수 있으므로 데이터 수명과 삭제 정책도 정한다. hover처럼 저장할 필요가 없는 UI state는 leaf component로 내려 중첩을 줄일 수 있다.

## tree 위치와 key로 state 수명 정하기

React는 JSX가 작성된 줄이나 변수에 state를 붙이는 것이 아니라 render tree의 위치에 연결한다. 같은 parent 아래 같은 위치와 component type이 유지되면 props가 바뀌어도 state를 보존한다. 서로 다른 조건문의 JSX라도 반환한 tree 위치가 같으면 같은 component로 볼 수 있다.

| 변화 | state 결과 |
|---|---|
| 같은 위치/type에서 props만 변경 | 보존 |
| component 제거 뒤 다시 추가 | 초기화 |
| 같은 위치를 다른 component type으로 교체 | 기존 subtree state 제거 |
| parent wrapper가 `section`에서 `div`로 바뀜 | 아래 subtree도 재생성될 수 있음 |
| 같은 parent 아래 key 변경 | 별도 identity로 subtree 재생성 |
| stable key를 유지한 sibling 순서 변경 | 해당 key의 state를 따라감 |

component 함수를 다른 component 본문 안에서 선언하면 render마다 새 함수 type이 생겨 state가 초기화될 수 있다. component 정의는 module의 최상위에 둔다.

```jsx
<EditContact key={selectedId} initialContact={selectedContact} />
```

위 key는 선택한 contact가 달라질 때 form과 그 하위 state를 초기화한다. `key`는 list만을 위한 기능이 아니며 parent 안에서 identity를 구분한다. 전역 id 저장소나 숨겨진 state cache가 아니다. key를 바꿔 제거한 component를 나중에 다시 표시해도 이전 지역 state가 자동 복구되지 않는다.

list에서 index를 key로 쓰면 삭제, 삽입이나 역순 정렬 때 state가 다른 항목으로 붙을 수 있다. 데이터의 stable id를 쓴다. 반대로 render마다 무작위 key를 만들면 매번 초기화된다. 이미지에도 key를 바꿔 이전 DOM을 즉시 없앨 수 있으나 loading 중 깜빡임이 생기므로 텍스트와 이미지 일치가 필요한 경우에 한해 선택한다.

숨긴 draft를 복구해야 하면 CSS로 tree를 유지하거나 parent에 대상별 draft를 둔다. CSS로 숨긴 큰 tree는 DOM과 state를 계속 유지하는 비용이 있다. page를 닫은 뒤에도 복구하려면 [[React-Local-State-and-Persistence#draft 보존과 초기화의 범위|영속화 범위]]까지 설계한다.

접근성 속성을 연결하는 `useId`도 list key나 데이터 cache key로 쓰지 않는다. DOM의 label/description 관계를 연결하는 id와 state identity는 서로 다른 계약이다([[React-Ref-and-Identity-Hooks#useId 계약|useId]]). 초기 prop 변경에 반응해 일부 state만 조정해야 한다면 계산/key/handler로 해결할 수 있는지 먼저 검토하고, 불가피한 현재 component의 조건부 render 조정은 [[React-State-Hook-Contracts#함수 저장과 render 중 조건부 조정|useState의 좁은 예외]]를 따른다.

## 이해 확인

- `useState(prop)`의 prop만 바뀌었을 때 기존 draft가 남는 이유를 설명할 수 있는가?
- 선택한 item을 수정하거나 삭제한 뒤 highlight, 상세 내용과 집계가 함께 맞는가?
- wrapper type 변경과 key 변경을 각각 해 보면 어느 subtree가 초기화되는가?

## 출처

- [React, Managing State](https://react.dev/learn/managing-state)
- [React, Reacting to Input with State](https://react.dev/learn/reacting-to-input-with-state)
- [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React, Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React, useState](https://react.dev/reference/react/useState)
- [React, useId](https://react.dev/reference/react/useId)

## 관련 문서

- [[React-State-Updates|snapshot, queue와 immutable update]]
- [[React-State-Management|공유 state와 reducer]]
- [[React-Local-State-and-Persistence|지역 state와 영속화]]
- [[React-Application-Design|React application 설계]]
