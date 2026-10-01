---
tags: [web, frontend, react, dom, form]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React DOM form control 계약"]
---

# React DOM form control 계약

## controlled와 uncontrolled

`value` 또는 checkbox/radio의 `checked`를 전달하면 React가 현재 값을 제어한다. `defaultValue`/`defaultChecked`는 DOM이 이후 값을 관리하는 초기값이다. 같은 field를 lifetime 중 두 방식 사이로 전환하거나 둘을 동시에 전달하지 않는다. controlled field의 `onChange`는 backing state를 동기적으로 바꿔야 한다.

| element | controlled | uncontrolled 초기값 | 제출 값 |
|---|---|---|---|
| text input | string `value` | string `defaultValue` | name에 대응하는 string |
| checkbox/radio | boolean `checked` | boolean `defaultChecked` | 선택 상태와 별개로 `value`가 제출 데이터 |
| textarea | string `value` | string `defaultValue` | name에 대응하는 여러 줄 text |
| 단일 select | option value와 일치하는 string `value` | string `defaultValue` | 선택한 option의 value |
| multiple select | string 배열 `value` | string 배열 `defaultValue` | 같은 name으로 여러 entry |

## input

`<input />`은 기본 text input이고 `type`으로 checkbox, radio, number, email, file, date 등 browser의 입력 기능을 선택한다. children을 받을 수 없다. checkbox는 `e.target.checked`, text는 `e.target.value`로 읽는다. 같은 radio group은 같은 `name`을 사용하고 각 `value`로 제출 선택값을 구분한다.

```jsx
const Signup = () => {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  return <>
    <label>표시 이름<input value={name} onChange={e => setName(e.target.value)} /></label>
    <label><input type="checkbox" checked={agreed}
      onChange={e => setAgreed(e.target.checked)} />동의</label>
  </>;
};
```

number input도 DOM의 `value`는 string이므로 빈 입력을 표현하는 값과 계산용 number를 구분한다. `Number(text)` 등 변환은 계산/검증 경계에서 수행한다. text 값은 `''`, checkbox는 `false`처럼 올바른 초기 타입을 주고 API 값이 없으면 `value={answer ?? ''}`로 일관성을 유지한다.

관련 prop는 목적별로 구분한다.

- field 연결: `name`, `form`(연결할 form id), `dirname`, `list`(datalist id).
- 제약: `required`, `pattern`, `min/max`, `minLength/maxLength`, `step`(양수 또는 `'any'`), `multiple`(file/email), `readOnly`, `disabled`.
- 입력 안내: `autoComplete`, `autoFocus`(mount 때 focus), `placeholder`, `size`.
- file: `accept`, `capture`; image submit: `alt`, `src`, `height`, `width`.
- submit/image control: `formAction`(URL/function), `formEncType`, `formMethod`, `formNoValidate`, `formTarget`가 form 설정을 override한다. function action의 서버 제출 의미와 client 상태 관측값은 [[React-DOM-Form-Actions]]에서 구분한다.
- event: `onChange`, `onInput`, `onInvalid`, `onSelect`와 각각 Capture 형태. `onSelect`는 빈 선택/편집에도 발생할 수 있다.

## textarea

`<textarea>초기값</textarea>`처럼 children으로 내용을 넣지 않는다. 초기값은 `defaultValue`, 현재값은 `value`다. label을 포함하고 `rows`/`cols`로 기본 크기를 지정한다(rows 기본 2, cols 기본 20). resize 여부는 CSS로 조정한다.

```jsx
<label>
  소개
  <textarea name="bio" defaultValue="소개를 입력하세요" rows={4} cols={40} />
</label>
```

input과 공유하는 name/form, disabled/readOnly, required, minLength/maxLength, autoComplete/autoFocus, placeholder와 event 계약이 적용된다. `wrap`은 `'soft'`, `'hard'`, `'off'`로 제출 시 줄바꿈 동작을 지정한다.

## select와 option

`select` 안에는 option, optgroup, datalist 또는 결국 이들을 렌더링하는 custom component를 둔다. custom component가 option을 반환한다면 각 option에 명시적인 `value`를 준다. selection은 parent select에 두며 `<option selected>`는 지원하지 않는다.

```jsx
const RolePicker = () => {
  const [roles, setRoles] = useState(['reader']);
  return <label>역할
    <select multiple name="roles" value={roles} onChange={event => {
      setRoles([...event.target.selectedOptions].map(option => option.value));
    }}>
      <option value="reader">읽기</option>
      <option value="editor">편집</option>
      <option value="owner" disabled>소유자</option>
    </select>
  </label>;
};
```

`multiple`은 다중 선택, `size`는 선호하는 표시 항목 수다. `autoComplete`, `autoFocus`, `disabled`, `form`, `name`, `required`, `onChange`/`onInput`/`onInvalid` 및 Capture를 지원한다. `value`가 있는 select에는 state를 동기 갱신하는 `onChange`가 필요하다.

`option.value`는 제출 데이터, `label`은 표시 의미이고 생략하면 내부 text를 사용한다. `disabled`는 선택을 막는다. 화면 label과 업무 id를 분리해 option에는 안정적인 id를 value로 둔다.

## label과 제출 데이터

field를 label 안에 넣거나 `id`와 `htmlFor`를 연결한다. 여러 instance가 있을 때는 `useId`로 충돌을 피한다. placeholder는 label의 대체가 아니다. `name` 없는 field는 해당 key로 제출되지 않는다. form 내부 button은 기본 submit이므로 업무 버튼은 `type="button"`, 제출은 `type="submit"`, 초기화는 `type="reset"`으로 명시한다.

```jsx
const handleSubmit = event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const roles = data.getAll('roles');
  console.log(data.get('bio'), roles);
};
```

같은 name의 다중 select 값은 여러 entry다. `Object.fromEntries(data.entries())`는 마지막 값만 보존하므로 다중 값에 사용하지 않는다. `getAll()` 또는 entries 배열을 사용한다. 요청 body로 FormData를 직접 사용할 수 있다. native method/URL 전송과 React function action의 차이는 [[React-DOM-Form-Actions]]를 따른다.

## progress

`<progress value={75} max={100} />`의 `value`는 0부터 max까지의 number이며 max 기본값은 1이다. 진행량을 모를 때 `value={null}` 또는 value 생략으로 indeterminate를 표시한다. indeterminate는 작업이 끝났다는 뜻이 아니라 현재 진행량을 정할 수 없다는 뜻이다. 완료는 범위의 최댓값으로 표현하고, 실제 진행률이 없는 pending에 임의의 퍼센트를 만들지 않는다.

```jsx
<label>업로드<progress value={knownPercent ? percent : null} max={100} /></label>
```

## 입력 오류와 성능 확인

- 입력 불가: `value`/`checked`만 주고 onChange를 빠뜨렸는지 확인한다. 초기값만 필요하면 default prop, 의도적 읽기 전용이면 `readOnly`를 사용한다.
- caret 점프: onChange에서 다른 string으로 변형하거나 비동기 setter를 쓰는지 확인한다. 먼저 DOM의 현재값으로 동기 갱신한다. 해결되지 않으면 매 keystroke마다 바뀌는 key나 nested component 정의로 remount하는지 확인한다.
- uncontrolled 전환 경고: value가 null/undefined에서 string으로, checked가 undefined에서 boolean으로 바뀌는지 확인한다.
- 느린 입력: field state를 작은 component에 가깝게 두어 무관한 큰 tree를 매 입력마다 다시 계산하지 않는다. 결과 tree도 같은 값을 사용해야 한다면 `useDeferredValue`로 비긴급 출력만 지연한다. controlled input 자체의 갱신은 지연하지 않는다.
- 선택이 원상복귀: select/input의 onChange에서 실제 현재값을 갱신하지 않았는지 확인한다.

## 이해 확인

1. checkbox의 `value="yes"`만으로 체크를 제어할 수 있는가? 아니다. `checked`가 선택 상태를 제어한다.
2. 다중 선택이 FormData에는 두 개지만 plain object에는 하나인 이유는? 같은 key가 object에서 덮어써졌다.
3. 데이터가 아직 없을 때 textarea를 controlled로 유지하려면? 빈 string 초기값 또는 nullish fallback을 쓴다.

## 출처

- [React DOM, input](https://react.dev/reference/react-dom/components/input)
- [React DOM, textarea](https://react.dev/reference/react-dom/components/textarea)
- [React DOM, select](https://react.dev/reference/react-dom/components/select)
- [React DOM, option](https://react.dev/reference/react-dom/components/option)
- [React DOM, progress](https://react.dev/reference/react-dom/components/progress)

## 관련 문서

- [[React-State-Effects-and-Events]]
- [[React-DOM-Form-Actions]]
- [[TS-React-Type-Contracts]]
