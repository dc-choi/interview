---
tags: [cs, algorithm, complexity, np-hard, crypto, optimization]
status: done
verified_at: 2026-11-24
category: "CS - 알고리즘"
aliases: ["P vs NP Implications", "P 대 NP의 함의", "Cook-Levin 정리", "평균 사례 난이도", "Impagliazzo의 다섯 세계", "Optiland"]
---

# P 대 NP의 함의: 환원의 크기, 평균 난이도, 암호와 실제 최적화

P 대 NP는 답이 맞는지 빨리 확인할 수 있는 문제라면 답도 빨리 찾을 수 있는지를 묻는다. 정의와 환원의 예는 [[Algorithm-Complexity#P, NP, NP-hard, NP-complete|시간복잡도와 P-NP]]에 있고, 이 문서는 어느 쪽 답이 나오든 무엇이 바뀌고 무엇이 그대로인지를 다룬다. 2026-11-24 기준 미해결이다. Scott Aaronson은 리만 가설 형식 증명 주장이 나온 2026-11-20 블로그에서 P 대 NP가 이제 우리가 관심을 둔 수학의 최종 보스 자리에 올랐다고 적었다. 그 주장의 검증 상태는 [[AI-Assisted-Mathematical-Research#사례: 리만 가설과 유체 방정식 특이점의 형식화 주장|리만 가설 형식화 주장]]에 있다.

## 찾기와 확인의 비대칭

스위치 n개를 켜고 끄는 배치는 2ⁿ가지다. 주어진 조건을 모두 만족하는 배치를 하나씩 따져 찾으면 스위치가 하나 늘 때마다 일이 두 배가 되지만, 누가 내민 배치가 맞는지는 조건을 한 번씩 대 보면 된다. 1초에 10억 개를 따진다면 n = 60에서 약 36.5년, n = 90에서 약 392억 년이 걸린다(직접 계산, 2⁶⁰ ≈ 1.15×10¹⁸, 2⁹⁰ ≈ 1.24×10²⁷). 이 배치 문제가 SAT이고, NP는 yes 답의 증거를 다항 시간에 확인할 수 있는 결정 문제의 모임이다. NP의 정의는 확인이 빠른지만 묻고 찾기가 어려운지는 묻지 않는다.

이 질문의 무게는 일찍 알려졌다. Gödel은 1956년 von Neumann에게 보낸 편지에서, 증명을 찾는 기계가 증명 길이에 선형이나 제곱 정도의 시간으로 돈다면 예/아니요로 답하는 수학 문제에서 수학자의 정신적 노력을 기계가 완전히 대신할 수 있다고 적었다(Aaronson 서베이 1.1절의 인용).

## Cook–Levin 정리: 하나를 풀면 전부 풀린다

Stephen Cook과 Leonid Levin은 1971년 서로 독립적으로 P 대 NP 문제를 정식화했다. Cook–Levin 정리는 3SAT이 NP-완전임을 말한다. 모든 NP 문제를 다항 시간 환원으로 3SAT 인스턴스로 옮겨 적을 수 있다는 뜻이다. 그래서 NP-완전 문제 하나에 다항 시간 알고리즘이 생기면 NP 전체가 P에 들어가고, 반대로 NP-완전 문제 하나라도 다항 시간이 불가능하다는 증명은 모든 NP-완전 문제에 그대로 적용된다. TSP decision처럼 겉모양이 다른 문제들이 한 문제로 묶이는 이유다.

## 환원이 키운 크기가 개선을 지운다

다항 시간 환원은 P와 NP를 가르는 데는 충분하다. 그러나 지수 시간 안에서 지수를 얼마나 줄였는지를 비교할 때는 환원이 입력을 얼마나 키우는지가 결과의 쓸모를 정한다. 도시 i가 순서 p에 오는지를 변수 하나로 두는 흔한 부호화만 해도 n개 도시의 TSP는 변수 n²개의 SAT이 된다. 이때 변수 N개 SAT의 2^o(N) 알고리즘은 원래 크기로 2^o(n²)이어서, 2ⁿ에 다항식을 곱한 Held-Karp보다 낫다는 보장이 없다(예시 계산).

사례: OpenAI는 2026-10-26 고정 폭 k-CNF의 만족 할당을 부분지수 시간에 세는(따라서 만족 여부도 판정하는) 알고리즘으로 지수 시간 가설(ETH)을 반증한다는 원고와 Lean 형식화를 공개했고, Anthropic도 3-SAT에 대한 같은 방향의 결과를 형식화해 공개했다([[AI-Assisted-Mathematical-Research#사례: ETH 반증 주장과 Lean 형식화|ETH 반증 주장과 검토 상태]]). Lance Fortnow는 2026-10-28 이 결과가 k-SAT에 적용될 뿐 NP 문제 일반에는 적용되지 않으며, 최선 알고리즘이 대략 2^(n/2)와 2ⁿ 시간인 Subset Sum과 TSP에는 새로 주는 것이 없다고 적었다. 그 문제들을 3SAT으로 옮기는 환원이 변수 수를 너무 키우기 때문이다. NP 전체에 부분지수 알고리즘을 얻으려면 3SAT을 2^(n^o(1)) 시간에 풀어야 하는데 이번 결과는 그 근처에도 가지 않는다고 했고, ETH와 SETH가 틀렸다고 그것을 가정해 얻은 결론까지 거짓이 되지는 않는다고도 짚었다. Fortnow 자신은 증명을 직접 검증하지 않았다고 밝혔다.

적용: 한 문제의 개선이 다른 문제로 옮겨 가는지는 환원 뒤의 입력 크기로 따진다. AI가 낸 알고리즘 개선 주장을 읽을 때도 대상 문제, 계산 모델과 환원의 비용을 함께 확인한다.

## P ≠ NP가 증명돼도 암호의 안전은 보장되지 않는다

P ≠ NP는 최악의 경우에 관한 진술이다. 어떤 다항 시간 알고리즘도 모든 인스턴스를 풀지는 못한다는 뜻일 뿐, 대부분의 인스턴스가 어렵다는 뜻은 아니다. 암호는 키를 만들 때마다 무작위로 고른 인스턴스가 거의 다 어려워야 하므로 더 강한 가정이 필요하다. Aaronson의 서베이는 풀기 어려운 메시지가 존재한다는 이유로 암호 시스템을 광고하는 것은 우스운 일이라고 표현한다.

| 가정 | 얻는 것 | 앞 단계와의 관계 |
|---|---|---|
| P ≠ NP | 모든 입력을 빠르게 푸는 알고리즘은 없다 | 출발점 |
| NP가 평균적으로 어렵다(효율적으로 표본을 뽑을 수 있는 분포 기준) | 어려운 인스턴스를 효율적으로 뽑을 수 있다 | P ≠ NP에서 따라 나오는지가 오래된 미해결 문제다 |
| 일방향 함수가 있다 | 의사난수 생성기와 의사난수 함수 등 비밀키 암호 재료 대부분 | 더 강하다. 어려운 인스턴스를 비밀 답과 함께 만들 수 있어야 한다 |
| 공개키 암호(trapdoor 일방향 함수 등) | 미리 나눈 비밀 없이 공개 채널로 비밀 합의 | 현재는 인수분해, 이산 로그, 격자의 짧은 벡터처럼 알려진 NP-완전 문제보다 구조가 많은 특정 문제의 어려움을 따로 가정한다 |

이산 로그 같은 NP-중간 문제에는 최악과 평균의 어려움이 같다는 성질이 알려져 있지만, NP-완전 문제에서 이를 보인 결과는 없다. 무작위 인스턴스를 다른 문제로 환원하면 대개 무작위가 아닌 특수한 인스턴스가 되기 때문에, 분포를 붙인 문제 사이의 환원도 거의 알려져 있지 않다(Aaronson 2016, 5.3절 기준).

반대로 P = NP이고 그 알고리즘이 실제로도 빠르다면, 복호화 키를 찾는 일이 NP 탐색 문제인 지금의 인터넷 암호는 거의 다 깨진다. 일회용 패드와 양자 키 분배처럼 계산 가정에 기대지 않는 방식은 예외다. 다만 P = NP의 증명이 n^1000처럼 실제로는 쓸 수 없는 알고리즘일 수 있다는 단서도 같은 서베이가 다룬다. 공개키 암호의 구성은 [[Public-Key-Cryptography|공개키 암호]]에 있다.

### Impagliazzo의 다섯 세계

Impagliazzo(1995)는 평균 사례 난이도와 암호의 관계를 다섯 가지 가능한 세계로 나눴다. 형식적 정의가 아니라 가능성을 비교하는 틀이다.

| 세계 | 조건 | 결과 |
|---|---|---|
| Algorithmica | P = NP 또는 그에 준하는 경우(예: NP ⊆ BPP) | 빠르게 확인할 수 있는 답은 빠르게 찾을 수도 있다 |
| Heuristica | 최악의 경우는 어렵지만, 효율적으로 표본을 뽑을 수 있는 모든 분포에서 평균적으로 쉽다 | 어려운 인스턴스가 있어도 그것을 찾는 일 자체가 어렵다 |
| Pessiland | 평균적으로 어려운 문제는 있지만 일방향 함수는 없다 | 저자가 가장 나쁜 세계로 꼽는다. 문제는 어렵고 암호는 만들 수 없다 |
| Minicrypt | 일방향 함수는 있지만 공개키 암호는 불가능하다 | 비밀키 암호까지 가능하다 |
| Cryptomania | 공개키 암호가 가능하다 | 저자는 RSA가 안전하다고 알려진 한 현실에 가장 가까운 세계로 본다 |

Fortnow(2020)는 이 틀에서 NP 문제를 평균적으로 푸는 세계(Algorithmica, Heuristica)와 암호가 있는 세계(Minicrypt, Cryptomania)는 함께 성립하지 않는다고 요약한다.

## 최악이 어려워도 눈앞의 인스턴스는 풀린다

NP-hard라는 판정은 P ≠ NP일 때 모든 입력을 다항 시간에 푸는 알고리즘이 없다는 뜻이다. 실제로 만나는 인스턴스를 풀 수 없다는 뜻은 아니다. 한국 술집 81,998곳을 도는 도보 TSP는 후보 tour의 수가 2 뒤에 0이 367,308개 붙는 규모인데도, 2024-12부터 2025-03 사이의 계산으로 휴리스틱이 찾은 tour와 그보다 짧은 tour가 없다는 하한 증명을 함께 내놓아 최적으로 풀렸다. 방법과 비용은 [[Bitmask-DP-and-TSP#대안|비트마스크 DP와 TSP의 대안]]에 있다.

Fortnow는 2020-12 블로그에서 머신러닝과 최적화의 발전으로 어려운 NP 문제를 실제로 풀면서도 암호는 유지되는 세계를 Optiland라고 부르고 우리가 그쪽으로 가고 있다고 썼다. 2022 CACM 글에서도 P = NP의 이득을 모두 얻으면서 암호를 잃지 않는 Optiland로 가고 있다고 주장했다고 2026-11-04 글에서 돌아본다. 형식적 결과가 아니라 사실상의 흐름에 대한 관찰이고, 앞의 다섯 세계가 시사하는 상충과 맞지 않는다는 점도 스스로 밝힌다. 2026-11-04 글은 P = NP라면 어떤 정리든 짧은 증명을 효율적으로 찾을 수 있다는 점을 들고, 컴퓨터가 만든 Navier–Stokes 형식 증명(OpenAI 저장소)처럼 AI가 증명의 세부를 채우는 데서 증명 자체를 찾는 데로 넘어간 흐름을 제목대로 Optiland로 가는 또 한 걸음으로 본다. 같은 글에서 AI가 다음에 무엇을 증명할지 예측하기는 포기했다면서도, P 대 NP에는 AI가 혼자 떠올리지 못할 새 기법이 필요하다고 여전히 믿는다고 적었다.

적용: 배송 경로, 시간표, 배치 같은 NP-hard 최적화를 만나면 이론적 난이도만으로 포기하지 않는다. 휴리스틱으로 좋은 해를 얻고, 완화 문제로 하한을 구해 둘의 차이를 함께 보고한다. 차이가 0이면 그 해가 최적이라는 증명이 된다([[Linear-Programming#정수 조건이 붙으면|LP 완화의 하한]], [[Constraint-Based-Resource-Placement|제약 기반 자원 배치]]). 운영 제안이다.

## P ≠ NP의 증명이 어려운 이유와 전문가의 예상

P ≠ NP를 보이려면 지금까지 나온 알고리즘이 아니라 존재할 수 있는 모든 알고리즘을 배제해야 한다. 상대화, 대수화와 자연 증명(natural proofs) 장벽은 특정 부류의 기존 기법으로는 P ≠ NP를 증명할 수 없음을 보인 결과다. Aaronson은 그 부류를 이미 넘어선 결과들이 있으므로 이 장벽이 수학의 기초가 아니라 현재 기법의 빈틈을 가리킨다고 정리한다.

William Gasarch가 2018년에 진행한 세 번째 설문(2019 SIGACT News 게재)에서 응답자 124명 가운데 109명(88%)이 P ≠ NP, 15명(12%)이 P = NP라고 답했다. P ≠ NP 응답은 2002년 설문의 61%, 2012년 설문의 83%보다 늘었다. 요청에 응한 사람들의 답이라 무작위 표본이 아니며, 의견의 분포이지 증거는 아니다.

## AI 시대의 확인 비용

찾는 비용이 내려가면 병목은 확인과 질문 설정으로 옮겨 간다. AI가 1주 만에 찾은 암호 분석 개선을 연구자 두 명이 확신하는 데 한 달 가까이 걸린 사례는 [[AI-Research-Innovation-Evaluation#연구 에이전트의 산출물은 주장 단위로 검증한다|연구 에이전트 산출물의 검증]]에 있다. 기계 검사를 통과한 증명도 형식 진술이 원래 질문과 같은지는 사람이 확인한다([[AI-Assisted-Mathematical-Research#Lean이 확인하는 것과 확인하지 않는 것|Lean이 확인하는 것과 확인하지 않는 것]]).

## 확인할 질문

1. NP의 정의는 무엇을 빠르게 하라고 요구하고 무엇은 요구하지 않는가?
2. 3SAT의 부분지수 알고리즘이 TSP의 최선 알고리즘을 바로 개선하지 못하는 이유는 무엇인가?
3. P ≠ NP가 증명되어도 RSA의 안전이 보장되지 않는 이유를 평균 사례 난이도와 일방향 함수로 설명할 수 있는가?
4. NP-hard 최적화의 실제 인스턴스에서 최적이라고 말하려면 해와 함께 무엇을 제시해야 하는가?

## 출처

- [Clay Mathematics Institute, P vs NP](https://www.claymath.org/millennium/p-vs-np/) — 2026-11-24 문제 설명과 Cook, Levin의 1971년 독립 정식화 확인
- [P =? NP — Scott Aaronson](https://www.scottaaronson.com/papers/pvsnp.pdf) — 2016 서베이. 2026-11-24 1.1절(암호와 Gödel의 편지), 1.2.1절(점근 반론), 2.1절의 Cook–Levin 정리, 장벽 개요, 5.3절(평균 사례 복잡도, 일방향 함수와 공개키 암호의 추가 가정) 대조
- [A Personal View of Average-Case Complexity — IEEE, Russell Impagliazzo](https://ieeexplore.ieee.org/document/514853) — 1995. 2026-11-24 강의용으로 공개된 사본에서 다섯 세계의 정의 대조
- [Optiland — Computational Complexity, Lance Fortnow](https://blog.computationalcomplexity.org/2020/12/optiland.html) — 2020-12-16. 2026-11-24 정의, 다섯 세계와의 상충과 단서 확인
- [The Exponential Time Refutation — Computational Complexity, Lance Fortnow](https://blog.computationalcomplexity.org/2026/10/the-exponential-time-refutation.html) — 2026-10-28. 2026-11-24 적용 범위, 환원의 변수 증가와 직접 검증하지 않았다는 표시 확인
- [Another Step Towards Optiland — Computational Complexity, Lance Fortnow](https://blog.computationalcomplexity.org/2026/11/another-step-towards-optiland.html) — 2026-11-04. 2026-11-24 2022 CACM 글의 Optiland 주장, 예측 포기와 새 기법이 필요하다는 발언 확인
- [The stochastic parrots have apparently proved the Riemann Hypothesis — Shtetl-Optimized, Scott Aaronson](https://scottaaronson.blog/?p=10344) — 2026-11-20. 2026-11-24 P 대 NP를 최종 보스로 꼽은 문장만 확인
- [The Third P =? NP Poll — SIGACT News Complexity Theory Column 100, William I. Gasarch](https://www.cs.umd.edu/users/gasarch/BLOGPAPERS/pollpaper3.pdf) — 2019(조사는 2018). 2026-11-24 응답 수, 연도별 분포와 조사 방식 확인
- [korea81998 — University of Waterloo, William Cook 외](https://www.math.uwaterloo.ca/tsp/korea/) — 2026-11-24 인스턴스 규모, 후보 tour 수와 계산 기간 확인
- [리만 가설을 푼 AI가 P 대 NP까지 풀면 생기는 일 — YouTube, 데이너스: 기업 AX 교육 전문](https://www.youtube.com/watch?v=JZKMtoTAEc8) — 2026-11-24 업로드 공개, 2026-11-24 음성 인식 전사 전체 확인. 찾기와 확인의 비대칭, 세 갈래 미래의 틀과 학습 계기. 연구 주장과 수치는 위 1차 출처로 따로 대조했고, 리만 가설 형식 증명의 줄 수와 소요 기간, 예측 시장의 확률은 옮기지 않았다

## 관련 문서

- [[Algorithm-Complexity|시간복잡도와 Big O, P-NP]]
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]
- [[Computability-and-Turing-Machine|계산 가능성과 튜링 기계]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[AI-Assisted-Mathematical-Research|AI 보조 수학 연구]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
