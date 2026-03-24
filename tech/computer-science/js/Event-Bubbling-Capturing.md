---
tags: [cs, javascript, dom, event]
status: study
category: "CS&프로그래밍(CS&Programming)"
aliases: ["이벤트 버블링과 캡처링"]
---

# 이벤트버블링과캡처링

## 이벤트전파3단계

DOM에서 이벤트가 발생하면 3단계로 전파된다:

```
① 캡처링 단계: window → document → html → body → ... → 타겟의 부모
② 타겟 단계:   타겟 요소에서 이벤트 처리
③ 버블링 단계: 타겟의 부모 → ... → body → html → document → window
```

## 이벤트버블링(Bubbling)

- 이벤트가 타겟에서 시작하여 **부모 요소로 올라가는** 것 (자식 → 부모)
- 대부분의 이벤트는 기본적으로 버블링됨

```javascript
// 자식 클릭 시 → 자식 핸들러 → 부모 핸들러 순서로 실행
parent.addEventListener('click', () => console.log('부모'));
child.addEventListener('click', () => console.log('자식'));
// child 클릭 결과: "자식" → "부모"
```

## 이벤트캡처링(Capturing)

- 이벤트가 최상위에서 시작하여 **타겟으로 내려가는** 것 (부모 → 자식)
- `addEventListener`의 세 번째 인자를 `true`로 설정하면 캡처링 단계에서 핸들러 실행

```javascript
parent.addEventListener('click', () => console.log('부모'), true); // 캡처링
child.addEventListener('click', () => console.log('자식'));
// child 클릭 결과: "부모" → "자식"
```

## stopPropagation

- 이벤트 전파를 중단시키는 메서드
- 버블링/캡처링 모두 중단 가능

```javascript
child.addEventListener('click', (e) => {
  e.stopPropagation(); // 부모로 전파 중단
  console.log('자식만 실행');
});
```

## 이벤트위임(EventDelegation)

- 버블링을 활용한 패턴
- 자식 요소마다 이벤트를 등록하지 않고, **부모에 하나만 등록**하여 자식 이벤트를 처리

```javascript
// 각 li에 이벤트를 등록하는 대신 ul에 한번만 등록
ul.addEventListener('click', (e) => {
  if (e.target.tagName === 'LI') {
    console.log(e.target.textContent);
  }
});
```

### 이벤트위임의장점
- 동적으로 추가되는 요소에도 자동으로 이벤트 적용
- 메모리 사용량 감소 (핸들러 수 감소)
- 코드 관리가 간편

## 면접포인트
- "버블링 vs 캡처링?" → 버블링은 자식→부모, 캡처링은 부모→자식
- "이벤트 위임이란?" → 버블링을 활용해 부모에 핸들러 하나로 자식 이벤트를 처리하는 패턴
- "stopPropagation vs preventDefault?" → stopPropagation은 전파 중단, preventDefault는 기본 동작 중단
