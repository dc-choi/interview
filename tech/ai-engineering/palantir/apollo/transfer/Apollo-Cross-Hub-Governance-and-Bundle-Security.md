---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Hub 간 구성 소유권과 Bundle 보안

## 가져오지 않는 권한

Hub settings/configuration, resource role grants, ownership 변경과 Team/Group membership은 다른 Hub에서 가져오지 않는다. Team을 보내도 식별자만 전송하며 target 관리자가 membership과 permissions를 정한다. imported Environment는 처음에는 어느 Team에도 권한이 주어지지 않는다.

release channel은 exportable로 지정해야 resource와 membership metadata를 전송한다. non-exportable 채널을 릴리스 선택 필터로 쓰는 것은 가능하지만 그 채널 자체가 따라가지는 않는다. target에 채널이 없으면 생성하며 기존 채널 입장은 target label 조건을 지킨다.

Kubernetes privileged namespace의 경계는 문서 간 차이가 있다. export/import guidelines는 일반 namespace로 내린 뒤 target에서 다시 privileged CR을 요구한다고 적고, 환경 import CR 문서는 privileged security context 변경을 승인 대상으로 열거한다. 어느 경우든 source의 특권 승인을 target에서 그대로 신뢰하지 않으며 실제 import CR과 target 정책을 확인한다.

## 환경 단위 승인과 config 편집 권한

환경 import는 **환경마다 CR 하나**로 해당 Bundle의 config, Entity와 Module 변경을 묶는다. 승인과 적용은 환경의 변경 집합에 대해 함께 처리하고 일부만 적용하지 않는다. 환경별 pending CR은 최대 하나이며 다음 Bundle이 도착하면 기존 pending CR을 최신 변경으로 갱신한다. 승인을 기다리는 동안 원래 검토한 diff가 바뀔 수 있다.

일반적인 trusted import는 기본 자동 승인일 수 있지만 network security/privileged namespace처럼 보안에 영향을 주는 변경은 권한 있는 검토가 필요하다. custom CEL이 최종 정책이다. import 완료 표시와 승인 대기를 구분한다.

source에서 No Connection Expected 환경을 정의해 다른 Hub로 보낼 수 있다. 실제 health와 Plan은 연결된 Hub에서 본다. 환경 config와 개별 Entity config의 editability를 downstream으로 옮기면 source 편집을 즉시 잠그고 변경 metadata Bundle이 target에 도착해야 target 편집을 연다. 그 사이 양쪽에서 수정할 수 없는 구간이 있다.

반대로 source에 돌려주려면 Bundle 생성 중지, editability 변경, target의 현재 config를 source에 보존, 생성 재개의 순서가 필요하다. source 내용을 맞추지 않고 다음 Bundle을 보내면 target에서 바꾼 민감 config를 잃을 수 있다. Hub A→B→C는 B에서 새 Pipeline을 만들어 계속 보낼 수 있다.

## 보안 보고서는 build 시점의 snapshot이다

Pipeline은 vulnerability security check를 통과한 최신 SLA scan과 active 취약점이 없는 릴리스만 export하도록 제한할 수 있다. security report를 포함하려면 Vulnerability Scan Report resource를 선택한다. exclusionList면 report가 제외 목록에 없어야 하고 inclusionList면 포함 목록에 있어야 한다.

보고서는 바이러스, unsuppressed overdue 취약점, 누락/실패 scan을 구분한다. **Bundle 안의 보고서는 정적**이므로 suppression, rescan 또는 수정 release 후에도 기존 보고서는 바뀌지 않는다. 새 Bundle을 build해 반영한다. 검사받지 않은 개별 artifact를 보낼 때는 Product Release에 속해 scanner 대상으로 식별되는지 확인한다.

incremental Pipeline에서 보안 문제로 이전 Bundle을 보내지 않았다면 다음 Bundle이 이전의 나머지 안전한 release까지 자동 재포함한다고 가정하지 않는다. 필요한 누락분을 emergency Pipeline으로 선택해 전달하거나 명시적으로 생략한다. true malware는 수정 release와 이전 recall이 필요하고 false positive suppression도 승인/scan/build를 거친다. CVE-only recalled target을 이용한 위험 감소 예외는 해당 기능과 Pipeline 설정을 별도로 켰을 때만 적용한다.

## 출처

- [Palantir, bundle-security](https://www.palantir.com/docs/apollo/export-import/bundle-security) — 정적 Bundle scan report와 재build, incremental 누락분.
- [Palantir, change-requests-on-environment-import](https://www.palantir.com/docs/apollo/export-import/change-requests-on-environment-import) — 환경별 원자적 CR, pending CR 최신화와 민감 변경 승인.
- [Palantir, exporting-environments](https://www.palantir.com/docs/apollo/export-import/exporting-environments) — config 편집 소유권 이동과 downstream 변경 보존.
- [Palantir, guidelines-for-export-and-import](https://www.palantir.com/docs/apollo/export-import/guidelines-for-export-and-import) — 권한/membership 미전송, exportable 채널과 target 승인.

## 관련 문서

- [[Apollo-Bundles-and-Incremental-Transfer]]
- [[Apollo-CEL-Approval-Policies]]
- [[Apollo-Vulnerability-Scanning-and-Remediation]]
