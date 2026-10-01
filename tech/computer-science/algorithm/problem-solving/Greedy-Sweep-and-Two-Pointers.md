---
tags: [cs, algorithm, greedy, line-sweep, two-pointers, sliding-window]
status: done
category: "CS - 알고리즘"
aliases: ["Greedy Sweep and Two Pointers", "그리디 라인스위핑 투포인터"]
verified_at: 2026-09-30
---

# Greedy, line sweep와 two pointers

세 기법은 모두 불필요한 후보를 되돌아보지 않는다는 공통점이 있지만 근거가 다르다. greedy는 선택의 최적성을 증명하고, line sweep는 event 순서로 공간을 압축하며, two pointers는 pointer 이동의 단조성을 이용한다.

## Greedy 선택을 증명하기

매 단계의 국소 최선이 전역 최선이 되는지는 코드가 아니라 증명으로 결정한다.

- exchange argument: 어떤 최적해의 첫 선택을 greedy 선택으로 바꿔도 나빠지지 않음을 보인다.
- stays ahead: 매 단계까지 greedy 해가 다른 해보다 뒤처지지 않음을 보인다.
- cut property: 현재 경계를 건너는 안전한 선택을 추가해도 최적해가 존재함을 보인다.
- optimal substructure만으로는 부족하다. DP에도 같은 성질이 있으므로 greedy-choice property가 따로 필요하다.

Interval scheduling에서 종료 시간이 가장 이른 호환 구간을 고르면, 임의 최적해의 첫 구간을 이 구간으로 바꿔도 이후 사용할 수 있는 시간이 줄지 않는다. 반대로 시작 시간이 빠르거나 길이가 짧다는 기준은 쉽게 반례가 생긴다.

### 대표 예제와 틀린 greedy

greedy는 관찰로 탐색 범위를 줄이는 알고리즘이라고도 볼 수 있다. 정렬된 두 리스트를 합칠 때 전체가 아니라 두 리스트의 맨 앞만 비교하면 되는 것도 같은 관찰이다.

- **동전 개수 최소화**: 큰 동전부터 최대한 쓰는 greedy는 동전 단위가 서로 배수 관계일 때 성립한다. 그러면 작은 단위로 큰 단위 이상을 채우는 조합이 최적일 수 없다는 것을 귀류법으로 보일 수 있다. 배수 관계가 없으면 깨질 수 있다. 1, 3, 4원으로 6원을 만들 때 greedy는 4 + 1 + 1(3개)이지만 3 + 3(2개)이 최소다. 이 경우는 DP다. 다만 배수 관계는 충분조건일 뿐이라, 10이 25를 나누지 않는 1, 5, 10, 25처럼 모든 금액에서 greedy가 최적인 체계(canonical)도 있다. 1원 단위가 있는 체계에서 반례가 있다면 가장 작은 반례는 가장 큰 두 단위의 합보다 작으므로, 처음 보는 체계는 그 금액 미만까지 greedy와 DP 결과를 비교해 판정한다.
- **회의실 배정(interval scheduling)**: 위의 끝나는 시간 기준을 구현할 때는 매번 남은 회의를 훑지 말고 끝나는 시간 순, 같으면 시작 시간 순으로 정렬한 뒤 앞에서부터 넣을 수 있는 회의를 넣는다. 시작과 끝이 같은 회의가 있으면 두 번째 정렬 기준이 결과를 바꾼다.
- **여러 로프로 들 수 있는 최대 중량**: k개를 쓰면 가장 약한 로프가 한계이므로 강한 순으로 정렬해 `k × (k번째 로프)`의 최댓값을 본다.
- **곱의 합 최소화**: 한 배열은 오름차순, 다른 배열은 내림차순으로 짝지으면 곱의 합이 최소다(재배열 부등식).
- **양수 배열의 연속 구간 곱 최대**: 누적 곱이 현재 값보다 작아지면(1보다 작아지면) 버리고 현재 값부터 새로 시작한다. 여러 예제에서 세운 명제를 코드로 옮긴 형태이며 Kadane의 곱 변형이다. 0이나 음수가 섞이면 최소 곱도 함께 들고 다녀야 한다([[Algorithm-DP#최대 연속 부분합|최대 연속 부분합]]).
- **같은 문제, 다른 목표**: 성냥개비를 모두 써서 만드는 가장 큰 수는 자릿수가 많을수록 크다는 자명한 명제 덕분에 greedy(1을 최대한, 홀수면 맨 앞 7)지만, 가장 작은 수에는 그런 명제가 없어 DP로 푼다([[Algorithm-DP-Patterns#답이 정수 범위를 넘는 DP|DP 응용 패턴]]).
- **미래 요청을 아는 교체(optimal offline caching)**: 구멍이 N개인 멀티탭에 전기용품 사용 순서 전체가 주어지고 플러그를 뽑는 횟수를 최소화한다면, 이미 꽂힌 기기는 그대로 두고 빈 구멍이 있으면 꽂는다. 가득 찼으면 꽂힌 기기 중 다음 사용이 가장 먼 기기(다시 쓰이지 않는 기기가 있으면 그것)를 뽑는다. 이 farthest-in-future 규칙은 최적이며, 몇 번째 요청까지 이 규칙과 똑같이 교체하는 최적해가 있다는 명제를 한 요청씩 늘려 가는 exchange argument로 증명된다. 운영체제 page 교체는 미래 참조를 모르는 online 문제라 이 규칙을 구현할 수 없어 [[Virtual-Memory-Paging#Optimum|Optimum]]을 비교 기준으로만 쓰지만, 요청 순서 전체가 입력인 offline 문제에서는 그대로 구현된다. LRU, FIFO, LFU처럼 과거만 보는 규칙은 최소 횟수를 보장하지 않는다. 꽂힘 여부는 기기 번호로 index한 배열로 O(1)에 확인하고, 교체할 때만 꽂힌 기기마다 뒤쪽 순서를 훑어 다음 사용 위치(없으면 INF)를 구한다. 사용 횟수가 K면 O(N K²)이라 K가 수백 이하일 때 충분하다.

그럴듯하지만 틀린 greedy도 많다.

- 0/1 knapsack에서 무게당 가치가 높은 순으로 담기: 용량 10에 (무게 6, 가치 7), (무게 5, 가치 5), (무게 5, 가치 4)가 있으면 greedy는 첫 물건만 담아 7이지만, 뒤의 두 물건을 담으면 9다. 물건을 쪼갤 수 있는 fractional knapsack에서만 성립하고, 0/1은 [[Algorithm-DP|동적 프로그래밍]]으로 푼다.
- 가장 긴 빈 구간의 중점에 시설을 하나씩 추가하기: 길이 1000에 두 개를 추가하면 greedy는 500, 250에 두지만 333, 666이 최대 간격을 더 줄인다. 답의 크기를 정해 두고 가능한지 판정하는 [[Binary-Search-and-LIS|매개변수 탐색]]으로 푼다.

코딩 테스트에서는 greedy를 못 떠올리는 것보다 greedy가 아닌 문제를 greedy로 착각하는 쪽이 더 위험하다. 같은 유형을 풀어 봐서 확신할 때만 바로 구현하고, 제출이 틀리면 풀이가 틀렸을 가능성이 크므로 오래 붙잡지 말고 다른 문제로 넘어간다. 확신이 없으면 작은 입력에서 완전탐색 결과와 대조해 반례를 먼저 찾는다.

시험 중에는 증명이 어려우므로 순서와 절차로 위험을 줄인다. 완전탐색이 되는지(경우의 수), DP가 되는지(상태 수와 메모리)를 먼저 보고 greedy는 마지막에 검토한다. greedy는 이 상태에서는 이것을 고르는 것이 최선이라는 명제를 세워 예제 입력에 손으로 적용해 기대 출력이 나오는지 본 뒤 구현하고, 틀리면 그 명제에 매달리지 않고 다른 명제로 바꾼다. 문제를 그림으로 그리면 명제와 반례가 빨리 나온다.

## 정렬과 Priority Queue

greedy는 흔히 정렬, priority queue 또는 둘의 조합으로 구현되므로 이 둘을 먼저 시도한다. 정렬 기준이 여러 개 떠오르면 후보를 나열하고(구간이면 시작, 끝, 길이와 각각의 방향) 작은 반례를 직접 만들어 탈락시킨다. 회의실 배정에서는 시작 기준과 길이 기준이 반례로 떨어지고 끝 기준이 남는다(위 interval scheduling). C++ pair는 first부터 비교하므로 끝 기준 정렬은 (끝, 시작) 순서로 담는다.

deadline과 reward 문제는 event를 deadline 순으로 훑으며 지금까지 선택한 reward를 min heap에 넣는 형태가 자주 나온다. 용량을 넘으면 가장 작은 reward를 버린다. 정렬 기준, heap에 넣는 값과 언제 제거하는지가 greedy invariant를 이룬다. 한 작업에 하루가 걸린다면 deadline 오름차순으로 보는 동안 heap에 든 작업은 모두 현재 deadline 안에 끝낼 수 있는 후보라, 어느 날에 둘지 정하는 배치 로직 없이 heap 크기가 현재 deadline 이하인지만 지키면 된다. 정렬 없이 deadline이 넉넉한 작업부터 날을 정하면 뒤에 오는 급한 작업의 자리를 빼앗을 수 있다. 합을 키우려면 큰 값을 더 담거나 작은 값을 빼야 하는데, 이 형태는 넘칠 때마다 가장 작은 값을 빼는 쪽이다.

가방마다 담을 수 있는 물건 중 가치가 가장 큰 것을 고르는 문제도 가방과 물건을 무게 순으로 정렬한 뒤 현재 가방에 들어오는 후보만 max heap에 추가할 수 있다. 매번 전체 후보를 다시 훑지 않는다. 가방을 용량 오름차순으로 보는 이유는 작은 가방에 들어가는 물건이 더 큰 가방에도 들어가 heap에 남은 후보가 다음 가방에서도 유효하기 때문이다. 그래서 물건 pointer가 뒤로 가지 않고 이전 가방을 다시 볼 필요가 없으며, 선택지가 적은 작은 가방부터 그 안에서 가장 비싼 물건을 확정한다. 그럴듯한 다른 명제에는 반례가 있다. 큰 가방부터 들어가는 가장 비싼 물건을 담으면 용량 1, 10인 가방과 (무게 1, 가치 100), (무게 10, 가치 50)에서 큰 가방이 무게 1짜리를 가져가 100에 그치지만 150이 가능하다. 가방과 물건을 모두 무게 오름차순으로 차례로 짝지으면 용량 5인 가방 하나와 (1, 1), (5, 100)에서 1에 그친다.

여러 창구에 손님을 줄 선 순서대로 배정하는 시뮬레이션도 heap으로 줄인다. 손님 N명이 계산대 K개에 차례로 들어가고 손님마다 처리 시간이 다를 때, 시간을 1씩 흘리며 매 단위 모든 계산대를 확인하면 (마지막 완료 시각) × K다. 최댓값끼리 곱하면(N = 10만, 처리 시간 20 이하라 시각 상한 200만, K = 10만) 2천억으로 어림되지만, 계산대가 많을수록 마지막 완료 시각이 짧아지므로 실제 비용은 대략 (처리 시간 합) + K × (최대 처리 시간)이라 이 범위에서는 수백만 이하다. 동시에 일어날 수 없는 두 극단을 곱한 어림은 과대평가일 수 있다. 다만 처리 시간이 10억까지 커질 수 있으면 시간 단위 진행은 불가능하므로 처리 시간과 무관한 event 단위 진행이 안전하다. 필요한 값은 계산대마다 쌓인 누적 완료 시각뿐이므로 (완료 시각, 계산대 번호, 손님 번호)를 min heap에 둔다. 처음에 계산대 수만큼(손님이 더 적으면 전부) 넣고, 다음 손님마다 가장 먼저 비는 계산대를 꺼내 퇴장 기록을 남긴 뒤 (그 완료 시각 + 새 손님의 처리 시간, 같은 계산대, 새 손님)을 넣는다. 비는 계산대가 여럿이면 번호가 작은 곳에 들어간다는 규칙은 heap 비교의 두 번째 기준이 되고, 같은 시각에 끝나면 번호가 큰 계산대부터 나간다는 규칙은 모은 퇴장 기록을 (완료 시각 오름차순, 계산대 번호 내림차순)으로 정렬해 반영한다. 입장과 퇴장의 동률 방향이 반대일 수 있으므로 지문의 동률 규칙을 하나씩 key로 옮긴다. heap 연산은 손님마다 O(log K), 마지막 정렬은 O(N log N)이다. 시간을 단위마다 흘리지 않고 다음 event 시각으로 건너뛰는 event-driven simulation이고, 계산대가 하나면 아래 한 자원의 순차 처리와 같다. [[Algorithm-Practice#백엔드에서의 연결|지연 작업 queue]]도 같은 구조다.

## Line sweep

좌표 전체를 배열로 만들지 않고 시작점, 끝점과 교차 같은 event만 정렬해 왼쪽에서 오른쪽으로 처리한다.

구간 합집합 길이는 구간을 시작점 순으로 정렬하고 현재 `[left, right]`를 유지한다.

- 다음 시작점이 `right` 이하면 `right`를 더 큰 끝점으로 확장한다.
- 분리되어 있으면 기존 길이를 답에 더하고 새 구간을 시작한다.

같은 좌표의 start/end event 순서는 문제의 구간 정의에 따라 달라진다. 닫힌 구간인지 half-open 구간인지 정하고 tie-break를 그 의미에 맞춘다. 좌표 차와 총 길이는 넓은 정수 type을 쓴다.

좌표가 10억 단위면 칸마다 표시하는 배열은 만들 수 없으므로, 정렬한 뒤 한 방향으로만 커지는 경계 값 하나를 들고 구간을 한 번씩 처리하는 변형이 기본이 된다. 정렬을 포함해 O(N log N)이다.

- **한 자원의 순차 처리**: (도착 시각, 처리 시간)을 도착 순으로 정렬하고 현재 시각을 `t = max(t, 도착) + 처리 시간`으로 갱신한다. 앞 작업이 안 끝났으면 기다리고, 비어 있으면 도착 시각으로 건너뛴다. 마지막 t가 전체 완료 시각이다.
- **고정 길이 L로 덮기**: 덮을 구간을 시작 순으로 정렬하고 이미 덮인 끝 idx를 들고 간다. 구간이 idx까지 이미 덮였으면 건너뛰고, 아니면 `start = max(idx, 시작)`에서 `need = (끝 - start + L - 1) / L`개를 놓고 `idx = start + need × L`로 옮긴다. 마지막 판이 다음 구간 일부까지 덮으므로 idx를 다음 구간으로 넘기는 것이 핵심이다. 위 식은 끝을 포함하지 않는 [시작, 끝) 구간 기준이고, 끝을 포함하면 덮을 길이에 1을 더한다.

## Two pointers

두 pointer가 각자 한 방향으로만 움직이고, 한 pointer를 움직였을 때 조건 변화가 단조로우면 중첩 loop처럼 보여도 총 이동은 O(n)이다.

### 정렬된 배열의 두 수 합

합이 target보다 작으면 left를 오른쪽으로, 크면 right를 왼쪽으로 옮긴다. 정렬로 인해 그 반대쪽 후보들을 한꺼번에 버려도 안전하다. 원래 index가 필요하면 값과 index를 함께 정렬한다. 이중 loop로 모든 쌍을 보면 n = 10만에서 약 50억 쌍이지만, 정렬 O(n log n) 뒤 pointer 이동은 O(n)이다.

합이 target과 같을 때도 pointer를 옮겨야 한다. 개수만 세고 아무것도 움직이지 않으면 같은 쌍을 계속 보는 무한 loop가 된다. 값이 모두 다르면 a[l]과 짝이 되는 값은 a[r] 하나뿐이고 a[r]도 마찬가지라, 한쪽만 옮기든 둘 다 옮기든 다른 쌍을 놓치지 않는다. 중복 값을 허용하면 같은 값 묶음의 크기 cl, cr를 곱해 더하고 두 묶음을 모두 건너뛴다. a[l] == a[r]이면 사이의 r - l + 1개가 모두 같은 값이므로 그중 두 개를 고르는 C(r - l + 1, 2)를 더하고 끝낸다. 한 분기에서 개수 증가와 pointer 이동 두 문장을 실행하면 중괄호로 묶는다. 중괄호 없이 이어 쓰면 두 번째 문장은 조건과 무관하게 실행된다.

### Sliding window

연속 구간을 유지하며 right를 확장하고 조건을 위반하는 동안 left를 줄인다. 모든 값이 non-negative일 때 합의 증감이 단조로운 유형이 대표적이다. 음수가 섞이면 합이 pointer 이동에 따라 단조롭지 않아 같은 로직이 깨질 수 있다.

중복 없는 subarray 개수는 window 안 빈도를 유지하고, 새 원소가 중복인 동안 left를 이동한 뒤 현재 right에서 끝나는 유효 구간 수를 더한다.

### 중첩 loop에서 two pointers로

이중 loop는 `i`가 바뀔 때마다 `j`를 처음부터 다시 훑어, 앞선 `i`에서 얻은 정보를 버린다. two pointers는 그 정보를 pointer 위치로 남겨 재사용한다. 정렬된 배열에서 차이가 M 이상인 두 수 중 차이의 최솟값을 찾는 문제로 보면 다음 두 관찰이 전환의 근거다.

1. `st`가 커질수록 `a[en] - a[st] >= M`을 처음 만족하는 `en`도 커진다(뒤로 가지 않는다).
2. 그 `en`을 찾으면 더 뒤의 `en`은 차이만 커지므로 볼 필요가 없다.

그래서 `st`마다 조건을 만족할 때까지 `en`을 앞으로만 옮기고, 답을 갱신한 뒤 `st`를 한 칸 옮긴다. 매 비교마다 둘 중 하나가 전진하고 각자 최대 n번 움직이므로 정렬 뒤 O(n)이다.

```cpp
int en = 0;
long long best = LLONG_MAX;
for (int st = 0; st < n; st++) {
  while (en < n && a[en] - a[st] < m) en++;
  if (en == n) break;  // 이후 st에서도 조건을 만족하는 en이 없다
  best = min(best, a[en] - a[st]);
}
```

- 가장 흔한 실수는 `en`이 n이 된 뒤에도 `a[en]`을 읽는 것이다. `while` 조건에 `en < n`을 먼저 두고, 빠져나온 뒤에도 n인지 확인한다.
- 배열 끝에 답에 영향을 주지 않는 아주 큰 값(sentinel)을 넣어 경계 검사를 없애는 방법도 있지만, 그 값이 정말 답을 바꾸지 않는지와 자료형 범위(예: `long long` 필요)를 꼼꼼히 확인해야 한다.
- 합이 S 이상인 가장 짧은 연속 구간은 같은 틀에서 구간 합 `tot`를 들고 다닌다. `en`을 늘릴 때 더하고 `st`를 늘릴 때 빼며, 조건을 만족할 때 길이 `en - st + 1`로 답을 갱신한다(위 sliding window, 모든 값이 양수일 때).
- 이런 문제는 대개 이분탐색으로도 풀린다(정렬 뒤 `a[st] + M`의 `lower_bound`, 누적합 위의 이분탐색). two pointers는 O(n), 이분탐색은 O(n log n)이라 보통 둘 다 통과하므로 편한 쪽을 쓰되, two pointers로만 풀리는 문제도 있다.
- 두 pointer가 같은 방향으로 움직이는 형태 말고도, 양 끝에서 마주 보며 움직이거나(위 두 수 합) 서로 다른 배열 위를 움직이는 형태(정렬된 두 리스트 합치기)가 있다.

## 구분 체크리스트

| 질문 | 판단 |
|---|---|
| 현재 선택을 최적해로 교환해도 안전한가? | greedy 증명 |
| 값 전체가 아니라 event 좌표만 중요한가? | line sweep |
| pointer가 뒤로 돌아갈 필요가 없음을 보일 수 있는가? | two pointers |
| 합이나 조건이 음수/삭제 때문에 비단조가 되는가? | 다른 기법 검토 |
| 정렬로 원래 순서 정보가 사라져도 되는가? | index 보존 여부 결정 |
| 요청 순서 전체를 미리 알고 교체 횟수를 줄이는가? | 다음 사용이 가장 먼 항목을 내보내는 greedy |

## 출처

- [바킹독의 실전 알고리즘 0x11강, 그리디 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=De0Qg-2O80c)
- [바킹독의 실전 알고리즘 0x14강, 투 포인터 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=I_0aAKzu0m8)
- 인프런, 큰돌 강사, [5주차 개념 #1. 그리디의 기초](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238520), [5주차 개념 #2. 그리디의 조건과 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238528), [5주차 개념 #3. 큰돌은 욕심많은 도서관 사서야!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100312), [5주차 개념 #4. 골동품 수집가 큰돌은 욕심쟁이야!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238404), [5주차 개념 #5. 큰돌 교수님의 과제는 너무 어려워!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242051)
- 인프런, 큰돌 강사, [5주차 개념 #6. 라인스위핑](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242050), [5주차 개념 #7. 투포인터](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242052), [5-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100396), [5-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100398), [5-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100399)
- 인프런, 큰돌 강사, [5-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100400), [5-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100401), [5-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100402), [5-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100403), [5-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100404)
- 인프런, 큰돌 강사, [5-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100405), [5-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100412), [5-Z](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100421), [6-F 그리디를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152628), [6-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100958)
- 인프런, 큰돌 강사, [7-Y 최대값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100988), [8-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101073)

- [Princeton Algorithms, minimum spanning trees](https://algs4.cs.princeton.edu/lectures/keynote/43MinimumSpanningTrees-2x2.pdf)
- [Princeton Algorithms, geometric search](https://algs4.cs.princeton.edu/lectures/keynote/99GeometricSearch-2x2.pdf)
- [Princeton Algorithm Design, greedy algorithms I (optimal offline caching)](https://www.cs.princeton.edu/~wayne/kleinberg-tardos/pdf/04GreedyAlgorithmsI.pdf)
- [Optimal Bounds for the Change-Making Problem — Cornell University Computer Science](https://www.cs.cornell.edu/~kozen/Papers/change.pdf)

## 관련 문서

- [[Graph-Optimization-Algorithms|Greedy와 최소 신장 트리]]
- [[Prefix-Sum-and-Range-Queries|누적합과 sliding window]]
- [[Algorithm-Sorting|정렬]]
- [[Heap|Priority queue]]
- [[Simulation-Implementation|시뮬레이션과 구현]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
