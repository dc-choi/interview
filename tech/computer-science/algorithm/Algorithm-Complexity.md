---
tags: [cs, algorithm, complexity]
status: done
category: "CS - 알고리즘"
aliases: ["시간복잡도", "Big O", "P-NP"]
verified_at: 2026-08-04
---

# 시간복잡도와 Big O, P-NP

## 시간복잡도

특정 알고리즘의 연산량이 입력 크기와 함께 어떻게 증가하는지를 나타낸다. 실제 시간은 하드웨어와 구현에 따라 달라지므로 입력 크기 `n`에 대한 증가율로 비교한다.

### 점근 표기법

- **O(g(n))**: 충분히 큰 입력에서 증가율이 `g(n)`보다 빠르지 않다는 상한.
- **Ω(g(n))**: 증가율이 `g(n)`보다 느리지 않다는 하한.
- **Θ(g(n))**: 위아래가 모두 `g(n)`으로 묶이는 tight bound.

Big O와 worst case는 같은 말이 아니다. Big O는 상한 표기이고, best/average/worst는 어떤 입력 집합을 분석하는지다. 예를 들어 선형 검색의 worst case는 Θ(n), best case는 Θ(1)이며 둘 다 각 경우에 O(n)이라고 쓸 수 있지만 정보량이 다르다.

| 표기 | 이름 | 설명 |
|---|---|---|
| O(1) | 상수 시간 | 입력 크기와 무관 |
| O(log n) | 로그 시간 | 이진 탐색 등 |
| O(n) | 선형 시간 | 단순 반복 |
| O(n log n) | 선형 로그 시간 | 병합 정렬, heap sort |
| O(n^2) | 이차 시간 | 이중 반복문 |
| O(2^n) | 지수 시간 | 피보나치(단순 재귀) 등 |
| O(n!) | 팩토리얼 시간 | 순열 등 |

점근 분석에서는 상수 계수와 낮은 차수 항을 생략한다.
- `n^2 + 100` -> O(n^2)
- `3n^2 + 100n + 100` -> O(n^2)

### 코드에서 증가율 읽기

- 연속된 block의 비용은 더한 뒤 가장 빠르게 증가하는 항이 지배한다.
- 독립된 두 loop가 각각 `n`번 도는 것은 O(n+n)=O(n)이고, nested loop에서 매 조합을 보면 O(n²)이다.
- index가 매번 상수 배로 커지거나 범위가 절반으로 줄면 반복 횟수는 O(log n)이다.
- 재귀는 함수 이름만 보고 판단하지 않고 recurrence를 세운다. `T(n)=T(n-1)+O(1)`은 O(n), `T(n)=2T(n/2)+O(n)`은 O(n log n)이다.
- loop 안의 `sort`, container 중간 삭제와 문자열 복사 비용도 전체 합에 포함한다.

### 공간복잡도

입력 자체를 제외한 auxiliary space와 입력을 포함한 total space를 구분한다. 전역/정적 배열, heap allocation, container capacity와 recursion stack도 memory다. 재귀 깊이가 `d`이면 call frame 때문에 보통 O(d)의 추가 공간이 필요하다.

## P, NP, NP-hard, NP-complete

복잡도 class는 먼저 yes/no로 답하는 **decision problem**을 기준으로 정의한다.

- **P**: deterministic algorithm으로 polynomial time에 풀 수 있는 decision problem.
- **NP**: yes라는 답의 certificate가 주어졌을 때 polynomial time에 검증할 수 있는 decision problem. 비결정론적 Turing machine이 polynomial time에 푸는 class라는 정의와 동치다.
- **NP-hard**: 모든 NP 문제를 polynomial-time reduction으로 이 문제에 환원할 수 있다. NP에 속할 필요도, decision problem일 필요도 없다.
- **NP-complete**: NP에 속하면서 NP-hard인 문제다.

`P ⊆ NP`는 알려져 있지만 `P = NP`인지는 2026-08-04 현재도 미해결이다. NP를 단순히 exponential time이 필요한 문제나 P보다 어려운 문제라고 정의하면 안 된다. 현재 polynomial-time algorithm을 모른다는 사실과 존재하지 않는다는 증명은 다르다.

최적화 문제는 bound를 붙인 decision version과 연결해 복잡도를 분석할 수 있다. 예를 들어 최소 tour를 찾는 TSP optimization은 NP-hard이고, 비용이 `K` 이하인 tour가 존재하는지를 묻는 decision version은 NP-complete다. bitmask DP는 이를 polynomial로 만들지 않지만 brute force `n!`을 `O(n²2ⁿ)`으로 줄인다. [[Bitmask-DP-and-TSP]]

## 분석할 때 함께 적을 것

- 입력 크기 `n`, 정점 `V`, 간선 `E`처럼 무엇을 크기로 삼았는가
- worst, average, amortized 중 어떤 경우인가
- 시간뿐 아니라 auxiliary space는 얼마인가
- hash table 평균 O(1), Dijkstra 같은 결과가 성립하는 전제는 무엇인가

## 출처

- 인프런, 큰돌 강사, [1주차 개념 #1. 시간복잡도(time complexity)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100308), [1주차 개념 #2. 빅오표기법(Big - O notation)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133278), [1주차 개념 #3. 문제로 연습하는 시간복잡도 Q1](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=126134), [1주차 개념 #4. 문제로 연습하는 시간복잡도 Q2](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133346), [1주차 개념 #5-1. 문제로 연습하는 시간복잡도 Q3](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133347)
- 인프런, 큰돌 강사, [1주차 개념 #6. 문제로 연습하는 시간복잡도 Q4](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133348), [1주차 개념 #7. 문제로 연습하는 시간복잡도 Q5](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134907), [1주차 개념 #8. 공간복잡도(space complexity)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133247)

- 인프런, 감자 강사, [자료구조와 알고리즘이란?](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=114977), [시간복잡도](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=114984)
- [NIST DADS, big-O notation](https://xlinux.nist.gov/dads/HTML/bigOnotation.html)
- [Clay Mathematics Institute — P versus NP](https://www.claymath.org/millennium/p-vs-np/)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — P-NP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135775)

## 관련 문서
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]
- [[Problem-Solving-Techniques|코딩 테스트 문제 해결 기법]]
