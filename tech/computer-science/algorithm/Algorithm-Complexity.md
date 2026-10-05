---
tags: [cs, algorithm, complexity]
status: done
category: "CS - 알고리즘"
aliases: ["시간복잡도", "Big O", "P-NP"]
verified_at: 2026-09-30
---

# 시간복잡도와 Big O, P-NP

## 시간복잡도

특정 알고리즘의 연산량이 입력 크기와 함께 어떻게 증가하는지를 나타낸다. 실제 시간은 하드웨어와 구현에 따라 달라지므로 입력 크기 `n`에 대한 증가율로 비교한다.

실행 시간은 초가 아니라 실행하는 기본 단계 수로 센다. 줄마다 한 번 실행하는 비용을 상수 `cᵢ`로 두고 그 줄이 실행되는 횟수를 곱해 모두 더한다. 길이 `n`인 배열을 한 번 도는 loop는 조건 검사가 빠져나올 때의 마지막 검사까지 `n + 1`번, 본문이 `n`번 실행되므로 전체가 `T(n) = an + b` 꼴이 된다. `n`이 커질 때 덜 중요한 낮은 차수 항과 최고차항의 계수를 버리고 증가율만 남기는 것이 점근 분석이고, 그 결과를 아래 O, Ω, Θ로 적는 것이 점근 표기법이다. `an + b`는 Θ(n)이다.

### 점근 표기법

- **O(g(n))**: 충분히 큰 입력에서 증가율이 `g(n)`보다 빠르지 않다는 상한.
- **Ω(g(n))**: 증가율이 `g(n)`보다 느리지 않다는 하한.
- **Θ(g(n))**: 위아래가 모두 `g(n)`으로 묶이는 tight bound.

Big O와 worst case는 같은 말이 아니다. Big O는 상한 표기이고, best/average/worst는 어떤 입력 집합을 분석하는지다. 예를 들어 선형 검색의 worst case는 Θ(n), best case는 Θ(1)이며 둘 다 각 경우에 O(n)이라고 쓸 수 있지만 정보량이 다르다.

케이스와 표기는 서로 독립이다. best case에는 Ω, worst case에는 O, average case에는 Θ를 짝지어 쓴다는 규칙은 없고, 각 케이스마다 세 표기를 모두 쓸 수 있다. average case는 입력 분포를 가정해야 정의된다. 찾는 값이 배열에 있고 위치가 균등하다고 가정하면 선형 검색의 평균 비교는 `(n + 1) / 2`번이라 Θ(n)이다. 정렬된 배열의 binary search는 가운데에서 바로 찾으면 Θ(1)이 best이고, 값이 없으면 범위가 절반씩 줄어 1이 될 때까지(`n / 2ᵏ = 1`에서 `k = log₂ n`) 약 log₂ n번 비교하므로 worst가 Θ(log n)이다. 케이스를 가리지 않고 한 줄로 말하면 Ω(1), O(log n)이다.

실무와 면접에서 O를 가장 많이 쓰는 이유는 최악의 상한만 알아도 계획을 세울 수 있고 다른 bound는 구하기 번거롭기 때문이다. O를 tight bound 뜻으로 느슨하게 쓰는 경우가 많지만 O는 상한일 뿐이라, 선형 검색을 O(n²)이라 해도 틀리지는 않고 정보가 적을 뿐이다. merge sort처럼 입력과 무관하게 같은 방식으로 나누고 합쳐 best와 worst가 같은 차수면 Θ(n log n)으로 적는 편이 정확하다.

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
- 안쪽 반복이 바깥 index에 따라 줄어도 차수는 그대로다. 회차 `i`마다 `n-1-i`번 도는 이중 loop는 `(n-1) + (n-2) + ... + 1 = n(n-1)/2`번이라 Θ(n²)다. `n = 4`면 6번, `n = 2000`이면 1,999,000번이고 `n`이 2배가 되면 약 4배가 된다. 안쪽 길이의 평균이 `n/2`로 여전히 `n`에 비례하므로 계수 1/2만 버린다. 버블, 선택 정렬의 비교 수와 삽입 정렬의 최악이 이 합이다([[Algorithm-Sorting|정렬]]). 모든 (i, j) 쌍을 보는 `n²`번과 비교하면 같은 Θ(n²)라도 일이 절반이라, 점근 복잡도가 같다고 실행 시간이 같지는 않다([[Algorithm-Practice#통과한 풀이를 더 줄이기|통과한 풀이를 더 줄이기]]).
- loop가 몇 겹 중첩됐는지로 차수를 어림하는 방법(두 겹이면 약 O(n²))은 각 loop의 반복 횟수가 `n`에 비례할 때만 맞다. 범위가 절반씩 줄면 log n, 상한이 상수면 O(1)로 따로 센다.
- 크기가 서로 독립인 입력 `n`, `m`은 하나로 합치지 않는다. 나열한 두 loop는 O(n + m), 중첩하면 O(nm)이고, `n² + n + m² + m`은 변수마다 최고차항을 남겨 O(n² + m²)로 쓴다. 두 크기의 대소 관계를 모르면 어느 쪽도 버릴 수 없다. `max(n, m) ≤ n + m ≤ 2 max(n, m)`이므로 O(n + m)은 O(max(n, m))과 같은 뜻이다.
- index가 매번 상수 배로 커지거나 범위가 절반으로 줄면 반복 횟수는 O(log n)이다. `i = n`에서 시작해 `i > 0`인 동안 `i /= 2` 하면 정확히 `⌊log₂ n⌋ + 1`번 돈다(`n = 8, 16, 32`에서 4, 5, 6번). 2로 나눠 1에 이르는 횟수는 1에 2를 곱해 `n`에 이르는 횟수와 같고, 이것이 log의 정의다. 밑이 다른 log는 상수 배 차이(`log_a n = log_b n / log_b a`)라 점근 표기에서는 밑을 생략하며, 알고리즘 문맥의 `log n`은 보통 `log₂ n`이다.
- 재귀는 함수 이름만 보고 판단하지 않고 recurrence를 세운다. `T(n)=T(n-1)+O(1)`은 O(n), `T(n)=2T(n/2)+O(n)`은 O(n log n)이다. 호출 수로 세는 방법은 아래 재귀 호출 수 세기에 있다.
- loop 안의 `sort`, container 중간 삭제와 문자열 복사 비용도 전체 합에 포함한다. 함수 호출 한 줄이 O(1)이라는 보장도 없다. 입력을 그대로 넘기는 호출은 호출된 함수의 복잡도를 물려받고, `n`번 도는 loop 안에서 O(n) 함수를 부르면 O(n²)이다. 호출되는 함수의 구현이 보이지 않으면 그 복잡도부터 확인해야 전체를 답할 수 있다.

- 종료 조건이 값의 제곱이나 거듭제곱에 걸리면 반복 횟수도 그만큼 줄어든다. `i * i <= n`까지 도는 제곱수 판별은 O(√n), 1에서 시작해 2배씩 키워 `n` 이하의 가장 큰 2의 거듭제곱을 찾는 loop는 O(log n)이다.

반복 횟수가 한눈에 안 보이면 가장 안쪽 loop나 재귀 함수 첫 줄에서 counter를 올려 작은 `n` 몇 개로 실행하고 표로 정리한다. `for i in [0, n)` 안에 `for j in [0, i)`가 있으면 `n = 3, 4, 5, 6`에서 3, 6, 10, 15번이 나오고, (i, j) 격자를 그리면 `n × n` 정사각형에서 대각선 아래 절반이라 `n(n-1)/2`로 추정된다. 추정한 식으로 다른 `n`의 값을 예측해 실행 결과와 맞춰 보고, 마지막에는 합 공식이나 recurrence로 확인한다. 측정으로 얻은 식은 가설일 뿐이다.

### 재귀 호출 수 세기

재귀의 시간은 호출 1회의 비용(그 안에서 부르는 재귀 호출 제외)에 전체 호출 수, 즉 호출 tree의 node 수를 곱해 구한다. 호출마다 비용이 다르면(merge sort처럼 구간 길이에 비례) level별로 비용을 더한다.

- **분기 k개, 깊이 n**: 인자를 1 줄여 자신을 `k`번 부르고 0에서 멈추면 호출 수는 `1 + k + k² + ... + kⁿ = (k^(n+1) - 1)/(k - 1)`이라 Θ(kⁿ)다. `k = 3, n = 3`이면 1 + 3 + 9 + 27 = 40번이다. recurrence로는 `T(n) = kT(n-1) + O(1)`이다.
- **구간 절반 분할**: `go(l, r)`이 `l == r`에서 멈추고 `[l, mid]`, `[mid+1, r]`로 나뉘면 `n`이 2의 거듭제곱일 때 깊이가 `log₂ n`이라 같은 등비수열 합이 `2^(log₂ n + 1) - 1 = 2n - 1`이 된다. `n`이 2의 거듭제곱이 아니어도 호출 tree는 leaf가 `n`개인 full binary tree라 node가 `2n - 1`개다(`n = 5, 10, 20`에서 9, 19, 39번). 즉 `T(n) = 2T(n/2) + O(1)`은 O(n)이고, 같은 호출 tree에 level마다 합이 `n`인 병합 비용이 붙으면 O(n log n)이 된다.

### 제한 시간에서 허용 복잡도 역산

코딩 테스트의 시간 제한은 풀이가 감당할 연산 수의 예산이다. 단순 연산 기준으로 1초에 대략 수억 번(흔히 3억에서 5억)을 어림으로 쓰며, 나눗셈, 함수 호출, 캐시 미스가 많으면 줄어든다. 입력 크기의 최댓값을 대입해 풀이를 구현하기 전에 통과 여부를 가늠한다.

| 입력 크기 `n` (1초 기준 경험칙) | 대략 허용되는 복잡도 |
|---|---|
| 10 안팎 | O(n!) |
| 20에서 25 | O(2ⁿ) |
| 수백 | O(n³) |
| 수천 | O(n²), O(n² log n) |
| 수십만에서 100만 | O(n log n) |
| 1000만 안팎 | O(n) |
| 그보다 크면 | O(log n), O(1) 또는 수식 |

절대 기준은 아니다. 상수가 작으면 `n = 10000`의 O(n²)도 통과하고, 연산이 무거우면 `n = 100만`의 O(n log n)도 넘칠 수 있다. `n = 500`인데 O(2ⁿ) 풀이가 떠올랐다면 구현 전에 버린다.

### 공간복잡도

입력 자체를 제외한 auxiliary space와 입력을 포함한 total space를 구분한다. 전역/정적 배열, heap allocation, container capacity와 recursion stack도 memory다. 재귀 깊이가 `d`이면 call frame 때문에 보통 O(d)의 추가 공간이 필요하다. 코딩 테스트에서는 공간보다 시간 때문에 틀리는 경우가 많지만, 메모리 제한도 미리 환산해 둔다.

메모리 제한은 선언할 수 있는 배열 크기의 예산이다. 필요한 byte는 원소 수 × 원소 크기이며, 입력 범위로 필요한 크기를 정한 뒤 제한 안에 드는지 보거나 거꾸로 제한에서 최대 크기를 역산한다. 흔한 data model(ILP32, LLP64, LP64)에서 `int`는 4바이트라 1MB를 2²⁰바이트로 보면 64MB에 약 1,678만, 128MB에 약 3,355만, 512MB에 약 1억 3,422만 개(512 × 2²⁰ / 4)가 이론 상한이다. 1MB를 10⁶바이트로 보면 각각 1,600만, 3,200만, 1억 2,800만 개다. 크기 5억짜리 `int` 배열이 필요한 풀이는 512MB에서도 구현 전에 틀린 풀이다.

- 실제 여유는 이론 상한보다 작다. runtime 기본 사용량, 다른 배열과 container의 합과 재귀 stack이 함께 들어가고, `map`, `set` 같은 node 기반 container는 원소마다 pointer와 할당 overhead가 붙어 값 크기보다 몇 배 크다. 128MB에서 `int` 3,000만 개 정도로 여유를 두는 식의 경험칙은 보장이 아니다.
- 큰 배열을 함수 안의 지역 변수로 두면 메모리 제한보다 훨씬 작은 stack 한도에 먼저 걸린다. 전역에 둔다([[Algorithm-Recursion#Call stack과 비용|call stack 한도]]).

## P, NP, NP-hard, NP-complete

복잡도 class는 먼저 yes/no로 답하는 **decision problem**을 기준으로 정의한다.

- **P**: deterministic algorithm으로 polynomial time에 풀 수 있는 decision problem.
- **NP**: yes라는 답의 certificate가 주어졌을 때 polynomial time에 검증할 수 있는 decision problem. 비결정론적 Turing machine이 polynomial time에 푸는 class라는 정의와 동치다.
- **NP-hard**: 모든 NP 문제를 polynomial-time reduction으로 이 문제에 환원할 수 있다. NP에 속할 필요도, decision problem일 필요도 없다.
- **NP-complete**: NP에 속하면서 NP-hard인 문제다.

`P ⊆ NP`는 알려져 있지만 `P = NP`인지는 2026-09-30 현재도 미해결이다. NP를 단순히 exponential time이 필요한 문제나 P보다 어려운 문제라고 정의하면 안 된다. 현재 polynomial-time algorithm을 모른다는 사실과 존재하지 않는다는 증명은 다르다.

최적화 문제는 bound를 붙인 decision version과 연결해 복잡도를 분석할 수 있다. 예를 들어 최소 tour를 찾는 TSP optimization은 NP-hard이고, 비용이 `K` 이하인 tour가 존재하는지를 묻는 decision version은 NP-complete다. bitmask DP는 이를 polynomial로 만들지 않지만 brute force `n!`을 `O(n²2ⁿ)`으로 줄인다. [[Bitmask-DP-and-TSP]]

### 환원 예: Hamiltonian cycle에서 TSP decision으로

TSP decision이 NP-complete라는 주장은 두 부분으로 보인다.

1. **NP 소속**: certificate는 도시 순서 하나다. 모든 도시를 정확히 한 번 방문하고 출발점으로 돌아오는지, 총비용이 `K` 이하인지를 O(n)에 검사한다.
2. **NP-hard**: NP-complete로 알려진 Hamiltonian cycle 문제를 polynomial time에 환원한다. 그래프 `G = (V, E)`, `|V| = n`에 대해 `V` 위의 완전 그래프를 만들고 `E`에 있는 쌍은 비용 1, 없는 쌍은 비용 2로 둔 뒤 `K = n`으로 묻는다. `G`에 Hamiltonian cycle이 있으면 비용 `n`인 tour가 있고, 비용 `n` 이하인 tour가 있으면 간선 `n`개가 모두 비용 1이므로 `G`의 간선만 쓴 Hamiltonian cycle이다. 구성은 O(n²)이다.

환원의 방향이 핵심이다. 문제 X가 어렵다는 것을 보이려면 이미 어려운 문제를 X로 환원한다(known ≤p X). X를 쉬운 문제로 환원하면 X가 쉽다는 것만 보인다. 위 환원 때문에 TSP decision에 polynomial-time algorithm이 있으면 Hamiltonian cycle도 polynomial time에 풀리고, 그러면 P = NP다. Hamiltonian path도 NP-complete라 출발 문제로 쓸 수 있지만, tour가 cycle이므로 cycle에서 환원하는 구성이 가장 단순하다.

## 분석할 때 함께 적을 것

- 입력 크기 `n`, 정점 `V`, 간선 `E`처럼 무엇을 크기로 삼았는가
- worst, average, amortized 중 어떤 경우인가
- 시간뿐 아니라 auxiliary space는 얼마인가
- hash table 평균 O(1), Dijkstra 같은 결과가 성립하는 전제는 무엇인가
- 호출하는 함수와 라이브러리 연산의 복잡도를 합에 넣었는가

## 면접 체크포인트

- 코드의 줄별 실행 횟수를 세어 `an + b`를 Θ(n)으로 줄이는 점근 분석을 말로 설명할 수 있는가
- O, Ω, Θ와 best, worst, average case를 따로 구분하고, binary search의 케이스별 복잡도를 말할 수 있는가
- 다른 함수를 부르는 코드의 복잡도를 물으면 호출된 함수의 복잡도부터 확인하는가
- 입력이 둘일 때 O(n + m)과 O(nm)을 구분하는가
- 같은 Big O인 두 풀이의 실제 연산 수 차이를 설명할 수 있는가

## 출처

- 인프런, 큰돌 강사, [1주차 개념 #1. 시간복잡도(time complexity)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100308), [1주차 개념 #2. 빅오표기법(Big - O notation)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133278), [1주차 개념 #3. 문제로 연습하는 시간복잡도 Q1](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=126134), [1주차 개념 #4. 문제로 연습하는 시간복잡도 Q2](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133346), [1주차 개념 #5-1. 문제로 연습하는 시간복잡도 Q3](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133347)
- 인프런, 큰돌 강사, [1주차 개념 #6. 문제로 연습하는 시간복잡도 Q4](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133348), [1주차 개념 #7. 문제로 연습하는 시간복잡도 Q5](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134907), [1주차 개념 #8. 공간복잡도(space complexity)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=133247), [1주차 개념 #5-2. 문제로 연습하는 시간복잡도 Q3 점화식 설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146893)

- 인프런, 감자 강사, [자료구조와 알고리즘이란?](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=114977), [시간복잡도](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=114984), [정렬 - 버블정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116713)
- 인프런, 감자 강사, [외판원 문제 - 개념](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135782)
- YouTube, 쉬운코드, [시간복잡도와 점근적 표기법](https://www.youtube.com/watch?v=tTFoClBZutw), [기술 면접에서 시간 복잡도를 물어보는 이유](https://www.youtube.com/watch?v=0b2VU45xmDk), [TwoSum 문제로 보는 코드 성능 개선 과정](https://www.youtube.com/watch?v=cxhbgAbAiXI)
- [바킹독의 실전 알고리즘 0x01강, 기초 코드 작성 요령 I — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=9MMKsrvRiw4)
- [NIST DADS, big-O notation](https://xlinux.nist.gov/dads/HTML/bigOnotation.html)
- [Clay Mathematics Institute — P versus NP](https://www.claymath.org/millennium/p-vs-np/)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — P-NP, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135775)
- [CME305 Sample Midterm II, Traveling Salesman Problem — Stanford University](https://stanford.edu/~rezab/classes/cme305/W15/Midterm/pmidtermIIsoln.pdf)
- [cppreference, Fundamental types](https://en.cppreference.com/w/cpp/language/types)

## 관련 문서
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]
- [[Problem-Solving-Techniques|코딩 테스트 문제 해결 기법]]
