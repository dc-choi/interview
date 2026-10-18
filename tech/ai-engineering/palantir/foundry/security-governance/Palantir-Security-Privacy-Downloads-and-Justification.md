---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 데이터 최소화, 다운로드와 정당화"]
---

# Foundry 데이터 최소화, 다운로드와 정당화

민감한 데이터를 처리할 때는 적법한 목적, 필요한 데이터, 허용한 사람과 보존 기간을 먼저 정의한다. 제품 보안 기능을 활성화했다는 사실만으로 목적 제한이나 모든 관할권의 준수를 충족했다고 판단하지 않는다.

## Governance와 최소화

Data protection은 필요한 처리와 노출을 줄이는 수단이고 data governance는 ingest부터 삭제까지의 책임과 lifecycle 관리다. FIPPs의 collection/use limitation, purpose, quality, transparency, participation과 accountability를 실제 workflow에 연결한다.

민감성은 직접 식별자뿐 아니라 위치, 날짜와 결합으로 재식별되는 정보, health/financial context와 조직 정책에도 달려 있다. 법령의 예시를 단일 field allowlist/denylist로 만들지 않는다. 데이터 소유자와 privacy/security/compliance 책임을 명확히 하고, 사용 목적이 달라지면 검토 범위도 바꾼다.

불필요한 row/column을 downstream에 보내지 않고, Cipher 등의 obfuscation을 사용하는 경우 복호화 권한과 실제로 밖에 나가는 표현을 확인한다. Hashing만으로 모든 재식별 위험이 사라지는 것은 아니다. Retention과 deletion은 ingestion 전에 설계하며 irrevocable 단계와 필요한 보존 요구를 구분한다.

## Download control의 한계

UI download/export 외에도 external call, automated export, webhook, clipboard, screenshot과 print로 데이터가 옮겨질 수 있다. Download role 하나를 제거해 모든 데이터 반출을 막았다고 주장하지 않는다.

Default Viewer/Editor/Owner는 download를 허용하며 Discoverer는 일반적으로 data view/download를 포함하지 않는다. Custom role에서 download operation을 제거하는 enforcement는 enrollment 설정에 따라 달라질 수 있어 실제 정책을 확인해야 한다. 단순 read 권한만으로 download가 가능한 환경도 설명된다.

Download 제어를 분리한 enrollment에서는 resource Owner도 underlying file을 읽는 workflow에 별도 exporter operation이 필요할 수 있다. Static dataset의 Marketplace packaging도 이 범위에 포함된다. 제품별 workflow와 Control Panel의 SAML metadata 같은 예외도 구분한다.

## Checkpoint와 audit

Checkpoint는 지원된 sensitive action 전에 acknowledgement/justification을 요구해 의도와 책임을 남긴다. 모든 download/action을 포괄하지 않으며 justification 제출을 독립 승인이나 기술적 downstream propagation으로 해석하지 않는다.

실제 해당 type을 선택해 preview, trigger와 기록 조회를 확인하는 절차가 있다. 감사 기록에 justification과 행위 결과를 연결할 수 있어야 한다. Cipher는 데이터값 보호, role은 작업 허용, checkpoint는 정당화, audit는 사후 설명이라는 서로 다른 역할을 갖는다.

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
