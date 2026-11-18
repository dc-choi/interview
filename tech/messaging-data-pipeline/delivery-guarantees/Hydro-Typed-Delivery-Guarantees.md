---
tags: [messaging, delivery-guarantees, distributed-system, rust, type-system, idempotency]
status: done
verified_at: 2026-11-18
category: "Messaging - 배달 보장"
aliases: ["Hydro", "Typed Delivery Guarantees", "전달 보장의 타입 표현", "Location-Oriented Programming"]
---

# 전달 보장을 타입으로 표현하는 분산 프로그래밍 (Hydro)

마이크로서비스를 각각 작성하고 RPC로 이어 붙이면 재전송으로 생긴 중복, 네트워크가 바꾼 순서 같은 문제가 서비스 사이의 연결 지점에서 드러나기 쉽고, 각 서비스의 컴파일러는 그 연결을 보지 못한다. Hydro는 여러 노드에 걸친 분산 시스템을 하나의 Rust 프로그램으로 쓰고, 스트림의 위치, 순서와 재전송 여부를 타입 매개변수로 들고 다니게 해서 이런 실수를 컴파일 시점에 드러내려는 프레임워크다. 이 문서는 [[Delivery-Semantics|전달 보장]]과 [[At-Least-Once|At-Least-Once]]에서 다룬 보장 수준을 언어의 타입이 어떻게 강제할 수 있는지를 Hydro를 예로 정리한다.

## 정의

- Hydro는 Rust용 고수준 분산 프로그래밍 프레임워크다. Rust가 메모리 안전을 타입으로 보장하듯 분산 안전(distributed safety)을 목표로 하며, actor나 RPC 대신 위치 지향 프로그래밍(location-oriented programming)을 쓰는 분산 데이터플로 언어라고 스스로 설명한다.
- 내부 실행은 DFIR(Dataflow Intermediate Representation)이 맡는다. DFIR은 스트림 처리용 컴파일러이자 단일 스레드 저수준 런타임이다. 프로그램은 먼저 개발자 장비에서 실행돼 배포 계획을 만들고, 그 계획이 DFIR로 컴파일돼 기계별 바이너리가 된다.
- 핵심 추상화는 live collection이다. 새 원소가 도착하면서 시간에 따라 바뀌는 컬렉션이며 Stream, Keyed Stream, Keyed Singleton, Singleton과 Optional이 있다. 모든 네트워크 입력과 출력도 live collection이다.
- 타입 시스템이 겨냥하는 성질은 최종 결정성(eventual determinism)이다. 메시지 지연, 순서와 중복이 달라져도 결국 같은 결과에 도달하는지를 타입으로 따진다.

## 동작 원리: 타입 매개변수가 보장을 들고 다닌다

Stream의 선언에 위치, 경계, 순서와 재전송이 모두 들어 있다.

```rust
pub struct Stream<Type, Loc, Bound: Boundedness = Unbounded, Order: Ordering = TotalOrder, Retry: Retries = ExactlyOnce>
```

| 매개변수 | 값 | 의미 |
|---|---|---|
| `Loc` | `Process`, `Cluster`와 이를 감싼 `Tick<L>`, `Atomic<L>` | 데이터가 지금 어느 위치에 있는가 |
| `Bound` | `Unbounded` 등 | 원소가 끝없이 들어오는가 |
| `Order` | `TotalOrder`, `NoOrder` | 원소 순서를 믿을 수 있는가 |
| `Retry` | `ExactlyOnce`, `AtLeastOnce` | 같은 원소가 여러 번 올 수 있는가 |

보장이 약해질수록 쓸 수 있는 연산이 줄어든다. 네트워크로 보낼 때는 장애 정책을 반드시 선언해야 하며, 그 정책과 송수신 위치의 형태가 `send`의 반환 타입을 정한다. Process 사이의 `TCP.fail_stop()`은 순서를 지키고 중복이 없지만, 아래처럼 순서나 재전송 보장이 약해지는 경로에서는 반환 타입도 약한 쪽으로 바뀐다. 외부 클라이언트와 통신하는 `External`은 스트림의 위치가 아니라 Hydro 데이터플로와 통신하는 외부 프로세스의 핸들이다.

### 위치

- `Process`는 단일 스레드 하나를 나타내며 현재는 각 Process가 별도의 OS 프로세스로 배포된다. `Cluster`는 같은 코드를 실행하는 여러 멤버의 묶음(SPMD)이고 멤버 수는 고정일 필요가 없으며 배포할 때 고를 수 있다.
- 여러 컬렉션을 합치는 API는 입력의 위치 타입이 같아야 한다. 타입은 같지만 서로 다른 위치를 섞는 실수는 컴파일러가 아니라 배포 시점의 런타임 검사가 잡는다. 다른 위치의 데이터를 섞으려면 `send`로 옮겨야 하고, `send`의 반환 타입은 도착한 위치를 담는다. 예를 들어 `send(&process2, TCP.fail_stop().bincode())`의 결과는 `Process<'a, L2>` 위의 Stream이다. 장애 정책 없이 `TCP.bincode()`만 쓰면 컴파일되지 않는다.
- Cluster에서 Process로 보내면 보낸 멤버 ID를 키로 하는 `KeyedStream`이 되고, `.values()`로 ID를 버리면 순서가 `NoOrder`로 바뀐다. Process에서 Cluster로는 `(MemberId, T)` 쌍을 `demux`로 나눠 보낸다.

### 순서

- `TCP.fail_stop()`은 보낸 메시지의 접두부를 순서대로 전달한다. UDP는 늘 `NoOrder`이고, 유실과 무한 지연을 허용하는 `lossy_delayed_forever()`도 순서를 `NoOrder`로 약하게 만든다.
- `map`, `filter`는 모든 스트림에서 쓸 수 있지만 `first`, `last`처럼 순서에 기대는 연산은 `TotalOrder`에서만 쓸 수 있다.
- `NoOrder` 스트림에서 `fold`, `reduce`를 쓰려면 누적 함수가 교환법칙을 만족한다는 근거를 붙여야 한다. 근거 없이는 컴파일되지 않는다. `for_each`와, 상태를 가변으로 캡처한 `map`, `filter`, `inspect` 클로저에도 같은 요구가 붙는다. 근거는 설명만 다는 `manual_proof!`나 Verus로 증명을 검사하는 매크로로 붙이며, Verus 증명은 `cargo verus verify`로 검사하고 일반 빌드에서는 지워진다.

### 재전송

- 생성된 코드를 실행하는 호스트 프로그램이 채널을 직접 구현하는 embedded 채널에서 `.may_duplicate()`로 중복 전달을 선언하면 받은 스트림은 `AtLeastOnce`가 된다. 문서에 있는 TCP와 UDP 모드에는 `AtLeastOnce`가 되는 경로가 없다.
- `count`는 `ExactlyOnce` 스트림에만 정의돼 있어 `AtLeastOnce` 스트림에서는 호출할 수 없다. 재시도가 붙은 입력으로 카운터를 올리는 코드가 컴파일 단계에서 막히는 구조다.
- `AtLeastOnce` 스트림의 `fold`, `reduce`, `for_each`와, 상태를 가변으로 캡처한 `map`, `filter` 클로저에는 멱등이라는 주석(`idempotent = manual_proof!(...)`)을 붙여야 컴파일된다. 중복이 와도 결과가 같다는 책임을 코드에 남기게 하는 장치다. 멱등성 근거는 `manual_proof!`만 받는다고 문서 표에 적혀 있어 교환법칙과 달리 기계 검사가 없다.
- 중복이 결과에 영향을 주지 않음을 개발자가 알면 `assume_retries::<ExactlyOnce>(nondet!(...))`로 보장을 명시적으로 바꿀 수 있다. 공식 예시는 고유 요청 ID 수를 센다. 재시도된 요청은 같은 ID를 가지므로 키별 `first()`로 하나만 남긴 뒤 `key_count()`로 세면 중복 전달이 결과에 영향을 줄 수 없다는 근거로 이 변환을 쓴다.

## nondet!: 비결정성의 출처를 한곳에 모으기

- 순서나 재전송 보장을 강하게 가정하는 API(`assume_ordering`, `assume_retries`), 주기 샘플링(`sample_every`), 묶음 처리(`batch`), 시간 제한(`timeout`), 멤버십이 바뀔 수 있는 `broadcast`, 순서를 보존하는 `merge_ordered`, 유실을 허용하는 `TCP.lossy(...)`, UDP `.lossy(...)`, embedded `.may_drop(...)` 같은 API는 `NonDet` 값을 인자로 받는다. 출력이 이미 `NoOrder`인 `lossy_delayed_forever()`는 guard가 필요 없다. 이 값은 `nondet!` 매크로로만 만들 수 있고, 설명 문서 주석이 없으면 컴파일되지 않는다.
- 그래서 프로그램의 모든 비결정성은 `nondet!` 호출에서 시작한다. 함수가 결정을 직접 내리지 않으면 `nondet_` 접두사 매개변수로 받아 호출자에게 넘기고, 최상위에서는 서비스 수준 보장을 근거로 해소한다.
- 한계가 있다. 클로저 안의 난수, 시계, 해시맵 순회처럼 클로저가 들여오는 비결정성은 컴파일러가 검사하지 않는다. 잘못된 `manual_proof!`는 비결정성을 조용히 되살린다. 문서는 시뮬레이터가 이런 증명을 믿지 않고 다른 순서를 계속 탐색한다고 설명한다.

## 기존 방식과의 비교

| 관점 | 서비스별 작성 후 RPC 연결 | Hydro |
|---|---|---|
| 작성 단위 | 서비스마다 별도 코드 | 여러 위치를 한 함수에서 기술 |
| 중복 대응 | 소비자 쪽 [[Idempotency-Key|멱등성 키]], 리뷰와 테스트 | `AtLeastOnce` 타입이 가능한 연산을 줄이고 멱등성 근거를 요구 |
| 순서 가정 | 브로커 설정과 문서([[MQ-Kafka-Event-Ordering|Kafka 이벤트 순서]]) | `NoOrder` 타입에서 순서 의존 연산이 컴파일되지 않음 |
| 비결정성 | 코드 곳곳에 흩어짐 | `nondet!` 호출 위치로 모임, 단 클로저 내부는 예외 |

타입 검사는 보장 수준의 불일치를 잡을 뿐 업무상 멱등성을 만들어 주지는 않는다. `manual_proof!`는 사람이 쓴 주장이므로 결제처럼 외부 효과가 있는 작업에는 여전히 [[At-Least-Once|At-Least-Once 설계]]의 중복 감지와 상태 기록이 필요하다.

## 성숙도 (2026-11-18 공식 문서 기준)

- crates.io의 `hydro_lang` 최신 버전은 사전 릴리스 0.17.0-alpha.6이고 최신 안정 버전은 0.16.0이다. hydro.run의 rustdoc도 0.17.0-alpha.6을 표시한다.
- 문서는 작업 중이라고 밝히고, 배포 도구 Hydro Deploy는 알파 단계이며 Localhost, GCP와 Azure의 단기 실행 애플리케이션을 주 대상으로 한다. 네트워크 설정 문서는 embedded 배포를 유일한 프로덕션 배포 방식으로 적는다.
- 라이선스는 Apache-2.0이고, UC Berkeley Sky Computing Lab, AWS와 참여 기관의 오픈소스 개발자가 공동으로 이끈다.

## 판단 체크포인트

- 지금 시스템에서 재시도가 붙은 입력이 어디서 카운터, 합계, 외부 호출로 이어지는지 목록으로 만들 수 있는가. Hydro를 쓰지 않더라도 이 목록이 타입 대신 리뷰 체크리스트가 된다.
- 순서를 가정하는 코드가 네트워크 경계 뒤에 있는가. 있다면 그 가정을 어디에 문서화했는가.
- 새 분산 프레임워크를 도입할 때 프로덕션 배포 방식, 버전 안정성과 운영 도구의 성숙도를 언어 기능과 따로 확인했는가.

## 출처

- [hydro-project/hydro — GitHub](https://github.com/hydro-project/hydro)
- [Hydro, Introduction](https://hydro.run/docs/hydro/reference/)
- [Hydro, Eventual Determinism](https://hydro.run/docs/hydro/reference/correctness/determinism)
- [Hydro, Non-Determinism and nondet!](https://hydro.run/docs/hydro/reference/correctness/nondet)
- [Hydro, Proof Obligations](https://hydro.run/docs/hydro/reference/correctness/proof-obligations)
- [Hydro, Streams](https://hydro.run/docs/hydro/reference/streaming-data/streams)
- [Hydro, Locations and Networking](https://hydro.run/docs/hydro/reference/locations/)
- [Hydro, Clusters](https://hydro.run/docs/hydro/reference/locations/clusters)
- [Hydro, Network Configuration](https://hydro.run/docs/hydro/reference/locations/network-configuration)
- [Hydro, Deploy](https://hydro.run/docs/hydro/reference/deploy/)
- [hydro_lang rustdoc, Stream](https://hydro.run/rustdoc/hydro_lang/live_collections/struct.Stream.html)
- [hydro_lang rustdoc, Location](https://hydro.run/rustdoc/hydro_lang/location/trait.Location.html)
- [crates.io, hydro_lang](https://crates.io/crates/hydro_lang)
- [AGNTCon 2026 - Shadaj Laddad — Coffee + Software](https://www.youtube.com/watch?v=H5MokJlWdWg)

## 관련 문서

- [[Delivery-Semantics|전달 보장]]
- [[At-Least-Once|At-Least-Once]]
- [[Idempotency-Key|멱등성 키]]
- [[MQ-Kafka-Event-Ordering|Kafka 이벤트 순서]]
- [[CAP-Theorem|CAP 정리]]
