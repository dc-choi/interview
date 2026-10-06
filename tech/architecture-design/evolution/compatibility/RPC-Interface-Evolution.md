---
tags: [architecture, evolution, compatibility, rpc, thrift, grpc, protobuf, hive-metastore, spark]
status: done
verified_at: 2026-10-06
category: "Architecture - 진화"
aliases: ["RPC Interface Evolution", "RPC 인터페이스 진화", "RPC 메서드 호환성", "IDL 메서드 제거"]
---

# RPC 인터페이스 진화 (RPC Interface Evolution)

IDL로 정의한 RPC 서비스에서는 메서드 목록도 계약이다. 필드 번호와 필드 ID 같은 진화 장치는 요청과 응답 안의 데이터를 지키지만 메서드가 서버에 있는지는 지키지 않는다. 서버에서 메서드를 지워도 서버의 컴파일과 단위 테스트는 통과하므로, breaking 검사나 계약 테스트가 없으면 그 메서드를 부르던 구 클라이언트가 실행 시점에 실패하고 나서야 드러난다.

호환 방향과 배포 순서, Expand-Contract와 제거 증거 같은 기질 중립 원칙은 [[Backward-Compatibility-Design|하위 호환성 설계]]가, Protobuf, Avro, JSON 메시지 필드의 호환 규칙은 [[Schema-Evolution|스키마 진화]]가 소유하고, Thrift 인자 struct 규칙은 아래에 요약한다. 이 문서는 메서드 단위의 계약과, 공유 서버를 올리기 전에 실제로 호출하는 클라이언트를 찾는 절차를 다룬다.

## 메서드는 이름으로 식별된다

| 항목 | Thrift (Java 라이브러리 기준) | gRPC |
|---|---|---|
| 메서드 식별 | 메시지 헤더에 실린 메서드 이름 문자열 | HTTP/2 `:path`의 `/{패키지.서비스}/{메서드}`, 대소문자 구분 |
| 서버에 없는 메서드 호출 | `TApplicationException`, 유형 `UNKNOWN_METHOD`(1), 메시지 `Invalid method name: '<이름>'` | 서버 라이브러리가 `UNIMPLEMENTED`(12) 반환 |
| 인자와 결과의 진화 | 인자 목록과 예외 목록이 struct로 인코딩되어 필드 ID 규칙을 따른다 | Protobuf 메시지면 필드 번호 규칙을 따른다 |

- Thrift의 `TBaseProcessor`는 받은 메서드 이름으로 처리 함수 맵을 조회한다. 찾지 못하면 인자 struct를 건너뛰고 `UNKNOWN_METHOD` 예외를 응답으로 보내며, 생성된 클라이언트는 이 응답을 `TApplicationException`으로 던진다.
- Thrift 설계 논문은 메서드를 고정 길이 해시 대신 이름 문자열로 보내기로 했다. IDL의 모든 과거 버전과 충돌하지 않는 해시를 만들려면 별도 메타 저장소가 필요했기 때문이다. IDL 문법에서도 필드 ID는 struct 필드와 인자, 예외 목록에만 붙고 메서드 정의에는 식별 번호가 없다.
- gRPC의 전체 메서드 이름은 패키지, 서비스, 메서드를 모두 포함한다(예: `/google.pubsub.v2.PublisherService/CreateTopic`). 메서드 개명뿐 아니라 서비스 개명과 패키지 이동도 호출 경로를 바꾼다.

wire에서 보면 메서드 개명은 삭제와 추가를 한꺼번에 한 것과 같다.

## 방향별 판정

| 변경 | 구 클라이언트가 새 서버 호출 | 새 클라이언트가 구 서버 호출 |
|---|---|---|
| 메서드 추가 | 안전 (부르지 않는다) | 새 메서드를 부르는 순간 실패 |
| 메서드 삭제 | 지운 메서드를 부르는 순간 실패 | 안전 (부르지 않는다) |
| 메서드 개명 | 실패 | 실패 |
| 서비스 개명, 패키지 이동 | gRPC는 실패(`:path`가 바뀐다). Thrift는 메서드 이름만 실려 영향이 없지만 다중화(`TMultiplexedProtocol`, `TMultiplexedProcessor`)에 쓰는 서비스 이름을 바꾸면 실패 | 왼쪽과 같다 |
| 인자와 결과의 필드 변경 | 필드 규칙을 따른다 | 필드 규칙을 따른다 |

- 추가와 삭제는 방향만 다른 같은 문제다. 클라이언트가 호출하는 메서드 집합이 서버가 구현한 집합 안에 있어야 한다. 새 메서드를 쓰는 클라이언트는 서버를 먼저 배포한 뒤 내보내고, 옛 메서드는 그것을 부르는 클라이언트가 남아 있는 동안 지우지 않는다.
- 구 서버와 통신하려고 일부러 옛 메서드를 계속 부르는 클라이언트도 있다. 이런 클라이언트가 남아 있으면 옛 메서드를 정리한 새 서버에서 실패한다(아래 사례).
- 필드 단위에서도 방향이 갈린다. Thrift 설계 논문은 필드가 빠진 새 클라이언트가 구 서버를 부르는 경우를 가장 위험하다고 보고 서버를 먼저 배포하라고 권한다. Thrift IDL 문서는 required 필드를 지우거나 optional로 바꾸면 버전 간 데이터 호환이 깨진다고 적는다. 인자 목록도 struct라 required 규칙을 받는다. 단 인자 목록의 `optional` 키워드는 컴파일러가 무시하고 기본 requiredness로 처리한다.

## 예시: 폐기 표시와 위임으로 남기기

옛 메서드를 바로 지우지 않고 폐기 표시와 함께 남긴다. 구현은 새 메서드와 같은 내부 함수에 위임한다.

```proto
service TableService {
  rpc GetTableReq(GetTableRequest) returns (GetTableResult);

  // 구 클라이언트 전용. 호출이 사라졌음을 계측으로 확인한 뒤 제거한다.
  rpc GetTable(GetTableLegacyRequest) returns (Table) {
    option deprecated = true;
  }
}
```

옛 요청을 새 요청 형태로 바꿔 같은 조회 함수에 넘기면 두 메서드의 동작이 갈라지지 않고, 제거할 때는 선언과 위임 코드만 지우면 된다. 구버전 계약을 경계 계층의 어댑터로 변환하는 원칙([[API-Versioning-Design|API 버저닝 설계]])을 메서드 단위에 적용한 형태다.

## 정적 검사가 잡는 범위

- 생성 코드는 한 빌드 안의 일관성만 보장한다. 서버 저장소에서 IDL 선언과 구현을 함께 지우면 서버 컴파일은 통과하고, 실패는 따로 배포된 구 클라이언트에서 실행 시점에 드러난다.
- Buf의 breaking 규칙 `RPC_NO_DELETE`는 RPC 삭제가 wire를 깨는 변경은 아니지만 서버가 그 RPC를 구현하지 않으면 클라이언트 호출이 실패한다고 설명하고, 삭제 대신 deprecate를 권한다. 이 규칙은 `FILE`과 `PACKAGE` 범주에만 들어 있어 `WIRE`나 `WIRE_JSON` 범주만 고른 설정은 RPC 삭제를 통과시킨다. 기본 범주는 `FILE`이다.
- Protobuf의 `MethodOptions`와 `ServiceOptions`에는 `deprecated` 옵션이 있다. 대상 언어에 따라 Deprecated 어노테이션이 생기거나 무시되므로 폐기 의도를 기록할 뿐 호출을 막지는 않는다.
- Thrift 컴파일러는 `--audit <구 IDL>` 옵션으로 두 IDL을 비교해 빠진 서비스와 함수를 실패로 보고한다. 이런 전용 breaking 검사기가 없는 IDL이라면 구 IDL과 새 IDL의 service 블록에서 메서드 목록을 비교하는 검사를 CI에 둔다. 검사를 품질 게이트로 배치하는 방법은 [[Architecture-Fitness-Functions|아키텍처 fitness function]]을 따른다.

## 실제 호출자를 찾는다

여러 제품과 팀이 함께 쓰는 서버(메타데이터 카탈로그, 사내 플랫폼 API 등)를 올릴 때 계약을 실제로 쥔 것은 애플리케이션 코드가 아니라 클라이언트 라이브러리다. 이 라이브러리는 다른 제품이 번들해 버전을 고정하는 경우가 많아 애플리케이션 의존성 목록에 드러나지 않는다.

1. **IDL diff**: 구 서버와 새 서버의 IDL에서 서비스 메서드 목록을 비교해 사라지거나 이름이 바뀐 메서드를 뽑는다. 이슈 제목과 변경 설명은 영향을 작게 적을 수 있으므로 선언 diff를 기준으로 삼는다.
2. **클라이언트 인벤토리**: 프레임워크가 번들한 클라이언트와 그 버전, 클라이언트 버전을 고르는 설정, 다른 언어로 따로 구현한 클라이언트까지 목록에 넣는다.
3. **래퍼와 RPC 대응**: 같은 이름의 래퍼 메서드도 클라이언트 버전마다 부르는 RPC가 다를 수 있다. 사라진 메서드마다 어느 클라이언트 버전이 그것을 부르는지 소스로 확인한다.
4. **서버 쪽 계측**: 메서드 이름별 호출 수를 클라이언트 식별자와 함께 센다. gRPC의 OpenTelemetry 지표 `grpc.server.call.started`는 `grpc.method` 속성에 패키지, 서비스, 메서드를 포함한 전체 이름을 남긴다.
5. **업그레이드 뒤 탐지**: Thrift는 클라이언트 쪽 `Invalid method name` 오류에, gRPC는 `UNIMPLEMENTED` 상태에 경보를 건다. Thrift 다중화 서버에서 서비스 이름이 맞지 않으면 응답 없이 연결이 닫히므로 서버 로그의 `Service name not found`도 본다. gRPC 지표는 악의적인 호출로 지표 카디널리티가 커지는 것을 막으려고 등록되지 않은 메서드 이름을 기본적으로 `other`로 기록하고 A66의 언어별 옵션도 generic 처리기로 받는 메서드에 한정되므로, 어떤 이름이 불렸는지는 클라이언트 쪽 로그나 프록시의 `:path` 로그에서 찾는다.

## 이미 지운 뒤의 선택지

| 선택지 | 효과 | 비용과 한계 |
|---|---|---|
| 서버에 옛 메서드 복원 | 클라이언트가 부르는 사라진 메서드를 모두 되살리면 클라이언트를 바꾸지 않고 회복한다. 옛 인자를 새 요청으로 바꿔 기존 구현에 넘기면 코드가 작다 | 서버가 옛 계약을 다시 떠안는다. upstream 코드에 얹은 패치라면 업그레이드마다 다시 적용해야 한다 |
| 클라이언트 교체나 설정 변경 | 근본 해결이다 | 소유자가 다른 클라이언트가 많으면 범위가 커지고 프레임워크가 지원하는 버전 범위에 묶인다 |
| 프로토콜을 이해하는 프록시에서 변환 | 서버와 클라이언트를 그대로 둔다 | 운영할 구성요소와 장애 지점이 하나 늘어난다 |
| 호환 클라이언트 재배포 | 통제할 수 있는 배포본은 해결한다 | 통제 밖의 배포본은 그대로 남는다 |

복원은 계약을 되살리는 일이므로 그 메서드에 예고, 계측, 축소, 제거의 폐기 절차를 다시 적용한다([[API-Versioning-Design|API 버저닝 설계]]).

## 운영 체크포인트

- 서버 업그레이드 전에 IDL 메서드 목록 diff를 만들고 사라진 메서드마다 호출 클라이언트를 확인했는가
- 번들 클라이언트, 설정으로 고르는 클라이언트, 다른 언어의 독립 구현까지 인벤토리에 넣었는가
- 메서드 이름별 호출량을 클라이언트 식별자와 함께 볼 수 있는가
- 새 메서드를 쓰는 클라이언트가 서버보다 먼저 나가지 않도록 배포 순서를 정했는가
- breaking 검사가 RPC와 서비스 삭제를 잡는 범주로 설정돼 있는가
- 업그레이드 직후 `UNKNOWN_METHOD`와 `UNIMPLEMENTED`에 경보가 걸려 있는가

## 사례: Hive Metastore와 Spark 내장 클라이언트

- Hive 2.3 브랜치 클라이언트는 HIVE-15062 이후 `get_table_req`를 불러 2.3 미만 Metastore에서 `Invalid method name: 'get_table_req'`를 냈고, HIVE-24608이 2.3.9에서 `get_table` 호출로 되돌렸다. 2.3.9와 2.3.10의 `HiveMetaStoreClient.getTable(dbname, name)`은 `get_table`을, 3.1.3은 `get_table_req`를 부른다.
- HIVE-26537(이슈 제목 Deprecate older APIs in the HMS, PR #3599, 수정 버전 4.0.1과 4.1.0)은 Metastore Thrift IDL에서 `get_table`, `get_table_objects_by_name`을 비롯한 옛 선언을 뺐다. PR의 사용자 영향 항목은 없음이었다. 4.0.0 IDL에는 `Table get_table(1:string dbname, 2:string tbl_name)`이 있고 4.0.1과 4.2.0 IDL에는 없다.
- Spark는 `spark.sql.hive.metastore.jars`가 기본값 `builtin`이면 번들한 Hive 2.3 클라이언트로 Metastore와 통신한다(3.5.5 문서 기준 2.3.9, 4.0.0과 4.2.0 문서 기준 2.3.10). 테이블 조회는 `HiveClientImpl`에서 shim과 `Hive.getTable`을 거쳐 `HiveMetaStoreClient.getTable`에 이르므로 4.0.1 이후 Metastore에서 `get_table` 호출이 실패한다. 같은 번들 클라이언트는 `getRawTablesByName`에서 `getTableObjectsByName`을 거쳐 `get_table_objects_by_name`도 부르므로(Thrift 서버의 컬럼 메타데이터 조회 등), `get_table`만 되살리면 이 경로는 계속 실패할 수 있다. 다른 클라이언트는 `spark.sql.hive.metastore.version`과 `spark.sql.hive.metastore.jars`의 `maven`, `path` 또는 classpath 값으로 고르며, 고를 수 있는 Metastore 버전은 Spark 3.5.5가 3.1.3까지, 4.0.0이 4.0.1까지, 4.2.0이 4.1.0까지다. PyIceberg 0.7.1의 Hive 카탈로그도 Metastore 4.0.1에서 같은 오류를 보고했다.
- NAVER D2 사례는 Hive 4.2 계열로 Metastore를 올리는 과정에서 스테이징의 Spark 3.5.5 기본 설정(번들 Hive 2.3.9) 잡이 이 오류로 실패하자, IDL에 `get_table` 선언 두 줄을 되살리고 옛 인자를 `GetTableRequest`로 바꿔 `get_table_req`와 같은 내부 조회 함수에 넘기는 구현으로 복원했다.

## 출처

- [Thrift: Scalable Cross-Language Services Implementation — Apache Thrift, Mark Slee, Aditya Agarwal, Marc Kwiatkowski](https://thrift.apache.org/static/files/thrift-20070401.pdf)
- [Apache Thrift, Interface Description Language](https://thrift.apache.org/docs/idl)
- [TBaseProcessor.java — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/lib/java/src/main/java/org/apache/thrift/TBaseProcessor.java)
- [TServiceClient.java — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/lib/java/src/main/java/org/apache/thrift/TServiceClient.java)
- [TMultiplexedProtocol.java — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/lib/java/src/main/java/org/apache/thrift/protocol/TMultiplexedProtocol.java)
- [TMultiplexedProcessor.java — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/lib/java/src/main/java/org/apache/thrift/TMultiplexedProcessor.java)
- [t_audit.cpp — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/compiler/cpp/src/thrift/audit/t_audit.cpp)
- [main.cc — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/compiler/cpp/src/thrift/main.cc)
- [thrifty.yy — GitHub, apache/thrift](https://github.com/apache/thrift/blob/master/compiler/cpp/src/thrift/thrifty.yy)
- [gRPC, Status codes and their use in gRPC](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)
- [gRPC, gRPC over HTTP2](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)
- [gRPC Proposal A66, OpenTelemetry Metrics](https://github.com/grpc/proposal/blob/master/A66-otel-stats.md)
- [Buf Docs, Rules and categories](https://buf.build/docs/breaking/rules/)
- [descriptor.proto — GitHub, protocolbuffers/protobuf](https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto)
- [HIVE-24608 Switch back to get_table in HMS client for Hive 2.3.x — Apache JIRA](https://issues.apache.org/jira/browse/HIVE-24608)
- [HIVE-26537 Deprecate older APIs in the HMS — Apache JIRA](https://issues.apache.org/jira/browse/HIVE-26537)
- [HIVE-26537: Deprecate older APIs in the HMS thrift interface, PR #3599 — GitHub, apache/hive](https://github.com/apache/hive/pull/3599)
- [hive_metastore.thrift rel/release-4.0.0 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-4.0.0/standalone-metastore/metastore-common/src/main/thrift/hive_metastore.thrift)
- [hive_metastore.thrift rel/release-4.0.1 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-4.0.1/standalone-metastore/metastore-common/src/main/thrift/hive_metastore.thrift)
- [hive_metastore.thrift rel/release-4.2.0 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-4.2.0/standalone-metastore/metastore-common/src/main/thrift/hive_metastore.thrift)
- [HiveMetaStoreClient.java rel/release-2.3.10 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-2.3.10/metastore/src/java/org/apache/hadoop/hive/metastore/HiveMetaStoreClient.java)
- [HiveMetaStoreClient.java rel/release-3.1.3 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-3.1.3/standalone-metastore/src/main/java/org/apache/hadoop/hive/metastore/HiveMetaStoreClient.java)
- [Hive.java rel/release-2.3.10 — GitHub, apache/hive](https://github.com/apache/hive/blob/rel/release-2.3.10/ql/src/java/org/apache/hadoop/hive/ql/metadata/Hive.java)
- [Apache Spark 3.5.5 Documentation, Hive Tables](https://archive.apache.org/dist/spark/docs/3.5.5/sql-data-sources-hive-tables.html)
- [Apache Spark 4.0.0 Documentation, Hive Tables](https://spark.apache.org/docs/4.0.0/sql-data-sources-hive-tables.html)
- [Apache Spark 4.2.0 Documentation, Hive Tables](https://spark.apache.org/docs/4.2.0/sql-data-sources-hive-tables.html)
- [HiveClientImpl.scala v3.5.5 — GitHub, apache/spark](https://github.com/apache/spark/blob/v3.5.5/sql/hive/src/main/scala/org/apache/spark/sql/hive/client/HiveClientImpl.scala)
- [HiveShim.scala v3.5.5 — GitHub, apache/spark](https://github.com/apache/spark/blob/v3.5.5/sql/hive/src/main/scala/org/apache/spark/sql/hive/client/HiveShim.scala)
- [SparkGetColumnsOperation.scala v3.5.5 — GitHub, apache/spark](https://github.com/apache/spark/blob/v3.5.5/sql/hive-thriftserver/src/main/scala/org/apache/spark/sql/hive/thriftserver/SparkGetColumnsOperation.scala)
- [Hive metastore 4.0.1 remove deprecated thrift APIs, Issue #1222 — GitHub, apache/iceberg-python](https://github.com/apache/iceberg-python/issues/1222)
- [Hive는 잊으려 했지만, Spark는 기억하고 있었다: 사라진 get_table RPC 복원기 — NAVER D2, 김동현](https://d2.naver.com/helloworld/7314597)

## 관련 문서

- [[Backward-Compatibility-Design|하위 호환성 설계]] — 호환 방향, 배포 순서와 제거 증거의 기질 중립 원칙
- [[Schema-Evolution|스키마 진화]] — Protobuf 필드 번호와 `reserved`, 메시지 필드 호환 규칙
- [[API-Versioning-Design|API 버저닝 설계]] — 폐기 4단계와 구버전 어댑터
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조]] — 상류 버전을 받아들이는 쪽의 업그레이드 비용
- [[gRPC|gRPC]] — HTTP/2와 Protobuf 기반 RPC의 기본 구조
- [[Connect-RPC|Connect RPC]] — 같은 Protobuf 계약을 여러 wire 규칙으로 노출할 때의 버전 호환
- [[Architecture-Fitness-Functions|아키텍처 fitness function]] — 호환성 검사를 CI 게이트로 배치
- [[EMR|Amazon EMR]] — Hive와 Spark를 함께 운영하는 관리형 클러스터
