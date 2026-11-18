---
tags: [cs, algorithm, optimization, linear-programming, simplex, scipy]
status: done
verified_at: 2026-11-18
category: "CS - 알고리즘"
aliases: ["Linear Programming", "선형 계획법", "선형 계획", "LP", "Simplex Method", "단체법", "Interior-Point Method", "내부점법", "LP Relaxation", "LP 완화", "linprog"]
---

# 선형 계획법

선형 계획법(LP)은 일차식인 목적 함수를 일차 등식과 부등식 제약 아래에서 최소화하거나 최대화하는 문제다. 변수는 실수값을 가진다. 생산 계획, 수송과 자원 배분처럼 양을 정하는 문제를 이 형태로 쓰면 범용 solver로 최적해를 구할 수 있다.

## 정식화

$$
\min_{x}\; c^\top x \quad \text{subject to} \quad A_{ub}\,x \le b_{ub},\quad A_{eq}\,x = b_{eq},\quad l \le x \le u
$$

- 목적 함수와 제약이 모두 변수의 일차식이다. 변수끼리 곱하거나 제곱하는 항이 있으면 LP가 아니다.
- 다른 형태는 같은 문제로 바꾼다.
  - 최대화는 목적 함수의 부호를 바꿔 최소화한다.
  - `≥` 제약은 양변에 −1을 곱해 `≤`로 바꾼다.
  - 부등식은 slack 변수(`≤`)를 더하거나 surplus 변수(`≥`)를 빼서 등식으로 바꾼다.
  - 부호 제한이 없는 변수는 두 비음수 변수의 차 `x = x⁺ − x⁻`로 쓴다.
- 결과는 셋 중 하나다. 최적해가 있거나, 모든 제약을 만족하는 해가 없거나(실행 불가능), 목적값을 한없이 좋게 만들 수 있다(무한, unbounded).

## 예: 생산 계획 (가상)

제품 A를 `a`개, B를 `b`개 만들어 이익 `40a + 30b`를 최대화한다.

- 기계 시간: `2a + b ≤ 100`
- 작업 인력: `a + b ≤ 80`
- 계약상 A는 30개 이상: `a ≥ 30`, 그리고 `b ≥ 0`

모든 제약을 만족하는 점의 집합(실행 가능 영역)은 꼭짓점이 (30, 0), (50, 0), (30, 40)인 삼각형이다. 꼭짓점의 이익은 1,200, 2,000, 2,400이므로 최적해는 `a = 30, b = 40`, 이익 2,400이다. 이 해에서 기계 시간과 계약 하한은 등호로 꽉 차고, 인력은 10만큼 남는다. 계약 조건이 없으면 최적해는 (20, 60), 이익 2,600이므로 이 제약이 이익을 200 줄인다.

## 꼭짓점과 단체법

일차 부등식들을 함께 만족하는 영역은 볼록 다면체이고, 그 꼭짓점을 기저 실행 가능해라고 부른다. 영역이 비어 있지 않고 유계이면 최적값은 경계에서 나오며, 위 예처럼 꼭짓점만 비교해도 최적해를 찾는다.

- **단체법(simplex)**: 1947년에 나온 방법이다. 꼭짓점에서 출발해 목적값이 나빠지지 않는 간선을 따라 인접 꼭짓점으로 옮기다 더 좋아질 방향이 없으면 멈춘다. 한 방향으로 끝없이 좋아지면 무한으로, 실행 가능한 시작점을 찾는 단계에서 해가 없으면 실행 불가능으로 판정한다. 퇴화한 문제에서는 같은 해를 맴도는 순환이 생길 수 있어 Bland 규칙 같은 순환 방지 규칙을 쓴다. 최악의 경우 문제 크기에 지수적인 단계가 걸리는 예가 알려져 있다.
- **내부점법(interior-point)**: 꼭짓점을 따라가지 않고 실행 가능 영역의 안쪽을 지나 최적해에 다가간다. LP는 다항 시간에 풀 수 있으며, 1979년 타원체법으로 처음 증명되었고 1984년에는 다항 시간에 도는 내부점법이 발표되었다.
- 직접 구현하기보다 solver를 쓴다. SciPy의 `linprog`는 기본값 `method='highs'`에서 HiGHS의 쌍대 단체법(`highs-ds`)과 내부점법(`highs-ipm`) 중 하나를 자동으로 고른다(SciPy 1.18 문서 기준).

## SciPy로 풀기

```python
from scipy.optimize import linprog

# 최대화는 부호를 바꿔 최소화하고, a >= 30은 -a <= -30으로 바꾼다
res = linprog(
    c=[-40, -30],
    A_ub=[[2, 1], [1, 1], [-1, 0]],
    b_ub=[100, 80, -30],
)
if res.status == 0:
    print(res.x, -res.fun, res.slack)  # [30. 40.] 2400.0 [ 0. 10.  0.]
```

- `linprog`는 `c @ x`를 최소화하고 `A_ub @ x <= b_ub`, `A_eq @ x == b_eq`, `lb <= x <= ub` 형태의 제약을 받는다.
- `bounds` 기본값 `(0, None)`은 모든 변수를 0 이상으로 묶는다. 음수가 될 수 있는 변수는 `bounds=(None, None)`처럼 명시한다. `a ≥ 30`은 `bounds=[(30, None), (0, None)]`로 줘도 같은 답이 나온다.
- 결과는 `status`부터 확인한다. 0은 최적, 1은 반복 한도, 2는 실행 불가능, 3은 무한, 4는 수치 문제다. 위 예에서 계약 하한을 90으로 올리면 `2a + b ≤ 100`과 충돌해 2가 나온다.
- `slack`은 부등식 제약별 여유다. 0인 제약이 최적해를 묶고 있다.

## 정수 조건이 붙으면

변수가 정수여야 하면(서버 대수, 배치 여부를 나타내는 0과 1) 혼합 정수 계획법(MIP)이 된다. 변수 범위가 유한한 정수 계획은 NP-hard이고, 0과 1만 쓰는 정수 계획의 결정 문제는 대표적인 NP-complete 문제다. 정수 조건을 뺀 LP를 완화 문제라고 한다. 완화 문제는 허용하는 해가 더 많으므로, 최소화라면 완화 최적값이 원래 문제 최적값의 하한이고 최대화라면 상한이다. 완화 해를 반올림하면 제약을 어기거나 최적이 아닐 수 있다. MIP solver의 제한 시간과 최적성 차이를 기록하는 방법은 [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]를 따른다.

## 적용 점검

- 목적과 제약이 정말 일차인지 본다. 고정비나 켜고 끄는 결정은 일차식만으로 표현되지 않아 0과 1 변수를 쓰는 MIP로 모델링한다.
- 해와 함께 어떤 제약이 꽉 찼는지 기록한다. 여유가 있는 제약은 한도를 조금 바꿔도 최적값이 그대로이고, 꽉 찬 제약이 개선 여지를 정한다.
- `status`가 4(수치 문제)면 단위와 계수의 크기 차이를 점검한다.
- 실행 불가능이 나오면 제약을 하나씩 빼 보며 충돌하는 조합을 찾는다. 몰래 완화한 해를 원래 문제의 해로 보고하지 않는다.

## 이해 확인

1. `≥` 제약을 `linprog`에 넣는 두 방법은? 양변에 −1을 곱해 `A_ub`와 `b_ub`에 넣거나, 변수 하나의 하한이면 `bounds`로 준다.
2. 계약 조건이 없을 때의 최적해 (20, 60)에서 꽉 찬 제약은? 기계 시간(`2 × 20 + 60 = 100`)과 인력(`20 + 60 = 80`) 모두다.
3. 최대화 문제에서 LP 완화의 최적값은 정수 문제 최적값의 상한인가 하한인가? 상한이다. 완화는 허용하는 해를 넓히므로 최댓값이 같거나 커진다.

## 출처

2026-11-18 아래 강의 자료, 교재와 SciPy 1.18.0 문서를 대조했다. 생산 계획 예는 가상 값이며, 꼭짓점을 직접 열거하고 SciPy 1.18.1의 `linprog`로 실행해 최적해, 여유, 실행 불가능(status 2)과 무한(status 3) 판정, `bounds` 기본값과 단일 튜플 지정의 동작을 확인했다.

- [YouTube, freeCodeCamp.org, Harvard CS50's Artificial Intelligence with Python – Full University Course](https://www.youtube.com/watch?v=5NgNicANyqM&t=22440s) — Optimization 구간의 선형 계획법
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 3 Optimization](https://cs50.harvard.edu/ai/2020/notes/3/) — 비용 함수, `≤`와 `=` 제약, 변수 한계, `≥` 제약의 부호 변환, 단체법과 내부점법
- [MIT, 18.310A lecture notes, Linear programming](https://math.mit.edu/~goemans/18310S15/lpnotes310.pdf) — 표준형 변환(slack, surplus, 자유 변수), 단체법의 기저 실행 가능해와 무한, 실행 불가능 판정, 순환과 Bland 규칙, 상보 여유
- [Linear programming — Wikipedia](https://en.wikipedia.org/wiki/Linear_programming) — 볼록 다면체와 기저 실행 가능해, 경계의 최적값, 단체법의 최악 지수 시간, 내부점법과 다항 시간, 정수 계획의 NP-hard
- [SciPy, scipy.optimize.linprog](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.linprog.html) — 문제 형태, `bounds` 기본값, 기본 method와 status 코드
- [SciPy, linprog(method='highs')](https://docs.scipy.org/doc/scipy/reference/optimize.linprog-highs.html) — `highs`의 자동 선택, `highs-ds` 쌍대 단체법과 `highs-ipm` 내부점법

## 관련 문서

- [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]] — MIP와 최적성 기록
- [[Local-Search-and-Simulated-Annealing|지역 탐색과 담금질 기법]]
- [[Constraint-Satisfaction-Problem|제약 충족 문제]]
- [[Algorithm-Complexity#P, NP, NP-hard, NP-complete|P, NP와 NP-hard]]
- [[Graph-Algorithms-and-Optimization|그래프 알고리즘과 최적화 인덱스]]
