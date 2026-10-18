---
tags: [palantir, aip, logic]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Logic staged writes와 자동화 전환

## 임시 쓰기와 승인 대기

Staged writes는 nested function/action의 편집을 임시 저장하고 같은 실행의 후속 읽기에 보이게 하는 실행 방식이다. 실행 완료 때 반영하며 사람 승인 대기 자체를 의미하지 않는다. 검증일에는 beta이고 새 Logic의 기본 활성화는 예정으로 안내돼 있다.

Legacy에서는 편집 이후 keyword/relative-time filter를 쓸 수 없는 제약이 있지만 staged mode는 이를 지원한다. Nested 편집도 가능하다. 외부 system side effect까지 같은 임시 저장과 rollback이 보장된다고 확대하지 않는다.

## 반환 계약과 major version

Legacy 편집 함수는 Ontology edits 목록을 반환하지만 staged 함수는 별도 값을 반환할 수 있다. 편집 목록을 반환하던 함수에서 mode를 바꾸면 출력 타입이 달라져 major version이 올라간다. 편집 목록이 아닌 타입이면 mode toggle만으로 major가 바뀌지는 않는다. 실제 auto-upgrade 범위도 확인한다.

Create action은 입력을 Action parameter에 연결하는 편의 기능이며 staged mode를 켜는 기능은 아니다. Mode는 Execution mode settings의 별도 toggle로 제어한다.

## Automate 소비자 전환

Staged 함수는 Automate의 Logic effect에 직접 넣을 수 없고 Action type으로 감싸 Action effect로 호출한다. Legacy major version을 쓰던 자동화는 계속 그 버전에서 실행된다. Auto upgrade to compatible versions는 major를 넘지 않는다. Staged major를 Logic effect에 넣으면 저장이 차단된다.

전환 절차는 mode 활성화/publish, Action 생성/검토, 자동화의 Logic effect를 Action effect로 교체, parameter와 retry/fallback 검증, 저장이다. 이 설정 변경만으로 실제 업무 데이터를 실행할 필요는 없다.

## Proposal 운영

Automate에서 Action을 즉시 적용하거나 proposal로 stage해 사람이 검토하도록 설정할 수 있다. Proposal 수락이 실제 실행을 발생시킨다. 기존 통합 안내에는 open proposal이 생성자에게만 24시간 보인다는 제한이 있으므로 장기/다인 승인함으로 설계하기 전에 실제 제공 범위를 확인한다.

Create Automation이 없으면 Ontology edit 출력과 해당 mode를, summary의 condition이 없으면 object input을 확인한다. 이 legacy UI 진단을 staged 함수의 현재 연결 방법과 혼용하지 않는다.

## 출처

- [Palantir Foundry, aip-logic-integration-automate](https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate/)
- [Palantir Foundry, staged-writes](https://www.palantir.com/docs/foundry/logic/staged-writes/)

## 관련 문서

- [[Palantir-Foundry-Logic]]
- [[Palantir-AIP-Logic-and-Evaluation]]
