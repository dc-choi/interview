---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-11-13
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 데이터 최소화, 다운로드와 정당화"]
---

# Foundry 데이터 최소화, 다운로드와 정당화

민감한 데이터를 처리할 때는 적법한 목적, 필요한 데이터, 허용한 사람과 보존 기간을 먼저 정의한다. 제품 보안 기능을 활성화했다는 사실만으로 목적 제한이나 모든 관할권의 준수를 충족했다고 판단하지 않는다.

## Governance와 최소화

Data protection은 필요한 처리와 노출을 줄이는 수단이고 data governance는 ingest부터 삭제까지의 책임과 lifecycle 관리다. FIPPs의 collection/use limitation, purpose, quality, transparency, participation과 accountability를 실제 workflow에 연결한다.

민감성은 직접 식별자뿐 아니라 위치, 날짜와 결합으로 재식별되는 정보, health/financial context와 조직 정책에도 달려 있다. 법령의 예시를 단일 field allowlist/denylist로 만들지 않는다. 데이터 소유자와 privacy/security/compliance 책임을 명확히 하고, 사용 목적이 달라지면 검토 범위도 바꾼다.

## 처리 시작 전 거버넌스 점검

2026-11-13 수집한 공식 문서 기준, 데이터를 Foundry에서 처리하기 전에 다음을 조직 안에서 먼저 확인하도록 권장한다. 이 목록은 법적 요구사항의 전체 목록이 아니며 관할권과 산업별 요건은 법무나 privacy 전문가가 판단한다.

- **책임 주체:** 데이터 거버넌스와 보호 질문을 판단할 위원회, 담당 전문가나 거버넌스 리드를 정한다. 공식 조직일 필요는 없다. 데이터를 적절히 다룰 책임은 보통 데이터 소유자에게 있고, audit log와 retention 같은 시스템 전체 요구사항은 DPO, 정보보안, 컴플라이언스나 법무 조직이 정의하는 경우가 많다.
- **사전 문서:** 산업, 관할권과 조직 요건에 따라 Privacy Threshold Assessment, 개인정보 영향평가(PIA/DPIA), 적합성 평가, 처리활동 기록(RoPA), System of Records Notice(SORN, 미국 Privacy Act에 따라 연방기관이 게시하는 문서) 같은 문서가 처리 시작 전에 필요할 수 있다. 민감 데이터를 다루는 새 project는 내부 표준 절차부터 확인한다.
- **법무와 컴플라이언스의 조기 참여:** 민감 데이터 처리를 시작하는 데 필요한 문서를 함께 정하고, 플랫폼 사용 범위를 초기에 공유한다.
- **보존 요건:** retention 요구사항은 가능하면 데이터 ingest 전에 정한다. 계약이나 규제상 보존해야 하는 데이터도 있으므로 삭제 시점과 eligibility 검토를 함께 설계한다. Lineage를 따라 삭제일을 전파하는 정책은 [[Palantir-Lineage-Aware-Deletion-Policies|Data Lifetime]]을 따른다.

조직이 원하면 Palantir의 Privacy and Civil Liberties 팀에 정책과 실무를 연결하는 추가 지침을 요청할 수 있다. 원칙별 적용 예시는 [[Palantir-Privacy-Purpose-and-Accountability|목적 제한과 책임]]에 정리했다.

## 최소화와 보존

불필요한 row/column을 downstream에 보내지 않고, Cipher 등의 obfuscation을 사용하는 경우 복호화 권한과 실제로 밖에 나가는 표현을 확인한다. Hashing만으로 모든 재식별 위험이 사라지는 것은 아니다. 보존 요건은 위 처리 시작 전 점검을 따른다.

## Download control의 한계

UI download/export 외에도 external call, automated export, webhook, clipboard, screenshot과 print로 데이터가 옮겨질 수 있다. Download role 하나를 제거해 모든 데이터 반출을 막았다고 주장하지 않는다.

Default Viewer/Editor/Owner는 download를 허용하며 Discoverer는 일반적으로 data view/download를 포함하지 않는다. Custom role에서 download operation을 제거하는 enforcement는 enrollment 설정에 따라 달라질 수 있어 실제 정책을 확인해야 한다. 단순 read 권한만으로 download가 가능한 환경도 설명된다.

Download 제어를 분리한 enrollment에서는 resource Owner도 underlying file을 읽는 workflow에 별도 exporter operation이 필요할 수 있다. Static dataset의 Marketplace packaging도 이 범위에 포함된다. 제품별 workflow와 Control Panel의 SAML metadata 같은 예외도 구분한다.

## Checkpoint와 audit

Checkpoint는 지원된 sensitive action 전에 acknowledgement/justification을 요구해 의도와 책임을 남긴다. 모든 download/action을 포괄하지 않으며 justification 제출을 독립 승인이나 기술적 downstream propagation으로 해석하지 않는다.

실제 해당 type을 선택해 preview, trigger와 기록 조회를 확인하는 절차가 있다. 감사 기록에 justification과 행위 결과를 연결할 수 있어야 한다. Cipher는 데이터값 보호, role은 작업 허용, checkpoint는 정당화, audit는 사후 설명이라는 서로 다른 역할을 갖는다.

공식 문서는 거버넌스 팀이 Audit Explorer로 `audit.3` 로그를 검색해 데이터가 승인된 목적에만 쓰였는지 조사할 수 있다고 설명한다. Audit Explorer는 beta이며 enrollment에 따라 쓸 수 없을 수 있다. 검색 자체도 감사 로그로 남아 검토자의 감사 데이터 사용도 감사 대상이 되지만, 이 기록은 검색 조건을 남길 뿐 조회 결과나 열람한 로그 내용까지 남기지는 않는다. 권한과 결과 해석은 [[Palantir-Security-Audit-Schema-and-Delivery|audit schema와 Audit Explorer]]를 따른다.

## 외부 산출물

다운로드된 Cipher-encrypted 값은 encrypted 표현으로 나가지만 metadata 등 모든 다운로드 정보를 Cipher로 보호할 수 있는 것은 아니다. 외부 산출물의 access/retention과 downstream 사용은 별도로 관리한다. 이 문서는 실제 export, 암호화/복호화와 외부 발송을 수행하지 않았다.

## 출처

- [Palantir Security, data-protection-and-governance](https://www.palantir.com/docs/foundry/security/data-protection-and-governance)
- [Palantir Security, download-controls](https://www.palantir.com/docs/foundry/security/download-controls)
- [Palantir Security, requesting-justification-for-sensitive-actions](https://www.palantir.com/docs/foundry/security/requesting-justification-for-sensitive-actions)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation|Foundry 접근 제어의 전파와 읽기 경계]]
- [[Palantir-Security-Projects-Roles-and-Collaboration|Foundry Project, role과 조직 경계]]
- [[Palantir-Security-Audit-Schema-and-Delivery|Foundry audit schema, 전달과 증거 해석]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility|Foundry identity, 복구와 공동 책임]]
- [[Palantir-Security-Code-Scanning-Contracts|Foundry code scanning의 규칙과 검증 범위]]
