---
tags: [database, redis, cache]
status: done
verified_at: 2026-08-10
category: "Data & Storage - Cache & KV"
aliases: ["Redis 자료구조", "Redis Data Structures"]
---

# Redis 자료구조

Redis는 key-value 저장소이면서 value가 자료구조인 데이터 스트럭처 서버다. 문제에 맞는 타입을 고르는 것이 설계의 절반이고, 나머지 절반은 명령의 시간복잡도와 메모리 표현이다. 타입이 메모리에 실제로 어떻게 놓이는지는 [[Redis-Internal-Encoding|내부 인코딩]]이 다룬다.

## 타입 한눈에 보기

| 타입 | 성질 | 대표 용도 |
|---|---|---|
| String | 바이트 시퀀스, 가장 기본 타입 | 캐시 페이로드, 세션 토큰, 카운터 |
| Bitmap, Bitfield | String 위의 비트 연산과 정수 필드 묶음 | 출석 체크, 플래그, 소형 카운터 다발 |
| List | 삽입 순서 유지, 양끝 삽입 삭제에 최적 | 큐, 타임라인, 최근 목록 |
| Hash | 한 키 아래 field-value 레코드 | 객체 저장, 필드 단위 부분 갱신 |
| Set | 중복 없는 무순서 집합, 집합 연산 | 중복 제거, 태그, 팔로워 |
| Sorted Set | member마다 score를 붙여 정렬 유지 | 리더보드, 우선순위 큐, 상위 N |
| Stream | append-only 로그와 Consumer Group | 이벤트 기록, 작업 큐 |
| Geospatial | 경위도 색인, 반경과 박스 검색 | 주변 장소 찾기 |
| JSON | 중첩 문서, 경로 단위 접근 | 문서 저장, 깊은 필드만 수정 |
| 확률형 | 근사치를 작은 메모리로 | 카디널리티(HLL), 존재 추정(Bloom) |
| Time series | 타임스탬프 데이터, 보존 기간과 다운샘플링 | 메트릭, 센서, 텔레메트리 |
| Vector set | 임베딩 유사도 검색(HNSW) | 시맨틱 검색, 추천, RAG |

위 표는 현행 Redis Open Source 문서가 구현하는 타입들이며, 표 밖에 희소 인덱스 배열인 Arrays 타입도 있다. JSON, Time series, Bloom 계열과 Vector set은 서버 버전과 배포판(관리형 서비스 포함)에 따라 없을 수 있으니 사용 전에 지원 여부부터 확인한다.

## 코어 타입

- **String**: 모든 값의 기본 형태다. `SET`/`GET`에 더해 `INCR` 계열로 원자적 카운터가 되고, TTL을 붙여 세션 토큰과 캐시 엔트리를 만든다. 원자성은 [[Redis-Atomic-Operations|원자적 연산]] 참고.
- **Bitmap과 Bitfield**: 별도 타입이 아니라 String을 비트 단위로 다루는 변형이다. Bitmap은 `SETBIT`으로 비트를 놓고 `BITCOUNT`로 집계하며 문자열 간 비트 연산(AND, OR, XOR 등)은 `BITOP`이 한다. Bitfield는 한 String 안에 여러 정수 카운터를 원자적으로 넣고 증감한다.
- **List**: 문자열을 삽입 순서대로 보관하고 양끝 push/pop이 빠르다. 큐와 타임라인 피드, 최근 검색어 목록에 맞는다. 실제 설계 예시는 [[Redis-Search-History|최근 검색 기록]] 참고.
- **Hash**: 한 키 아래 여러 field-value를 두는 레코드 타입이다. 객체 전체를 String으로 직렬화하면 필드 하나를 고칠 때도 전체를 다시 써야 하지만, Hash는 `HSET`으로 해당 필드만 갱신한다.
- **Set**: 중복 없는 문자열 집합이다. 큰 Set이 쓰는 hashtable 인코딩에서는 추가, 삭제, 존재 확인이 원소 수와 무관하게 O(1)이고, 원소가 적을 때 쓰이는 압축 인코딩(intset, listpack)은 [[Redis-Internal-Encoding|내부 인코딩]] 참고. 교집합, 합집합, 차집합 연산이 있어 태그와 팔로워 모델링에 쓰인다.
- **Sorted Set**: 각 member에 score를 붙여 넣는 시점부터 정렬을 유지하고, score가 같으면 사전순이다. 리더보드, 우선순위 큐, 상위 N 조회의 기본 선택지다.
- **Stream**: append-only 로그다. 이벤트를 발생 순서로 기록하고, Consumer Group이 그룹별 읽기 위치와 미처리 메시지를 서버 쪽에서 추적한다. Pub/Sub과의 비교는 [[Redis-Streams-PubSub|Streams, Pub/Sub]] 참고.

## 확장 타입

- **Geospatial**: `GEOADD`로 경위도를 넣고 `GEOSEARCH`로 반경이나 박스 안의 member를 찾는다. 내부적으로는 Sorted Set이다. 경위도 비트를 interleave한 52비트 Geohash 정수를 score로 쓰는데, double이 52비트 정수까지 정밀도 손실 없이 담기 때문에 성립하는 설계다 (아래 score 절 참고).
- **JSON**: 중첩 JSON 문서를 저장하고 JSONPath로 개별 요소를 읽고 쓴다. 문서 전체를 교체하지 않고 깊은 필드 하나만 갱신할 수 있다.
- **확률형(Probabilistic)**: 정확한 값 대신 근사치를 훨씬 작은 메모리로 얻는다. HyperLogLog는 크기 상한이 정해진 작은 상태로 고유 원소 수(카디널리티)를 추정하지만 원소 자체는 복원할 수 없다. Bloom filter와 Cuckoo filter는 존재 여부 추정, Count-min sketch는 빈도 추정, t-digest는 백분위 추정, Top-K는 상위 랭킹 추정에 쓴다.
- **Time series**: 타임스탬프가 붙은 데이터 포인트를 저장, 조회하고 보존 기간(retention)과 다운샘플링 규칙을 설정할 수 있다. 서버 메트릭, IoT 센서, 텔레메트리에 맞는다.
- **Vector set**: Sorted Set과 비슷하지만 score 자리에 벡터가 들어가는 타입으로 Redis 8.0에서 beta로 도입됐다. HNSW 그래프로 임베딩의 근사 최근접 이웃(ANN)을 검색하고, member에 붙인 JSON 속성으로 필터를 결합한 하이브리드 검색을 지원한다. 기본으로 양자화가 적용되어 저장된 벡터 값은 근사치다. 시맨틱 검색과 RAG 파이프라인의 검색 계층에 쓰인다.

## Sorted Set score는 double(부동소수점)

Sorted Set의 score는 정수처럼 보여도 내부적으로 IEEE 754 배정밀도 부동소수점(double)이다. 정확히 표현되는 정수 범위는 약 2^53까지이고, 그 이상의 큰 정수(스노우플레이크 ID, 나노초 타임스탬프 등)를 score로 넣으면 정밀도 손실로 값이 뭉개질 수 있다.

- JavaScript처럼 숫자를 double로 다루는 클라이언트에서는 큰 Long 값을 주고받을 때 특히 위험하다.
- 정확한 ID나 큰 정수는 score가 아니라 member 문자열로 전달한다. 큰 정수를 굳이 넘길 때는 숫자 대신 문자열로 주고받는 편이 안전하다.
- 랭킹, 시간 범위 검색(`ZRANGEBYSCORE`), 이벤트 정렬처럼 score 정확도가 중요한 기능에서 반드시 확인한다.

## 자료구조 선택과 O(N)

용도별 선택은 위 표가 담고, 선택의 핵심은 명령의 시간복잡도다. 데이터가 적을 때는 O(1)과 O(N) 차이가 안 보이지만, 수십만을 넘으면 O(N) 명령 하나가 명령을 직렬 처리하는 스레드를 오래 점유해 장애가 된다. 큰 컬렉션 전체 조회, 삭제, `KEYS` 회피 등 운영 주의는 [[Operations|운영 팁]] 참고.

## 면접 체크포인트

- 요구를 듣고 타입을 고르는 문제가 기본형이다. 리더보드는 Sorted Set, 큐는 List나 Stream, 중복 제거는 Set, 부분 갱신하는 객체는 Hash로 답하고 명령 복잡도를 이유로 붙인다.
- 인기 검색어 같은 항목별 빈도 랭킹에 HyperLogLog를 대면 오답이다. HLL은 고유 개수 추정이고, 랭킹은 Sorted Set count, Count-min sketch 또는 Top-K가 맞다. 상세 설계는 [[OpenSearch-Popular-Keywords-TopK|인기 검색어 top-k 설계]]가 소유한다.
- 큰 정수 ID를 score에 넣으면 왜 위험한지(double 정밀도)와 Geospatial이 왜 Sorted Set인지(52비트 Geohash score)를 연결해 설명하면 강하다.
- 확장 타입은 어디서나 있다고 전제하지 않는다. 배포판과 버전 확인이 먼저라는 운영 감각을 함께 말한다.

## 관련 문서

- [[Cache-Basics|캐시란?]]
- [[Redis-Architecture|Redis architecture]]
- [[Redis-Internal-Encoding|내부 인코딩 (skiplist, listpack)]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub (Consumer Group)]]
- [[Redis-Search-History|Redis 최근 검색 기록 (List, Sorted Set)]]
- [[Vector-Similarity-Search|벡터 유사도 검색 (exact vs ANN, HNSW 원리)]]
- [[Operations|운영 팁 (O(N) 명령 회피)]]
- [[Use-Cases|Use cases]]

## 출처

- [Redis data types — Redis Documentation](https://redis.io/docs/latest/develop/data-types/)
- [GEOADD — Redis Documentation](https://redis.io/docs/latest/commands/geoadd/)
- [Redis vector sets — Redis Documentation](https://redis.io/docs/latest/develop/data-types/vector-sets/)
- [VADD — Redis Documentation](https://redis.io/docs/latest/commands/vadd/)
- [Redis 8.0 — What's new — Redis Documentation](https://redis.io/docs/latest/develop/whats-new/8-0/)
- [Redis JSON — Redis Documentation](https://redis.io/docs/latest/develop/data-types/json/)
- [우아한테크세미나 191121 우아한레디스 — 우아한테크](https://www.youtube.com/watch?v=mPB2CZiAkKM)
- [엔지니어라면 반드시 알아야 할 Redis 자료구조 10가지 총정리 — CloudBro](https://www.cloudbro.ai/t/%F0%9F%9A%80-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%9D%BC%EB%A9%B4-%EB%B0%98%EB%93%9C%EC%8B%9C-%EC%95%8C%EC%95%84%EC%95%BC-%ED%95%A0-redis-%EC%9E%90%EB%A3%8C%EA%B5%AC%EC%A1%B0-10%EA%B0%80%EC%A7%80-%EC%B4%9D%EC%A0%95%EB%A6%AC/4498)
