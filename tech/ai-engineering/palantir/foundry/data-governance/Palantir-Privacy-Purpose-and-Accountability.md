---
tags: [palantir, foundry, governance, privacy]
status: done
verified_at: 2026-10-16
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

## 출처

- [Palantir privacy-civil-liberties, privacy-civil-liberties](https://www.palantir.com/docs/foundry/privacy-civil-liberties)
- [Palantir privacy-civil-liberties, overview](https://www.palantir.com/docs/foundry/privacy-civil-liberties/overview)
- [Palantir privacy-civil-liberties, pcl-in-practice](https://www.palantir.com/docs/foundry/privacy-civil-liberties/pcl-in-practice)

## 관련 문서

- [[Palantir-Data-Governance]]
- [[Palantir-Security-Governance]]
