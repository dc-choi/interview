---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# OSv1에서 OSv2로 옮길 때의 가역성과 데이터 경계

OSv2는 편집을 Actions로 수행한다. OSv1 직접 편집 API 소비자는 이행 대상이다. 기존 writeback은 선택적 materialization으로 바뀌며, 모든 변경을 최신 timestamp 하나로 결정하던 방식 대신 편집 changelog와 해소 규칙을 확인한다. Funnel의 기본 증분 동작, 엄격한 지리/primary key 타입과 Decimal precision/scale도 점검한다.

## 전환 단계와 중단 조건

- 같은 객체 타입의 migration과 soak 기간 전체에서 사용자 편집이 비활성화된다. 읽기는 계속된다.
- 첫 성공 sync 이후 transition window를 계산한다. 이미 진행 중인 window는 대상이 아니며 놓치면 다음 window를 기다린다. window가 없으면 준비된 뒤 전환한다.
- schema 변경은 replacement를 일으켜 진행 중 migration 또는 soak를 중단할 수 있다. OMS 변경과 Funnel 반영 사이에는 비동기 지연이 있다.
- Soak는 전환 후 시작하며 최대 14일이다. 두 저장소를 색인하므로 비용이 늘며, 이 기간에는 OSv2로 조회하고 OSv1 전용 요청은 거절된다.
- Soak 안에서 abort하면 다시 색인하지 않고 rollback할 수 있다. 종료 후에는 OSv1 데이터가 제거되어 같은 rollback이 불가능하다. Soak 0은 이 보호 기간을 없앤다.

공식 문서에 남은 예전 화면과 본문의 제한이 다를 수 있다. 2026-10-18 이미지 확인에서 `migration6.png`는 soak 최대 20일, `migration5.png`는 전환 구간의 편집 중단을 안내한다. 그러나 2026-10-16 확보한 같은 페이지 본문은 최대 14일과 migration/soak 전체의 편집 중단을 명시한다. 화면의 수치를 현재 운영 기준으로 복사하지 말고 본문과 대상 환경을 대조한다. 사전 검사가 모두 통과한 녹색 표시와 `PIPELINE_FAILED`가 같은 화면에 나타나는 예시도 있다. 이전 가능 여부와 실제 Funnel 동기화 성공을 따로 확인해야 한다. ([본문과 공식 화면](https://www.palantir.com/docs/foundry/object-backend/osv1-osv2-migration))

## 무엇을 보존하는가

Edit history 보존은 별도 옵션이며 CPU와 저장 비용이 든다. 선택하지 않아도 최종 편집 상태는 옮기지만 이전 편집 이력과 attribution은 복구할 수 없다. 별도 Action Log의 존재와 저장소 편집 이력은 구분한다.

Writeback migration은 매핑된 컬럼을 보존하지만 매핑되지 않은 컬럼은 제거한다. writeback을 이행하지 않으면 기존 dataset을 삭제하지 않고 마지막 build 상태로 남긴다. 사용자 편집 상태 자체의 이행과 dataset 갱신 여부는 다르다.

사전 검사에서 보는 incompatible usage는 최근 30일이다. 휴면 소비자와 미래 실행을 모두 검증한 결과가 아니다. 직접 API 사용은 nonblocking 경고여도 전환 뒤 실패할 수 있다. 대량 이행은 문서에서 100개 미만 묶음을 권고한다.

문서가 명시한 일시적 제한에는 materialization 경유 schedule, custom analyzer, 특정 Rules 다중 source 구성이 있다. 지원 시점을 실제 환경에서 재확인한다.

## 출처

- [Palantir, object-storage-v2-breaking-changes](https://www.palantir.com/docs/foundry/object-backend/object-storage-v2-breaking-changes)
- [Palantir, osv1-osv2-migration](https://www.palantir.com/docs/foundry/object-backend/osv1-osv2-migration)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
