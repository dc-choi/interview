---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Fast Refresh 상태와 오류 복구", "NextJS-Fast-Refresh"]
---

# Next.js Fast Refresh 상태와 오류 복구

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## Fast Refresh

9.4+에서 기본 활성화된 React 개발 feedback loop다. component-only file 변경은 해당 file을 업데이트/재렌더하고 local function component state를 가능한 경우 보존한다. non-component exports가 섞이면 importer도 재실행한다. React tree 밖에서 import한 파일까지 연결되면 full reload로 fallback할 수 있다.

component와 외부 utility가 같이 쓰는 constant는 별도 module로 옮기면 refresh boundary가 더 명확해질 수 있다. production navigation state preservation과 개발 Fast Refresh를 같은 기능으로 설명하지 않는다.

## state 보존 조건

function component의 useState/useRef는 hook order와 arguments를 유지하는 조건에서 보존한다. class component, class를 반환하는 HOC, component 이외 exports와 anonymous default arrow export에서는 state가 reset될 수 있다. name-default-component codemod로 이름을 부여할 수 있다.

```tsx
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

import filename 대소문자를 정확히 맞춘다. macOS에서 통과한 잘못된 casing이 다른 filesystem에서 실패할 수 있다.

## 오류 복구

syntax error를 고쳐 저장하면 overlay가 사라지고 state를 보존할 수 있다. runtime error도 수정 후 복구하지만 render 중 오류는 updated code로 remount하며 state를 잃을 수 있다. error boundary는 다음 edit에 retry render한다. production failure UI와 recovery 책임을 고려해 경계를 정하며 refresh 편의만으로 과도하게 잘게 나누지 않는다.

## effects와 memo

Fast Refresh 동안 useEffect/useMemo/useCallback의 dependency list는 무시하고 다시 실행해 편집 결과를 반영한다. [] effect도 재실행될 수 있다. cleanup이 누락된 subscription/timer는 HMR에서 중복되므로 teardown을 구현한다. Strict Mode에서도 회복 가능한 effects를 작성한다.

## forced reset

file에 // @refresh reset을 넣으면 그 file의 component를 edit마다 remount한다. mount-only animation과 initial state 실험에 유용하며 production config가 아니다. local state 보존이 실패하면 exports, import graph, component type과 hook changes를 먼저 확인한다.

## 편집 예제와 진단

theme.js를 Button/Modal이 함께 import하면 theme 변경은 두 importer를 모두 재실행한다. useMemo의 x*2를 x*10으로 편집하면 x가 같아도 결과를 다시 계산한다. debug 로그나 debugger를 component에 넣어 상태/실행을 관찰할 수 있다. effect 외부에서 난 runtime 오류는 render 중 오류와 달리 상태를 보존할 수 있다. import ./header와 실제 Header의 casing 차이는 fast/full refresh 둘 다 실패시킬 수 있다.

## 출처

- [Next.js, architecture/fast-refresh](https://nextjs.org/docs/architecture/fast-refresh)

## 관련 문서

- [[NextJS-Config-Development]]
- [[NextJS-Config-Rendering]]
