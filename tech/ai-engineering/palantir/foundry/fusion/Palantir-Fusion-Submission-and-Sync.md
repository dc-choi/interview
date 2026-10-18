---
tags: [palantir, foundry, fusion]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Fusion Action, validation과 dataset sync

Fusion action.* formula는 클릭 때 실행되는 button이다. 이는 Ontology Action과 자동으로 같은 계약이 아니며 Ontology에 데이터를 넣는 목적이면 별도 Actions를 검토한다. copy_range는 기본 formula를 복사하고 copy_result=true는 계산값을 복사한다. parallel은 독립 Actions를 동시에, serial은 성공/실패별 후속 Action을 실행한다.

submit_to_region은 key가 이미 있으면 row를 갱신하고 없으면 추가한다. 대상 Fusion document의 table region 및 edit access가 필요하다. source의 cell 변경이 synced dataset build에 반영되려면 사용자에게 대상 dataset Editor 이상도 필요하다. Fusion sheet 권한만으로 최신 dataset 반영을 보장하지 않는다.

Sync는 whole sheet 또는 table range 중 하나의 방식만 선택한다. table range는 한 sheet에서 여러 dataset을 만들 수 있고 sheet sync는 전체에 하나를 만든다. column type/branch/location을 설정하고 Save한다. 편집 중 finished/aborted transactions가 함께 보일 수 있다. backing sheet 교체는 기존 sync 중지와 dataset job spec 삭제 후 새 sheet를 master에 연결하는 별도 작업이다.

Validation은 click으로 실행하며 자동 데이터 무결성 제약으로 취급하지 않는다. serial 성공 branch에서 제출하도록 연결한다. column_enum은 non-null item의 허용값, column_not_null은 비어 있지 않은 row의 필수값, column_numeric은 숫자, table_headers는 header 존재, table_key는 복합키 유일성을 검사한다. column_regex는 첫 row의 header를 찾고 regex에 맞지 않는 위치 최대10개를 표시하며 header 부재/빈 regex는 message 없이 실패한다. overview의 단순 not-null 설명보다 함수 레퍼런스의 empty-row 예외를 함께 적용한다.

## 출처

- [Palantir, perform-actions](https://www.palantir.com/docs/foundry/fusion/perform-actions)
- [Palantir, sync-table-dataset](https://www.palantir.com/docs/foundry/fusion/sync-table-dataset)
- [Palantir, validate-results](https://www.palantir.com/docs/foundry/fusion/validate-results)

## 관련 문서

- [[Palantir-Fusion-Data-and-Permissions]]
- [[Palantir-Fusion-Formula-Contracts]]
