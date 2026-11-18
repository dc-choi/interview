---
tags: [cs, algorithm, csp, constraint-satisfaction, backtracking, arc-consistency]
status: done
category: "CS - 알고리즘"
aliases: ["Constraint Satisfaction Problem", "CSP", "제약 충족 문제", "제약 만족 문제", "Node Consistency", "노드 일관성", "Arc Consistency", "아크 일관성", "AC-3", "Forward Checking", "전방 검사", "Maintaining Arc Consistency", "MAC", "MRV", "Degree Heuristic", "차수 휴리스틱", "Least Constraining Value", "LCV", "Min-Conflicts", "최소 충돌"]
---

# 제약 충족 문제

제약 충족 문제(CSP)는 변수마다 값을 하나씩 정하되 주어진 제약을 모두 만족하는 할당을 찾는 문제다. 경로가 아니라 할당 자체가 답이다. 시험과 회의 일정, 지도 색칠, 스도쿠, 서비스를 서로 다른 서버에 두는 반친화(anti-affinity) 배치가 이 형태다.

## 구성

- 변수 `X_1, ..., X_n`과 변수마다의 도메인(가질 수 있는 값의 집합)
- 제약: 변수 값의 허용 조합을 제한하는 규칙
  - 단항 제약은 변수 하나에 건다. 예: `D = 2`
  - 이항 제약은 변수 둘에 건다. 예: `A ≠ B`
  - 고차 제약은 셋 이상에 건다. 예: 스도쿠 한 행의 9칸이 모두 다르다(쌍마다 `≠`로 풀어 쓸 수도 있다)
- 제약 그래프: 변수를 정점, 이항 제약을 간선으로 둔다.
- 하드 제약은 해가 반드시 지켜야 하고, 소프트 제약은 해 사이의 선호를 나타낸다. 소프트 제약이 있으면 선호를 최대한 만족시키는 최적화 문제가 된다. 아래는 하드 제약만 다룬다.

변수 `n`개의 도메인 크기가 `d`면 가능한 할당은 `d^n`개이고, CSP는 일반적으로 NP-hard다.

## 예: 서비스 배치 (가상)

서비스 A~F를 서버 1, 2, 3에 하나씩 둔다. 장애 도메인을 나누려고 다음 여덟 쌍은 같은 서버에 두지 않고, D는 전용 장비 때문에 서버 2에만 둘 수 있다. 이 문제의 해는 8개다.

- 같은 서버 금지: A-B, A-C, A-D, B-C, B-F, C-F, D-F, E-F

## 일관성으로 도메인을 줄인다

- **노드 일관성**: 도메인의 모든 값이 그 변수의 단항 제약을 만족한다. D의 도메인 {1, 2, 3}에서 1과 3을 지워 {2}로 만든다.
- **아크 일관성**: 아크 `X → Y`가 일관되려면 X의 모든 값마다 제약을 만족하는 Y의 값이 하나 이상 있어야 한다. 짝이 없는 값은 X(꼬리)의 도메인에서 지운다. 간선 하나는 두 방향의 아크다.

```text
REVISE(X, Y):                       # X를 Y에 대해 아크 일관되게
  revised = false
  X의 도메인의 각 값 x에 대해:
    제약을 만족하는 y가 Y의 도메인에 없으면 x를 지우고 revised = true
  revised 반환

AC-3:
  queue = 모든 아크
  queue가 빌 때까지:
    (X, Y) = queue에서 꺼냄
    REVISE(X, Y)가 true이면:
      X의 도메인이 비었으면 실패 반환
      Y를 뺀 X의 이웃 Z마다 (Z, X)를 queue에 넣음
  성공 반환
```

X의 도메인이 줄면 X의 값에 기대던 이웃 Z의 값이 짝을 잃었을 수 있어 `(Z, X)`를 다시 검사한다. 아크가 `e`개, 도메인 크기가 `d`면 최악 `O(e d³)`이다.

예에서는 D = {2}이므로 AC-3가 D의 이웃 A와 F에서 2를 지워 A = {1, 3}, F = {1, 3}이 된다. 그 뒤 다시 검사하는 아크에서는 더 지울 값이 없고, 값이 둘 이상 남은 변수가 있어 해는 아직 정해지지 않는다.

아크 일관성이 성립해도 해가 있다는 보장은 없다. 서로 달라야 하는 세 변수의 도메인이 모두 {빨강, 초록}이면 모든 아크가 일관되지만 해가 없다. 아크 일관성은 두 변수 사이의 짝만 보기 때문이며, 그래서 탐색이 여전히 필요하다.

## 백트래킹 탐색

CSP를 [[Search-Problem-Formulation|탐색 문제]]로 보면 초기 상태는 빈 할당, 행동은 변수 하나에 값을 더하는 것, 목표는 모든 변수가 제약을 만족하며 할당된 상태다. 경로 비용은 의미가 없다. 할당 순서는 결과를 바꾸지 않으므로(A = 1 다음 B = 2와 그 반대는 같은 할당) 깊이마다 변수 하나만 정한다. 상태를 바꾸고 되돌리는 틀은 [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]과 같다.

```text
BACKTRACK(assignment):
  assignment가 완성이면 반환
  var = SELECT-UNASSIGNED-VAR()                 # MRV, 차수 휴리스틱
  ORDER-DOMAIN-VALUES(var)의 각 value에 대해:     # LCV
    value가 현재 할당과 모순되지 않으면:
      var = value를 할당에 추가
      inferences = INFERENCE(var)               # 전방 검사, MAC
      inferences가 실패가 아니면:
        추론 결과를 할당에 반영
        result = BACKTRACK(assignment)
        result가 실패가 아니면 result 반환
      var = value와 추론 결과를 되돌림
  실패 반환
```

**고정 순서의 실패.** 예를 A~F 순서로, 값은 작은 것부터, 추론 없이 시도하면 A = 1, B = 2, C = 3, D = 2, E = 1까지 간다. 이때 F의 이웃 B, C, D, E가 2, 3, 2, 1이라 F에 줄 값이 없다. E로 돌아가 E = 2로 바꾸면 F = 1로 끝난다. E의 첫 값이 F의 마지막 선택지를 없앤 것이다.

## 추론을 섞는다

- **전방 검사(forward checking)**: 값을 할당할 때마다 그 변수와 제약으로 이어진 미할당 변수의 도메인에서 모순되는 값을 지운다.
- **아크 일관성 유지(MAC)**: 변수 X에 값을 할당할 때마다 X의 이웃 Y에 대한 아크 `(Y, X)`들로 AC-3를 시작해 연쇄적으로 전파한다. 전방 검사보다 멀리 전파해 백트래킹은 줄지만 할당마다 계산이 더 든다.
- 백트랙할 때는 할당과 함께 추론으로 지운 값도 되돌린다.

## 변수와 값의 순서

- **MRV(최소 잔여값)**: 남은 값이 가장 적은 변수를 먼저 고른다. 값이 바닥나 실패할 변수를 일찍 드러내 쓸데없는 가지를 줄인다.
- **차수 휴리스틱**: MRV가 동점이면 미할당 변수와 걸린 제약이 가장 많은 변수를 고른다. 한 번의 할당으로 많은 변수의 도메인을 줄인다.
- **LCV(최소 제약 값)**: 고른 변수의 값 중 이웃 미할당 변수의 도메인에서 지우는 값이 가장 적은 값부터 시도한다. 값마다 지워지는 개수를 세는 계산이 더 든다.

변수는 실패할 것을 먼저, 값은 실패하지 않을 것을 먼저 고른다. 모든 변수는 결국 정해야 하므로 어려운 변수를 미루면 손해지만, 값은 하나만 맞으면 되므로 가능성을 많이 남기는 값이 백트래킹을 줄인다.

**예에 적용하기(MAC과 함께).**

1. D는 남은 값이 하나라 MRV로 먼저 정한다(D = 2). 전파로 A = {1, 3}, F = {1, 3}이 된다.
2. A와 F가 남은 값 2개로 동점이다. 미할당 이웃이 F는 B, C, E로 셋, A는 B, C로 둘이라 차수 휴리스틱으로 F를 고른다. F = 1과 F = 3은 이웃 도메인에서 각각 값 3개를 지워 LCV로도 동점이라 F = 1로 두고, 전파로 B, C, E = {2, 3}이 된다.
3. 남은 값이 2개인 A, B, C, E 중 차수가 가장 큰 A, B, C에서 A를 고른다. 여기서 LCV가 갈린다. A = 1은 B와 C에서 아무것도 지우지 않지만, A = 3은 둘 다에서 3을 지워 B = C = {2}로 만들고 서로 달라야 하는 B와 C에 줄 값이 없어진다. LCV는 A = 1을 먼저 시도한다.
4. 이후 B = 2, C = 3, E = 2로 백트래킹 없이 끝난다.

## 지역 탐색으로 풀기

모든 변수에 값을 준 완전한 할당에서 시작해, 제약을 어긴 변수 하나를 무작위로 골라 위반이 가장 적은 값으로 바꾸기를 반복하는 최소 충돌(min-conflicts) 방법도 있다. N-Queens에서는 N이 아주 커도 거의 일정한 시간에 높은 확률로 해를 찾는다고 알려져 있지만, [[Local-Search-and-Simulated-Annealing|지역 탐색]]이라 해를 찾는다는 보장이 없고 해가 없음을 증명하지도 못한다.

## 적용 점검

- 하드 제약과 선호를 먼저 나눈다. 선호까지 하드 제약으로 넣으면 해가 없어질 수 있다.
- 해가 없다고 나오면 제약을 몰래 완화하지 말고 어떤 제약끼리 충돌하는지 찾는다([[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]와 같은 원칙).
- 실제 문제는 검증된 solver나 라이브러리로 모델링하고, 작은 입력은 전수 열거 결과와 대조한다.
- 휴리스틱과 추론의 이득은 문제마다 다르다. 같은 입력에서 할당 시도 수와 시간을 재서 고른다.

## 이해 확인

1. 예에서 AC-3만으로 해가 나오지 않는 이유는? 값이 둘 이상 남은 변수가 있고, 아크 일관성은 두 변수 사이의 짝만 확인한다.
2. MRV가 동점일 때 차수 휴리스틱은 무엇을 세나? 미할당 변수와 걸린 제약의 수다.
3. 고정 순서 탐색에서 E = 1이 왜 실패를 낳았나? F의 이웃이 이미 2와 3을 쓰고 있어 F에 남은 값이 1뿐이었는데, E = 1이 그 값마저 막았다.

## 출처

2026-11-18 아래 강의 자료와 정의, 의사코드와 휴리스틱을 대조했다. 서비스 배치 예는 가상이며, AC-3 결과, 고정 순서 탐색의 백트래킹, 휴리스틱과 MAC의 진행, 해의 수(8개)는 직접 구현해 확인했다.

- [YouTube, freeCodeCamp.org, Harvard CS50's Artificial Intelligence with Python – Full University Course](https://www.youtube.com/watch?v=5NgNicANyqM&t=23116s) — Optimization 구간의 제약 충족 문제
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 3 Optimization](https://cs50.harvard.edu/ai/2020/notes/3/) — 하드와 소프트, 단항과 이항 제약, 노드와 아크 일관성, REVISE와 AC-3, 탐색 문제로서의 CSP, MAC의 시작 아크
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Constraint Satisfaction Problems](https://inst.eecs.berkeley.edu/~cs188/textbook/csp/csps.html) — 정의, NP-hard, `O(d^N)` 할당, 고차 제약과 제약 그래프
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Filtering](https://inst.eecs.berkeley.edu/~cs188/textbook/csp/filtering.html) — 전방 검사, 꼬리 값 제거, AC-3의 `O(ed³)`, 백트래킹 감소와 계산량의 절충
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, Ordering](https://inst.eecs.berkeley.edu/~cs188/textbook/csp/ordering.html) — MRV와 LCV, LCV의 추가 계산
- [UC Berkeley, CS 188 Introduction to Artificial Intelligence, CSPs: Local Search](https://inst.eecs.berkeley.edu/~cs188/textbook/csp/local-search.html) — 최소 충돌 방법, 불완전성과 N-Queens 성능
- [University of Toronto, CSC384, MRV and degree heuristic example](https://www.teach.cs.toronto.edu/~csc384h/summer/Lectures/MRV-DH-example.pdf) — MRV 동점을 미할당 변수와의 제약 수로 가르는 차수 휴리스틱

## 관련 문서

- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]
- [[Search-Problem-Formulation|탐색 문제의 정식화]]
- [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]
- [[Local-Search-and-Simulated-Annealing|지역 탐색과 담금질 기법]]
- [[Linear-Programming|선형 계획법]]
- [[Energy-Based-Reasoning|에너지 기반 추론과 제약 검증]] — 스도쿠 같은 제약 문제를 학습된 모델로 풀 때의 검증
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘과 최적화 인덱스]]
