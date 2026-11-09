---
tags: [palantir, foundry, governance, privacy]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["프라이버시의 목적, 최소화와 책임"]
---

# 프라이버시의 목적, 최소화와 책임

기술 통제는 기관의 적법성, 필요성, 비례성 판단을 대신하지 않는다. Palantir PCL 문서는 제품 기능을 조직의 정책과 책임에 연결하는 설명이며 법률 준수의 보증이 아니다.

## 목적과 데이터의 필요성

수집 전에 처리 목적, 필요한 field, 허용할 이용자와 보존 기간을 정하고 목적이 바뀌면 다시 검토한다. Sensitive Data Scanner는 민감정보 후보를 찾고 marking과 role은 접근을 제한하며 Cipher는 직접 식별자 노출을 줄일 수 있다. 탐지, 제한과 난독화가 해당 데이터의 수집 필요성을 결정해 주지는 않는다.

Hashing이나 encryption을 거친 값도 다른 field와 결합하거나 원본과 연결하면 개인을 식별할 수 있다. 변환된 값을 자동으로 익명정보로 분류하지 않고 재식별 가능성과 원본에 연결하는 권한을 함께 관리한다.

## 승인과 사람의 판단

Project role은 업무의 책임, marking은 데이터 eligibility를 표현한다. 애플리케이션 Viewer가 underlying resource 전체를 볼 수 있어야 한다는 뜻은 아니다. Approvals와 Checkpoints는 목적, 검토와 justification을 연결하지만 한 번의 승인이 새 recipient, field와 미래의 다른 사용을 허용하지는 않는다.

AI가 action을 제안한다면 실행 전에 검토할 지점, 판단 근거와 결정권자를 정한다. 승인 화면이 있다는 사실만으로 실질적인 감독이 생기지 않는다. 검토자는 결과를 바꿀 정보, 권한과 시간이 있어야 한다.

## 기록과 수명

Audit, checkpoint와 approval record는 조사 근거다. 조직은 무엇을 누가 얼마나 자주 검토하고 위반에 어떻게 대응할지 정해야 한다. 기록 자체가 책임의 이행을 보장하지 않으며 감시에 필요한 범위를 넘는 정보 보존도 줄인다.

보존 정책은 raw/derived copy와 법적으로 남겨야 하는 record를 함께 고려한다. Data Lifetime의 lineage-aware 기능과 Compass의 resource lifecycle은 별도 운영 절차와 결과 확인이 필요하다. 이 세 출처의 외부 white paper와 연결 문서 전체까지 읽었다는 의미는 아니다.

## 원칙별 적용 시점과 실패 모습

2026-11-09 대조한 pcl-in-practice 본문은 원칙마다 Foundry 업무 예시를 든다. 최소화, 목적 제한, 사람의 감독과 보존은 목적과 요구사항을 데이터 ingest, 공유, action 적용이나 작업 시작 전에 정하라고 하고, 프라이버시 강화 변환은 초기에 검토하라고 한다. 최소화, 목적 제한과 보존은 workflow나 목적이 바뀔 때 다시 검토하며, 접근 거버넌스와 책임은 책임이 바뀔 때나 정해진 주기에 다시 검토한다. 아래 시점 열은 원문의 표현만 옮겼고, 마지막 열은 해당 통제가 없을 때 원문이 드는 가능한 위험이다.

| 원칙 | 원문이 말하는 시점 | 예시의 통제 | 통제가 없을 때 |
| --- | --- | --- | --- |
| 비례성과 최소화 | ingest 전, workflow나 목적이 바뀔 때 | 설비 정비 예측에서 Sensitive Data Scanner로 민감 field를 찾아 기사 연락처를 빼고, match action으로 raw dataset에 marking을 붙인다. 반복 정비 패턴이 필요하면 기사 식별자를 Cipher로 일관된 hash 값으로 바꾼다 | 예측에 쓰지 않는 연락처가 모델, 애플리케이션과 downstream dataset으로 복제될 수 있다 |
| 목적 제한 | 접근 부여와 공유 전, 목적이 끝나거나 바뀔 때 | 공급사 데이터 export를 예측에 필요한 field로 줄이고 설정 권한을 project permission으로 제한한다. 접근 요청은 Approvals로 보내고, Workshop에서 상세 export 시 checkpoint로 업무 사유를 받는다 | 기존 export에 관련 없는 field와 recipient가 재검토 없이 붙을 수 있다 |
| 접근 거버넌스 | 책임이 바뀔 때 접근 재검토 | 시설 앱에서 계약 resource에 marking, 빌더와 Viewer를 project role로 나누고 소유자를 Compass에 기록한다 | 하위 resource에 별도 통제가 없으면 앱 접근만으로 상세 계약 조건이 모든 Viewer에게 노출될 수 있다 |
| 프라이버시 강화 변환 | 초기에(early) 검토 | 고객 지원 분석에서 계정 식별자를 일관된 hash로 바꾸고 원본은 제한 project에 남긴다 | 직접 식별자가 파생 분석과 export로 퍼질 수 있다 |
| 사람의 감독 | action 적용 전 | AIP Logic 함수의 정비 일정 변경 제안을 Automate가 바로 적용하지 않고 검토용 proposal로 stage한다. 담당자가 근거와 Agent decision log를 보고 승인하거나 거절한다. 수동 변경에는 checkpoint로 사유를 받는다 | 틀리거나 근거가 약한 제안이 자동으로 정비 업무를 바꿔 운영을 방해할 수 있다 |
| 책임 | 정해진 주기의 검토(시작 시점은 원문에 없음) | 계약 앱의 export와 action submission에 checkpoint 사유를 남기고, 권한 변경과 object export를 정해진 주기로 Audit Explorer에서 검토한다 | 소유자와 검토 절차가 없으면 기록이 있어도 부적절한 권한 변경이나 export를 놓칠 수 있다 |
| 보존과 삭제 | 작업 시작 전, 목적이 바뀔 때 | 한시 보증 조사 project에서 raw와 derived data의 보존 기간을 먼저 정하고 다른 보존 기간이 필요한 record를 분리한다. Data Lifetime이 lineage를 따라 삭제 정책을 적용한다 | 조사가 끝난 뒤에도 임시 raw와 파생 dataset이 남을 수 있다 |

- **일관된 hash의 조건:** 같은 식별자가 같은 값으로 바뀌어 묶음 분석은 가능하다. 변환된 dataset의 접근은 계속 관리하고, 예시처럼 원본을 제한 project에 남기거나 재연결 절차가 있으면 그 절차의 접근도 함께 관리한다. 다른 field로 신원이 드러나는지도 따로 평가한다.
- **감사 기록의 감사:** Audit Explorer는 검토자의 검색 자체도 기록해 감사 데이터 사용도 감사 대상이 된다. 또한 책임 절차가 요구하는 범위를 넘는 감시 데이터 수집과 보존은 줄인다.

## 출처

- [Palantir privacy-civil-liberties, privacy-civil-liberties](https://www.palantir.com/docs/foundry/privacy-civil-liberties)
- [Palantir privacy-civil-liberties, overview](https://www.palantir.com/docs/foundry/privacy-civil-liberties/overview)
- [Palantir privacy-civil-liberties, pcl-in-practice](https://www.palantir.com/docs/foundry/privacy-civil-liberties/pcl-in-practice) — 2026-11-09 원칙별 예시를 포함한 본문 전체 대조

## 관련 문서

- [[Palantir-Data-Governance]]
- [[Palantir-Security-Governance]]
