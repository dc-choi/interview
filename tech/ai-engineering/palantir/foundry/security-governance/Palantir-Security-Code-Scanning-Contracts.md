---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry code scanning의 규칙과 검증 범위"]
---

# Foundry code scanning의 규칙과 검증 범위

Code scanning은 Jemma CI의 static analysis이며 runtime 보안 검증을 대신하지 않는다. Scan이 실행되었는지, 어떤 rule을 썼는지와 finding이 checks를 막는지를 별도로 확인한다.

## 적용 범위와 우선순위

활성화된 repository의 commit마다 checks 전에 scan한다. Repository override가 Project override보다 우선하고, Project override는 enrollment default보다 우선한다. Enrollment가 off여도 Always scan repository면 실행되고 Project Never scan보다 우선할 수 있다.

Error mode는 finding이 있으면 checks를 실패시킨다. Warn mode는 checks를 계속한다. Checks 통과만으로 finding이 없었다고 결론 내리지 않는다. Report를 조회하거나 JSON으로 받아 적용 규칙과 결과를 확인한다.

성공한 scan도 분석 범위가 불완전할 수 있다. 공식 예시 화면은 Git 추적 파일 40개와 규칙 591개를 표시하지만, 실행 요약에는 13개 파일에 규칙 82개를 적용했고 일부 파일은 건너뛰거나 부분 분석했다고 나온다. Finding 0건과 함께 실제 분석 파일, 적용 규칙과 제외 사유를 읽는다. (2026-10-18 [공식 scan report 화면](https://www.palantir.com/docs/resources/foundry/security/code-scan-checks.png) 확인)

## Built-in과 custom rule

Built-in은 enable/disable/duplicate/download, custom은 추가로 edit/delete가 가능하다. Built-in을 수정하려면 duplicate한 custom과 원본의 상태를 함께 관리한다. 복사본은 원본 rule 업데이트와 연결되지 않는다.

Rule은 enrollment 전체에 적용되지만 scan이 켜진 repo에서만 finding을 만든다. Disable은 다음 scan부터 적용하며 이전 완료 scan의 finding을 지우지 않는다. 새 custom은 저장 즉시 활성화되어 다음 scan에 포함된다.

Custom 정의는 Semgrep 형식의 rule 정확히 하나와 유효한 ID가 필요하다. ID는 문자/숫자/period/underscore/hyphen이며 custom끼리 unique여야 한다. Built-in과 같은 이름을 허용하므로 이름만으로 어느 정의가 적용되었는지 판단하지 않는다.

모든 rule을 끄면 scan은 성공하고 finding은 없을 수 있다. Syntax validation, scan completion, no finding과 실제 취약점 부재는 다른 주장이다. Enrolment rule 변경의 파급 범위를 확인하고 실제 scan 실행을 별도로 검증한다.

## 출처

- [Palantir Security, code-scanning-overview](https://www.palantir.com/docs/foundry/security/code-scanning-overview)
- [Palantir Security, enable-code-scanning](https://www.palantir.com/docs/foundry/security/enable-code-scanning)
- [Palantir Security, manage-code-scanning-rules](https://www.palantir.com/docs/foundry/security/manage-code-scanning-rules)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation|Foundry 접근 제어의 전파와 읽기 경계]]
- [[Palantir-Security-Projects-Roles-and-Collaboration|Foundry Project, role과 조직 경계]]
- [[Palantir-Security-Audit-Schema-and-Delivery|Foundry audit schema, 전달과 증거 해석]]
- [[Palantir-Security-Privacy-Downloads-and-Justification|Foundry 데이터 최소화, 다운로드와 정당화]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility|Foundry identity, 복구와 공동 책임]]
