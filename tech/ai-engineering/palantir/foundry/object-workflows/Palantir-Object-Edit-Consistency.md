---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체 편집의 일관성과 충돌 해결

Action 편집은 Funnel queue offset을 통해 live index에 반영되고 별도 dataset에 영속화된다. 문서는 modification 전송 뒤의 object read가 편집을 포함한다고 설명한다. 이것을 UI가 먼저 읽은 버전과 서버가 읽은 버전의 일치로 확대하지 않는다. Frontend apply 요청은 로드한 버전을 함께 보내지 않으며 서버는 다른 버전을 읽을 수 있다.

OSv1은 읽은 객체 버전을 캐시하고 변경 시 StaleObject로 거절한다. OSv2는 한 apply 동안 같은 버전을 읽지만 편집 생성에 직접 사용한 버전을 edited object version과 비교한다. 편집 생성 외 validation/side-effect read의 모든 동시 변경까지 보장하지 않는다. Cross-backend는 OSv1 read/edit 전체와 OSv2 edited object를 검사한다.

## 원천 데이터와 사용자 편집

기본 전략에서는 편집한 속성에 user edit가 이긴다. 원천 행이 사라져 보이지 않다가 다시 나타나면 이전 property edit가 적용될 수 있다. Action delete는 원천 값과 무관하게 객체를 숨기며, 다시 create하면 이전 편집 값을 상속하지 않는다. 사용자가 create한 객체는 원천 행이 사라져도 남는다. 단일 edit를 직접 undo하는 API 대신 보정 Action을 적용하거나 전체 drop edits migration을 쓴다.

OSv2의 Apply most recent value는 datasource마다 설정한다. UTC timestamp column과 edit timestamp를 비교하며 date는 안 된다. 같은 시간이거나 원천이 더 최신이면 edit를 무시하고 원천 timestamp가 null이면 edit를 적용한다. 설정 변경 전 기존 edit는 원래 edit 시각이 아니라 전략 변경 시각을 기준으로 조건부 적용된다. Edit-only property는 항상 edit를 적용하고, 사용자가 timestamp 속성을 수정해도 비교에는 원천 timestamp만 사용한다.

새 원천 transaction 또는 편집이 있는 경우 기본 6시간 주기로 merged dataset에 영속화한다. 이 주기를 live 조회 반영 지연으로 해석하지 않는다. 일반 stream-backed type의 edit 미지원과 direct datasource의 beta 지원을 구분한다.

## 출처

- [Palantir, object-edits](https://www.palantir.com/docs/foundry/object-edits)
- [Palantir, how-edits-applied](https://www.palantir.com/docs/foundry/object-edits/how-edits-applied)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-edits/overview)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
