---
tags: [cs, algorithm, fenwick-tree, binary-indexed-tree, range-query]
status: done
category: "CS - 알고리즘"
aliases: ["Fenwick Tree", "Binary Indexed Tree", "펜윅 트리"]
---

# Fenwick tree

Fenwick tree 또는 Binary Indexed Tree는 배열의 prefix aggregate를 compact하게 저장한다. 합처럼 inverse가 있는 연산에서 point update와 prefix/range query를 각각 O(log n)에 처리한다.

## `lowbit`가 나타내는 범위

1-based index `i`에서 `i & -i`는 가장 낮은 set bit의 값이다. `tree[i]`는 보통 다음 구간의 합을 저장한다.

```text
[i - lowbit(i) + 1, i]
```

2의 보수 표현을 전제로 한 bit trick을 signed overflow 경계에 적용하지 않는다. index는 양수 범위에서 사용하고, 합을 저장하는 type은 값의 총합을 담을 만큼 넓게 잡는다.

## Point update

원소 `index`에 `delta`를 더할 때 그 원소를 포함하는 상위 구간으로 이동한다.

```text
while index <= n:
  tree[index] += delta
  index += index & -index
```

값을 `newValue`로 대입하려면 현재 값을 따로 저장해 `delta = newValue - oldValue`를 계산한다.

## Prefix와 range query

`1..index`의 합은 현재 구간을 더하고 parent prefix로 이동한다.

```text
sum = 0
while index > 0:
  sum += tree[index]
  index -= index & -index
```

inclusive range `[left, right]`의 합은 `prefix(right) - prefix(left - 1)`이다. 외부 API를 0-based로 만들 수 있지만 내부 변환을 한 곳에 모아 index 0에서 무한 loop가 생기지 않게 한다.

## Build와 범위 확장

모든 원소를 point update하면 O(n log n)에 만들 수 있다. `tree[i]`를 parent `i + lowbit(i)`에 더하는 방식으로 O(n) build도 가능하다.

Difference array와 Fenwick tree를 결합하면 range add와 point query를 처리할 수 있다. Fenwick tree 두 개를 사용하면 range add와 range sum도 O(log n)에 구현할 수 있지만, 식의 index convention을 먼저 유도하고 검증해야 한다.

## Coordinate compression

좌표 값은 매우 크지만 실제 등장 값이 n개뿐이면 값을 정렬하고 중복을 제거한 뒤 순위 index로 바꾼다. `lower_bound` 결과에 1을 더하면 Fenwick tree의 1-based index로 사용할 수 있다. compression은 대소 순서를 보존하지만 원래 좌표 사이의 거리까지 보존하지는 않는다. 같은 값은 같은 rank를 가져야 한다.

## Segment tree와 비교

| 요구 | Fenwick tree | Segment tree |
|---|---|---|
| point add, prefix/range sum | 간단하고 memory가 작음 | 가능 |
| range minimum/maximum | 일반적 형태로는 부적합 | 적합 |
| 복잡한 node 정보와 lazy range update | 제한적 | 확장 가능 |
| 구현 상수와 코드 길이 | 작음 | 상대적으로 큼 |

## 구현 체크리스트

- 내부 index가 1부터 시작하는가?
- update에 새 값이 아니라 `delta`를 넣었는가?
- `left - 1`이 API convention과 맞는가?
- prefix 총합이 저장 type을 넘지 않는가?
- 여러 test case에서 tree를 다시 초기화하는가?

## 출처

- 인프런, 큰돌 강사, [8주차 개념 #1. 펜윅트리(Fenwick Tree)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100315), [8-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101057), [8-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101062), [8-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101063), [8-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101064)
- 인프런, 큰돌 강사, [8-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101065)

- Peter M. Fenwick, [A new data structure for cumulative frequency tables](https://doi.org/10.1002/spe.4380240306), 1994

## 관련 문서

- [[Prefix-Sum-and-Range-Queries|누적합과 구간 질의]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
