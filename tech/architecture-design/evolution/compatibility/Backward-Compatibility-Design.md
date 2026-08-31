---
tags: [architecture, evolution, compatibility, api-contract, versioning]
status: done
category: "Architecture - 진화"
aliases: ["Backward Compatibility Design", "하위 호환성 설계", "계약 진화", "Tolerant Reader", "Expand-Contract"]
verified_at: 2026-08-31
---

# 하위 호환성 설계 (Backward Compatibility Design)

계약(contract)은 코드가 아니라 약속이다. 배포 단위가 둘 이상인 순간 신구 버전이 함께 도는 구간이 생기고, 하위 호환성 설계는 그 겹침을 견디도록 계약을 진화시키는 규율이다.

이 문서는 기질(REST, 이벤트, RPC, 캐시, 파일 포맷)에 중립인 원칙만 다룬다. GraphQL의 breaking 판정 목록은 [[GraphQL-Schema-Design|GraphQL 스키마 설계]]가, DB 컬럼과 backfill 절차는 [[Backward-Compatibility|DB 하위 호환]]이, 버전 표현 방식은 [[API-Conventions-Operations|API 규약 운영]]이 소유한다.

## 호환의 방향을 먼저 정의한다

호환된다는 말은 방향 없이는 뜻이 고정되지 않는다. 생산자(producer)와 소비자(consumer) 쌍으로 서술해야 한다.

- **Backward compatibility** — 새 스키마를 쓰는 소비자가 옛 스키마로 쓰인 데이터를 읽을 수 있다.
- **Forward compatibility** — 옛 스키마를 쓰는 소비자가 새 스키마로 쓰인 데이터를 읽을 수 있다.
- **Full compatibility** — 두 방향을 모두 만족한다. 필드 추가와 삭제 모두 기본값을 갖는 상태에 가깝다.

vault 다른 문서에서 전후방 호환이라고 부르는 상태는 full compatibility를 가리킨다. 리뷰에서 호환된다는 말이 나오면 어느 쪽 방향인지부터 되묻는 것이 첫 규율이다.

**이름 축이 문서마다 다르다는 점에 주의한다.** 이 문서는 직렬화 관례(Avro, Confluent)를 따라 소비자 기준으로 방향을 붙이지만, [[Backward-Compatibility|DB 하위 호환]]은 스키마 변경 기준으로 붙인다. 거기서 말하는 후방 호환(신 스키마가 구버전 앱의 쿼리를 깨지 않음)은 소비자 축으로 옮기면 이 문서의 forward compatibility에 해당하고, 따라서 먼저 나가는 쪽도 소비자가 아니라 스키마다. 두 문서를 오갈 때는 이름표가 아니라 누가 먼저 배포되는지로 대조한다.

## 방향에서 배포 순서가 나온다

방향은 명명 취향이 아니라 배포 순서를 결정하는 입력이다. Confluent Schema Registry가 compatibility 모드마다 갱신 순서를 다르게 지정하는 이유가 여기 있다.

| 보장되는 방향 | 먼저 배포할 쪽 | 이유 |
|---|---|---|
| Backward만 | 소비자 | 새 소비자가 옛 데이터를 읽을 수 있으므로, 소비자를 먼저 올려도 트래픽이 끊기지 않는다 |
| Forward만 | 생산자 | 옛 소비자가 새 데이터를 읽을 수 있으므로, 생산자를 먼저 올려도 된다 |
| Full | 무관 | 두 방향이 모두 성립하면 순서 제약이 사라진다 |
| 어느 쪽도 아님 | 순서로 못 푼다 | 계약을 둘로 쪼개고 동시 지원 구간을 만들어야 한다 |

마지막 행이 Expand-Contract가 필요한 근거다. 순서를 아무리 잘 잡아도 풀리지 않는 변경이 있고, 그때는 시간이 아니라 계약의 개수를 늘려서 푼다.

## 어떤 변경이 계약을 깨는가

같은 변경이라도 요청 방향과 응답 방향에서 안전성이 뒤집힌다. 이 비대칭이 호환성 판단의 핵심이다.

| 변경 | 요청(소비자 → 생산자) | 응답(생산자 → 소비자) |
|---|---|---|
| 선택 필드 추가 | 안전 | 조건부 안전 (소비자가 모르는 필드를 무시할 때) |
| 필수 필드 추가 | 깨짐 (옛 소비자가 안 보냄) | 조건부 안전 (소비자가 모르는 필드를 무시할 때) |
| 필드 제거 | 안전 (생산자가 무시) | 깨짐 (소비자가 참조) |
| 제약 강화 (길이, 범위, 필수화) | 깨짐 | 소비자 검증이 있으면 깨짐 |
| 제약 완화 | 안전 | 파싱이 좁으면 깨짐 |
| enum, union 멤버 추가 | 안전 | dangerous (소비자가 모르는 값을 받음) |
| enum 멤버 제거 | 깨짐 (소비자가 계속 보냄) | 안전에 가까움 |

스키마 검사기가 통과시켜도 소비자를 깨는 dangerous 구간은 값의 집합이 늘어나는 변경에 몰려 있다. Protocol Buffers가 삭제한 필드 번호와 이름을 `reserved`로 예약하라고 규정하는 것도 같은 이유다. wire format에는 정의 불일치를 감지할 수단이 없어서, 번호를 재사용하면 파싱 오류와 데이터 오염으로 조용히 번진다.

## 가장 위험한 변경은 타입이 아니라 의미

필드 이름과 타입이 그대로인 채 뜻만 바뀌는 변경은 어떤 스키마 검사도 잡지 못한다.

- 단위 변경 (초에서 밀리초, 원에서 센트)
- 시간대와 기준 시점 변경 (로컬 시각에서 UTC, 생성 시각에서 확정 시각)
- null의 의미 변경 (값 없음에서 권한 없음)
- 상태값의 해석 변경 (`ACTIVE`가 결제 완료를 포함하다가 제외하도록 바뀜)
- 식별자의 발급 주체나 유일성 범위 변경

**규칙은 하나다. 의미가 바뀌면 필드를 재사용하지 않고 새 필드를 만든다.** 기계가 분기하는 필드와 사람이 읽는 문구를 분리하고 코드 집합을 append-only로 유지하는 구체형은 [[Agent-Ready-API-Design|에이전트 친화 API 설계]]가 소유한다.

## Tolerant Reader

소비자가 관용적으로 읽으면 생산자의 추가 변경이 배포 조율 없이 흐른다. Fowler의 Tolerant Reader가 정리한 규율이다.

- **모르는 필드는 무시한다 (must-ignore)** — 스키마 바인딩이 미지의 필드에서 예외를 던지지 않게 한다.
- **필요한 것만 읽는다** — 페이로드 전체 구조가 아니라 실제로 쓰는 경로에만 의존한다.
- **모르는 enum과 타입에 fallback을 둔다** — 미지의 값을 unknown으로 접고 기본 동작을 정의한다.
- **파싱을 한 곳에 가둔다** — DTO 한 지점에서만 페이로드를 읽으면 생산자 변경의 영향 범위가 파일 하나로 좁아진다.

근거는 Postel's law(보내는 것은 엄격하게, 받는 것은 관대하게)이지만 한계도 분명하다. 관용이 지나치면 계약 위반이 조용히 통과해 잘못된 데이터가 하류로 흐르고, 원인 지점이 소비자에서 멀어져 디버깅이 어려워진다. 무시하는 것과 계측 없이 삼키는 것은 다르다. 미지의 필드나 값을 만나면 경고 로그와 지표를 남긴다.

위 네 가지는 기질 중립인 최소치다. Avro와 Protobuf, JSON에서 이 규율이 각각 어디까지 포맷에 강제되고 어디부터 소비자 코드의 몫인지는 [[Schema-Evolution|스키마 진화]]가, 요청-응답 계약의 클라이언트 진화 내성 3종은 [[GraphQL-Schema-Design|GraphQL 스키마 설계]]가 소유한다.

## Expand-Contract를 계약 일반으로

martinfowler.com에 실린 Danilo Sato의 Parallel Change(expand and contract)는 인터페이스 변경 패턴이지만, 계약이라면 기질을 가리지 않고 같은 3단계가 적용된다.

1. **Expand** — 신구 계약을 동시에 만족하는 상태를 먼저 만든다. 새 필드를 추가하되 옛 필드도 채운다.
2. **Migrate** — 소비자를 새 경로로 옮기고, 옛 경로 사용량을 계측한다.
3. **Contract** — 옛 경로를 제거하고 계약을 새 형태만 지원하도록 좁힌다.

적용 대상은 API 응답 필드에 그치지 않는다. 이벤트 페이로드, 큐 메시지, 캐시 직렬화 포맷, 파일 포맷, feature flag의 설정 스키마에도 같은 3단계가 필요하다. 재시도 큐와 DLQ에 남은 오래된 메시지는 생산자가 이미 새 포맷으로 넘어간 뒤에도 옛 계약을 요구한다.

DB 컬럼의 Expand-Contract 구현은 [[Blue-Green|블루그린 배포]]가, 마이그레이션 히스토리와 roll-forward는 [[Schema-Versioning|스키마 버저닝]]이 소유한다. 여기서 이어지는 명제는 하나다. 애플리케이션 배포는 되돌릴 수 있어도 스키마 변경은 되돌리기 어렵고, 그 간극을 메우는 것이 호환성이다.

## Contract 단계는 시간이 아니라 증거로 넘어간다

옛 경로 제거는 유예 기간이 지났다는 이유로 하지 않는다. 안 쓴다는 증거가 있어야 한다.

- **사용량 계측** — 옛 필드와 옛 엔드포인트의 호출량을 소비자 식별자별로 집계한다. 0이 아니라 누가 남았는지가 필요하다.
- **소비자 인벤토리** — 내부 서비스뿐 아니라 배치잡, 크론, 서드파티 연동, 스토어에 남은 구버전 앱, 큐에 적체된 메시지까지 목록화한다.
- **계절성 확인** — 월말 정산, 분기 리포트처럼 드물게 도는 소비자는 짧은 관측 창에서 0으로 보인다.
- **계측 누락 확인** — 지표가 0인 것과 계측이 안 붙은 것을 구분한다.

폐기 신호는 문서만이 아니라 기계가 읽을 수 있어야 한다. 스키마 어노테이션과 응답 로그 경고를 함께 남겨 소비자가 코드로 감지하게 만든다. HTTP 폐기 헤더의 규격과 문법은 [[API-Versioning|API 버저닝 메커니즘]]이, 폐기 수명주기와 헤더의 힌트 성격은 [[API-Versioning-Design|API 버저닝 설계]]가 소유한다.

## 호환성 창은 소비자 수명이 정한다

지원해야 할 기간은 정책이 아니라 소비자의 물리적 수명에서 나온다.

| 소비자 | 교체 주기 | 창을 닫는 수단 |
|---|---|---|
| 내부 서비스 | 분에서 시간 단위 재배포 | 배포 순서 조율 |
| 웹 클라이언트 | 세션 또는 새로고침 | 강제 리로드, 캐시 무효화 |
| 모바일 앱 | 스토어 심사와 사용자 업데이트 | 최소 지원 버전과 강제 업데이트 |
| 서드파티 | 상대 조직의 개발 일정 | 계약상 통지 기간 |

스토어 심사와 구버전 공존, 강제 업데이트 정책의 세부는 [[Mobile-App-Architectures|모바일 앱 아키텍처]]가 소유한다. 서버가 창을 닫을 수 없는 소비자가 하나라도 있으면 그 소비자가 전체 호환성 창의 길이를 정한다.

## 호환 유지가 비싼 지점은 버전이 아니라 분기

계약 하나에 조건 분기가 쌓이면 코드 줄 수보다 테스트 조합이 먼저 폭발한다. 분기 n개는 최악의 경우 2^n 경로를 만들고, 그중 실제로 검증되는 것은 일부다.

- **호환을 유지하는 게 싼 경우** — 분기가 한두 개고 국소적이며, 소비자 이관이 몇 주 안에 끝난다.
- **새 버전으로 끊는 게 싼 경우** — 분기가 핵심 도메인 로직까지 파고들거나, 옛 소비자의 이관 시점을 통제할 수 없거나, 두 계약의 의미 모델 자체가 갈라진다.

새 버전을 어떻게 표현하고 전달할지(URI, 헤더, 쿼리)는 [[API-Versioning-Design|API 버저닝 설계]]와 [[API-Conventions-Operations|API 규약 운영]]이 소유한다. 이 문서가 다루는 것은 언제 끊을지의 판단뿐이다.

## 깨짐은 사람이 아니라 CI가 잡는다

리뷰 규율만으로는 유지되지 않는다. 사람은 필드 하나가 늘어난 diff에서 그 필드가 소비자 세 곳의 파싱을 깬다는 사실을 보지 못한다.

- **스키마 diff** — 호환성 규칙을 기계 판정으로 옮긴다. 두 버전의 스키마를 비교해 breaking, dangerous, safe로 분류하고 breaking은 merge를 막는다.
- **Consumer-driven contract 테스트** — 소비자가 테스트 실행 중에 기대를 계약으로 기록하고, 생산자 CI가 그 계약을 재생해 검증한다. Pact가 취하는 방식이며, 실제로 쓰이는 부분만 검증 대상이 되는 것이 특징이다.
- **계약을 코드 생성에 연결** — 스키마에서 타입을 생성하면 소비자 쪽 컴파일 에러가 breaking 변경의 1차 탐지기가 된다. 이 실행 방식은 [[Modular-Monolith|모듈러 모노리스]]가 소유한다.

API 호환성 검사는 [[Architecture-Fitness-Functions|아키텍처 fitness function]]의 한 사례다. 보호할 속성과 실패 시 행동을 연결하는 프레임워크는 그 문서에 있다.

## 흔한 실패

- 방향을 정하지 않고 호환된다고 선언해 배포 순서가 뒤집히면 깨짐
- 배포 순서를 문서화하지 않아 롤백 때 순서가 반대로 실행됨
- 필드를 재사용해 의미만 조용히 바꿈, 스키마 검사는 통과
- 폐기 표시만 하고 사용량 계측이 없어 남은 소비자를 모른 채 제거
- 소비자 인벤토리에서 배치잡과 적체 메시지를 빼고 창을 닫음
- Contract 단계를 미루다 expand 상태가 영구 부채로 굳음
- 호환 분기를 계속 쌓아 테스트 조합이 관리 범위를 벗어남

## 면접 체크포인트

- 호환의 방향과 배포 순서의 관계를 설명할 수 있는가
- Expand-Contract가 배포 전략과 무관하게 필요한 이유를 말할 수 있는가
- Tolerant Reader가 조직의 배포 조율 비용을 줄이는 원리를 설명할 수 있는가
- 옛 경로 제거 시점을 무엇으로 판단하는가
- 호환 유지와 새 버전 분기의 비용을 어떤 기준으로 비교하는가
- 스키마 검사가 통과해도 소비자가 깨지는 변경의 예를 들 수 있는가

## 출처

- [Tolerant Reader — martinfowler.com, Martin Fowler](https://martinfowler.com/bliki/TolerantReader.html)
- [Parallel Change — martinfowler.com, Danilo Sato](https://martinfowler.com/bliki/ParallelChange.html)
- [Protocol Buffers, Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [Pact Docs, Introduction](https://docs.pact.io/)
- [Confluent Developer, Schema Registry 101, Testing Schema Compatibility](https://developer.confluent.io/courses/schema-registry/schema-compatibility/)

## 관련 문서

- [[GraphQL-Schema-Design|GraphQL 스키마 설계]] — breaking, dangerous, safe 변경 판정과 `@deprecated` 절차
- [[Schema-Evolution|스키마 진화]] — 이 문서의 방향 프레임워크를 이벤트, 메시지 계약과 Schema Registry로 구체화
- [[Backward-Compatibility|DB 하위 호환]] — 컬럼 추가와 제거, NOT NULL 승격, backfill과 이중 쓰기 (방향 이름은 스키마 변경 축)
- [[Blue-Green|블루그린 배포]] — DB Expand-Contract 3단계와 신구 버전 동시 구동
- [[Zero-Downtime-Deployment|무중단 배포]] — 마이그레이션과 앱 배포의 분리
- [[Schema-Versioning|스키마 버저닝]] — 마이그레이션 히스토리와 roll-forward
- [[API-Versioning-Design|API 버저닝 설계]] — 버전을 끊는 기준과 폐기 수명주기
- [[API-Versioning|API 버저닝 메커니즘]] — `Deprecation`, `Sunset` 헤더 규격과 문법
- [[API-Conventions-Operations|API 규약 운영]] — URI, 헤더, 쿼리 버저닝의 선택 기준
- [[Architecture-Fitness-Functions|아키텍처 fitness function]] — 호환성 검사를 품질 게이트로 배치하기
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]] — 에러 코드 append-only 계약
- [[Mobile-App-Architectures|모바일 앱 아키텍처]] — 최소 지원 버전과 강제 업데이트
- [[Modular-Monolith|모듈러 모노리스]] — OpenAPI 계약을 코드 생성과 CI에 연결
- [[Microservice-Service-Decomposition|마이크로서비스 분해]] — 서비스 경계가 계약의 개수를 정한다
