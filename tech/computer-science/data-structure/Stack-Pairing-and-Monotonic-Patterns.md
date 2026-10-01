---
tags: [cs, stack, monotonic-stack, string]
status: done
category: "CS - 자료구조"
aliases: ["Stack Pairing and Monotonic Patterns", "스택 짝짓기와 단조 패턴"]
---

# Stack 짝짓기와 단조 패턴

아직 결정되지 않은 최근 후보를 보관하고 새 입력이 그 후보를 확정하거나 상쇄한다면 LIFO를 검토한다. 짝짓기나 폭발이라는 문제 표현은 힌트이며 stack이 맞는지는 최근 후보만으로 다음 결정을 할 수 있는지로 판단한다.

## 같은 기호 상쇄와 문자열 폭발

같은 기호의 교차 없는 짝짓기는 인접한 같은 쌍을 안쪽부터 지우는 과정이다. 글자를 읽고 top과 같으면 pop, 아니면 push한다. ABBA는 BB 뒤 AA가 사라지지만 ABAB는 남는다. 입력마다 stack을 새로 두고 빈 상태에서 top을 읽지 않는다. 각 글자가 한 번 push/pop되어 O(n)이다.

길이 m인 문자열이 폭발한다면 결과 buffer 끝에 새 글자를 넣고 길이가 m 이상일 때 끝 m글자를 비교해 일치하면 삭제한다. 중간 검색과 삭제를 반복하는 방식과 달리 이미 확정한 prefix를 다시 순회하지 않는다. 비용은 O(nm)이므로 m이 큰 입력에는 문자열 매칭 상태를 함께 유지하는 방법을 검토한다.

## 가장 긴 올바른 괄호 구간

index stack에 초기 기준점 -1을 둔다. 여는 괄호는 index를 push한다. 닫는 괄호는 pop하고 stack이 비면 그 index를 새 기준점으로 넣는다. 비지 않았으면 현재 index에서 top index를 뺀 길이로 최댓값을 갱신한다. 짝이 없는 닫는 괄호가 다음 구간의 시작 경계가 된다.

## 다음 큰 원소

아직 답이 없는 index를 stack에 두고 현재 값이 top 값보다 큰 동안 pop한 index의 답을 현재 값으로 기록한다. 남은 index의 답은 없음으로 둔다. 각 index를 한 번 넣고 한 번 빼므로 중첩 while이 있어도 전체 O(n)이다. 같은 값이 답이 될 수 있는지는 문제의 엄격/비엄격 비교를 따른다.

## 같은 키를 개수로 압축

두 사람 사이에 둘보다 큰 사람이 없으면 서로 보인다는 쌍 세기에서는 키가 아래에서 위로 비증가하는 stack을 둔다. 현재보다 작은 top을 pop하며 그 인원 수를 답에 더한다. 같은 키는 이전 인원을 모두 더한 뒤 하나의 (키, 개수) 항목으로 합친다. 그 아래에 더 큰 사람이 있으면 그 사람 한 명과의 쌍도 더한다. top이 더 크면 top 한 명과만 연결한다.

모두 같은 키인 n명은 n(n-1)/2쌍이므로 결과 type의 범위를 확인한다. 같은 값을 압축하지 않거나 아래 큰 사람의 한 쌍을 빠뜨리는 것이 흔한 오류다.

## 출처

- 인프런 보충 강의: [2-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100338), [2-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100339), [5-B : erase()를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100397)

- [인프런, 큰돌 강사, 1-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100305)
- [인프런, 큰돌 강사, 2-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100344)
- [인프런, 큰돌 강사, 4-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100394)
- [인프런, 큰돌 강사, 4-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100395)
- [인프런, 큰돌 강사, 5-B, stack 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152254)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조와 괄호 검증]]
- [[Algorithm-Complexity|시간복잡도]]
