---
tags: [cs, algorithm, binary-search, parametric-search, lis]
status: done
category: "CS - 알고리즘"
aliases: ["Binary Search and LIS", "이분탐색과 LIS"]
---

# 이분탐색, 매개변수 탐색과 LIS

이분탐색은 정렬된 배열의 값만 찾는 기법이 아니다. 후보 답에 대한 판정이 `false...false, true...true`처럼 단조로우면 답의 경계도 이분탐색할 수 있다.

## 경계를 찾는 이분탐색

반열린 구간 `[lo, hi)`에서 처음으로 predicate가 `true`인 위치를 찾는 형태를 정하면 off-by-one을 줄일 수 있다.

```text
while lo < hi:
  mid = lo + (hi - lo) / 2
  if predicate(mid): hi = mid
  else: lo = mid + 1
return lo
```

loop invariant는 `[0, lo)`는 거짓이고 `[hi, n)`은 참이라는 식으로 명시한다. `mid = (lo + hi) / 2`의 덧셈 overflow를 피하려면 차를 이용한다.

`lower_bound`는 `value` 이상인 첫 위치, `upper_bound`는 `value`보다 큰 첫 위치를 반환한다. 결과가 `end()`일 수 있으므로 dereference 전에 확인한다. 같은 값의 개수는 `upper_bound - lower_bound`로 구할 수 있다.

## 답을 이분탐색하기

최댓값을 최소화하거나 최솟값을 최대화하는 문제는 다음 순서로 바꾼다.

1. 후보 답 `x`를 정한다.
2. `x`로 조건을 만족할 수 있는지 O(f(n))에 판정한다.
3. `x`가 커질수록 판정이 한 방향으로만 변함을 증명한다.
4. 가능한/불가능 경계를 포함하도록 초기 구간을 잡는다.

전체 시간은 보통 `O(f(n) log R)`이며 `R`은 답의 탐색 범위다. 판정 함수가 내부 state를 재사용해 이전 호출 결과에 오염되지 않게 한다.

## Longest Increasing Subsequence

`dp[i]`를 `i`에서 끝나는 LIS 길이로 두면 이전의 더 작은 모든 값을 확인해 O(n^2)에 길이를 구할 수 있다.

더 빠른 방법은 길이별 증가 부분수열의 가능한 마지막 값 중 최솟값을 `tails`에 유지한다.

- strictly increasing LIS: `lower_bound`로 `a[i]` 이상인 첫 위치를 교체한다.
- non-decreasing subsequence: `upper_bound`로 `a[i]`보다 큰 첫 위치를 교체한다.
- 교체 위치가 없으면 `tails` 뒤에 추가한다.

`tails` 자체가 원래 배열의 실제 subsequence일 필요는 없지만 그 길이는 LIS 길이다. 실제 수열을 복원하려면 각 원소가 들어간 길이 위치와 predecessor index를 별도로 저장하고 마지막 index부터 거슬러 올라간다.

## 흔한 오류

- 배열이 정렬되지 않았는데 값 찾기용 binary search를 적용함
- predicate가 단조롭지 않은데 답을 이분탐색함
- `lo`, `hi`가 가능한 값인지 불가능한 값인지 invariant가 없음
- `lower_bound`와 `upper_bound`를 바꿔 중복 값의 의미가 달라짐
- 빠른 LIS의 `tails`를 곧바로 정답 수열로 출력함
- 답 범위의 최댓값이나 합이 `int`를 넘음

## 출처

- 인프런, 큰돌 강사, [6주차 개념 #1. 이분탐색(Binary Search)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100313), [6주차 개념 #2. 최대증가부분수열(LIS, Longest Increasing Subsequence)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=246964), [6-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100947), [6-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100948), [6-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100949)
- 인프런, 큰돌 강사, [6-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100950), [6-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100952), [6-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100953), [6-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100954), [6-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100955)
- 인프런, 큰돌 강사, [6-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100956), [6-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100957), [6-M O(NlogN) 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100959), [6-M O(N^2) 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152727), [6-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100960)
- 인프런, 큰돌 강사, [6-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100961)

- [NIST DADS, binary search](https://xlinux.nist.gov/dads/HTML/binarySearch.html)
- [NIST DADS, longest increasing subsequence](https://xlinux.nist.gov/dads/HTML/longestIncreasingSubseq.html)
- [C++ working draft, binary search algorithms](https://eel.is/c++draft/alg.binary.search)

## 관련 문서

- [[Cpp-Language-Memory-and-STL|C++ 표준 Algorithm]]
- [[Algorithm-DP|동적 프로그래밍]]
- [[Algorithm-Complexity|복잡도 분석]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
