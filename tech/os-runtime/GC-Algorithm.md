---
tags: [runtime, gc, v8]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["GC Algorithm", "GC 알고리즘", "Orinoco"]
---

# GC 알고리즘

V8의 가비지 컬렉터는 2016년의 **Orinoco 프로젝트** 이후 "메인 스레드를 거의 멈추지 않는" 방향으로 발전해왔다. 초기 V8의 GC는 수십 밀리초 단위로 메인 스레드를 정지시켰지만, 현재는 대부분의 작업이 수 밀리초 이내에 끝나며 60FPS 애니메이션을 유지할 수 있는 수준이 되었다. 이 문서는 V8 구현을 중심으로 현대 GC의 핵심 알고리즘과 기법들을 정리한다.

V8의 힙 구조와 Generational GC의 전체 흐름은 [[Call-Stack-Heap|콜 스택 과 힙]]에 있고, 여기서는 **알고리즘 이론과 동시성 기법**에 집중한다.

## 세대 가설 (Generational Hypothesis)

"대부분의 객체는 할당 직후 금방 죽는다"는 경험칙이다. 수십 년간의 힙 프로파일링에서 관찰된 가장 안정적인 패턴이고, 이 가설 위에서 Young/Old generation을 분리하는 모든 Generational GC가 정당화된다.

- Young Gen에서 자주 빠르게 돌려 대부분의 쓰레기를 회수
- Young Gen에서 여러 번 살아남은 소수만 Old Gen으로 승격(promotion)
- Old Gen은 덜 자주 돌리되 전체 힙을 훑기 때문에 더 정교한 알고리즘이 필요

## Tri-color Marking

Mark 단계에서 "어떤 객체까지 도달했는지" 추적하기 위한 표준 알고리즘이다. 각 객체를 3가지 색으로 분류하며, 모든 객체가 회색이 아닌 상태가 되면 마킹이 끝난다.

- **White (흰색)** — 아직 방문되지 않은 객체. 마킹 종료 시점에 흰색으로 남아있으면 "도달 불가"로 간주되어 회수 대상
- **Gray (회색)** — 자신은 발견됐지만, 가리키는 자식 객체들은 아직 확인되지 않은 상태. 작업 큐(worklist)에 올라있는 상태
- **Black (검은색)** — 자신도, 가리키는 모든 자식도 방문이 완료된 상태

### 마킹 절차
1. 루트 집합(전역 객체, 스택 프레임 등)에서 출발해 해당 객체들을 회색으로 칠한다.
2. 작업 큐에서 회색 객체를 하나 꺼내 자식들을 회색으로 칠하고, 자신은 검은색으로 전이한다.
3. 큐가 빌 때까지 반복한다.
4. 종료 시점에 흰색으로 남은 객체는 모두 해제한다.

### 3색 불변성(tri-color invariant)
Concurrent/Incremental 마킹에서는 **"검은색 객체가 흰색 객체를 직접 가리키면 안 된다"** 는 불변성이 깨지지 않도록 **Write Barrier**를 사용한다. 뮤테이터(애플리케이션 코드)가 검은색 객체에 흰색 객체를 새로 연결하면, 배리어가 그 연결을 감지해 흰색 객체를 즉시 회색으로 승격시킨다. 이 덕분에 뮤테이터와 GC가 동시에 실행돼도 살아있는 객체를 실수로 회수하는 일이 없다.

## Orinoco: 지연 시간 중심의 GC 재설계

Orinoco는 단일 알고리즘이 아니라 **"메인 스레드 정지 시간을 줄이기 위한 일련의 기법 묶음"** 이다. 핵심 아이디어는 "GC 작업을 작게 쪼개거나(증분화), 다른 스레드로 밀어내거나(병렬·동시화)"다.

### Parallel GC

메인 스레드를 **정지**시킨 상태에서, 여러 GC 워커 스레드가 **동시에 병렬로** 마킹/스위핑을 수행한다.

- 장점: 정지 시간 단축 (같은 양의 일을 N배 빨리 끝냄)
- 단점: 메인 스레드는 어쨌든 정지된 상태 (Stop-the-World는 유지)
- V8은 Scavenger(Minor GC)에서 Parallel 방식을 사용

### Incremental Marking

메인 스레드가 **스스로 작업을 작은 조각으로 쪼개** 여러 번에 걸쳐 실행한다. 각 조각 사이에는 뮤테이터가 잠깐씩 실행되므로 사용자 입장에서 "긴 정지"가 아닌 "여러 번의 짧은 지연"으로 보인다.

- 장점: 한 번의 긴 정지를 없앰
- 단점: 총 작업량은 오히려 늘어남 (context switching + write barrier 비용)
- Incremental이 가능한 이유: 위의 Tri-color 불변성 + Write Barrier

### Concurrent Marking

GC 작업을 **완전히 별도 스레드**에서 메인 스레드와 **동시에** 실행한다. 메인 스레드는 뮤테이터로 계속 돌아가며, 배리어가 두 스레드 사이의 일관성을 유지한다.

- 장점: 메인 스레드 정지 시간이 루트 스캔 수준으로 줄어듦
- 단점: 구현 복잡도가 높고, write barrier 오버헤드 상시 부담
- V8은 Old Generation의 Mark 단계를 Concurrent로 수행

### Dynamic Work Stealing

여러 GC 워커 스레드가 작업을 분담할 때, 먼저 끝난 워커가 **아직 바쁜 워커의 작업 큐에서 일을 훔쳐** 도와준다.

- 고정 분할 방식의 단점(워커별 작업량 편차로 인한 대기)을 없앰
- 객체 그래프는 예측 불가능한 모양이라 작업량을 사전 분할하기 어려운데, work stealing이 이 문제를 런타임에서 해결
- 모든 워커가 거의 동시에 종료되도록 자연스럽게 수렴

## 기법 간 Trade-off 요약

각 기법은 "어디를 희생해서 어디를 얻을지"가 다르다.

| 기법 | 메인 스레드 정지 | 총 CPU 비용 | 구현 복잡도 |
|------|------------|---------|---------|
| Stop-the-World (단일 스레드) | 길게 1회 | 가장 낮음 | 낮음 |
| Parallel | 짧게 1회 | 낮음 | 중간 |
| Incremental | 아주 짧게 여러 번 | 중간 | 중간 |
| Concurrent | 거의 없음 | 높음 | 높음 |

V8은 이 기법들을 상황별로 조합한다. Young Gen(Scavenger)은 힙이 작고 회수율이 높아 Parallel STW가 효율적이고, Old Gen(Major GC)은 힙이 커 긴 정지를 감당하기 어려우므로 Concurrent Marking + Incremental Sweeping + Parallel Compaction을 조합한다.

## 성능 개선의 역사

- 초기 V8: 수십 밀리초 단위의 정지 (애니메이션 끊김 체감)
- Incremental Marking 도입: 한 번의 긴 정지를 여러 조각으로 분할
- Orinoco (Concurrent Marking + Parallel + Work Stealing): 수 밀리초 수준으로 축소, 60FPS 유지 가능
- 이후에도 Pointer Compression, Sparkplug, Maglev 등 관련 최적화가 계속 추가되고 있음

## 관련 문서
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[nodejs/V8|V8 엔진]]
- [[nodejs/WebAssembly|WebAssembly]]
- [[nodejs/OOM-Troubleshooting|Node.js OOM 트러블슈팅]]
