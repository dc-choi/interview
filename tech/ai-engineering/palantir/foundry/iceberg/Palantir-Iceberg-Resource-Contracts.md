---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Iceberg table와 dataset의 기능, snapshot과 format 계약

Foundry-managed Iceberg는 Foundry REST catalog가 관리하고 storage는 managed 또는 BYOB다. virtual Iceberg는 외부 catalog/storage를 참조한다. open format의 호환성과 Foundry application별 지원은 다른 판단이다.

## Dataset과의 차이

row UPDATE/DELETE/MERGE,compaction과 changelog를 지원하지만 Foundry/Iceberg view,Restricted View,streaming,time-series sync,projection과 object materialization은 지원하지 않는다. Ontology에서 row/column policy는 일부 enrollment의 Iceberg-backed object type에 제공되며 table자체의 Restricted View는 dataset으로 읽어 변환한 뒤 구성한다.

Marketplace managed table은 source와 install의 managed/BYOB storage type을 같게 유지해야 한다. default branch main/master는 같은 의미로 mapping한다. non-incremental replace는 schema를 자동 evolve할 수 있지만 incremental write는 별도 ALTER/settings가 필요해 실패할 수 있다.

## Format과 type

format v2/v3 read/write를 지원한다. CSE off는 client 호환성 때문에 기본v2,CSE on은 encryption이v3기능이므로 기본v3다. v2→v3 upgrade는 가능하지만 downgrade는 불가능하다.

v2의 time,v3의 geography/geometry/time/timestamp_ns/timestamptz_ns/unknown/variant는 지원하지 않는다. nanosecond timestamp는 microsecond precision으로 바꾸는 예제가 있으므로 정밀도 손실을 판단한다.

## Snapshot 의미

snapshot은 실제 data를 복사하지 않고 그 시점의 data/delete file 집합을 metadata로 가리킨다. 최초 빈 table write는 full replacement 의도여도 append로 기록된다. append는 추가,overwrite는 논리 row 변경,delete는 제거,replace는 compaction처럼 논리내용을 유지한 file재작성이다.

Foundry dataset APPEND는 Iceberg append,UPDATE/SNAPSHOT은 overwrite,DELETE는 delete에 대응하며 replace의 직접 대응은 없다. metadata-only schema/partition/identifier 변경은 새 snapshot을 만들지 않아 다음 data snapshot전에는 Snapshots tab에 보이지 않는다.

## 출처

- [Palantir, iceberg](https://www.palantir.com/docs/foundry/iceberg)
- [Palantir, overview](https://www.palantir.com/docs/foundry/iceberg/overview)
- [Palantir, iceberg-vs-datasets](https://www.palantir.com/docs/foundry/iceberg/iceberg-vs-datasets)
- [Palantir, versions](https://www.palantir.com/docs/foundry/iceberg/versions)
- [Palantir, snapshots](https://www.palantir.com/docs/foundry/iceberg/snapshots)

## 관련 문서

- [[Palantir-Iceberg]]
- [[Palantir-Iceberg-Catalog-and-Transactions]]
