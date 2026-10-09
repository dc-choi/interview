---
tags: [security, incident-response, nist, recovery]
status: done
verified_at: 2026-10-06
category: "보안(Security)"
aliases: ["Security Incident Response", "보안 사고 대응", "침해사고 대응"]
---

# 보안 사고 대응

보안 사고 대응은 침해의 범위를 판단하고 확산을 억제하며 안전하게 서비스를 복구하는 활동이다. 탐지 도구뿐 아니라 책임, 기록, 복구 기준과 개선 절차가 필요하다.

## NIST의 수명주기

NIST SP 800-61 Rev. 3(2025)은 CSF 2.0의 여섯 기능에 대응을 연결한다. 준비, 탐지, 격리, 제거, 복구를 설명하는 교육용 단계 수를 NIST의 고정된 단계 수로 해석하지 않는다.

| 기능 | 대응에서의 역할 |
|---|---|
| Govern, Identify, Protect | 책임, 위험 이해와 보호 조치로 사고에 대비 |
| Detect | 이상 징후를 발견하고 분석 |
| Respond | 사고를 관리하고 분석, 소통, 차단과 제거 수행 |
| Recover | 영향을 받은 자산과 업무 복구 |

개선은 마지막 회고에만 두지 않는다. 각 활동에서 얻은 교훈을 Identify의 Improvement로 모아 다른 기능에 반영한다.

## 대응 중 남길 근거

- 발생 순서, 관련 자산, 관찰한 사실과 수행한 조치를 기록한다.
- 기록과 수집 자료의 무결성, 출처와 접근 권한을 보호한다.
- 처음 발견한 시스템 외의 잠재적 대상도 확인해 범위를 과소평가하지 않는다.
- 차단과 제거는 사고 유형, 영향과 조치 유지 기간을 고려해 선택한다.

## 복구 완료 조건

백업이 있다는 사실만으로 복구를 시작하지 않는다. 복원 자산의 침해 흔적과 손상을 확인한다. 운영 재개 전에는 복구된 자산의 무결성과 근본 원인 조치를 확인하고, 서비스 소유자와 정상 동작을 검증한다.

## 로그로 침해 흐름 재구성하기

로그는 수집한 사건의 기록이다. 모든 행동이 자동으로 남거나 공격자가 흔적을 지울 수 없다는 보장은 없다. 수집 누락, 저장 공간 부족에 따른 덮어쓰기, 변조와 삭제가 조사 범위를 제한한다.

1. **수집 범위 확인**: 인증, 단말, 네트워크와 업무 서비스의 기록을 모으고 빠진 시스템과 기간을 표시한다. 외부 접근이 가능한 직원용 서비스도 조사 범위에 넣는다.
2. **정규화와 시각 대조**: 필드 의미와 시각 형식을 맞추고 시계 동기화 상태를 확인한다. 발생 시각과 수집 시각의 차이를 사건 순서로 오인하지 않는다.
3. **상관관계 분석**: 계정, 기기와 요청 식별자로 기록을 연결한다. 같은 시간대의 낯선 로그인과 대량 조회는 조사할 단서이며 침해 확정과 구분한다.
4. **근거와 공백 보존**: 관찰한 사실, 추정한 연결, 확인하지 못한 구간을 나누고 수집 자료의 출처와 무결성을 보호한다.

SIEM(Security Information and Event Management)은 로그를 모아 검색하고 상관관계를 분석하는 데 활용한다. 분석 도구가 있어도 기록하지 않은 사건을 복원할 수는 없다. 중앙 수집, 전송과 저장 보호, 수정과 삭제 권한 통제가 함께 필요하다. 레코드 설계와 보존 원칙은 [[Audit-Log|감사 로그]]를 따른다. 이 조사 흐름은 ACSC 공동 지침과 NIST 사고 대응 지침을 연결한 실무 적용 예시다.

## XDR의 사건 묶음과 리스크 점수를 해석한다

XDR은 엔드포인트 외에 네트워크, 클라우드와 이메일 등 여러 영역의 신호를 연결해 탐지와 대응을 돕는다. 실제 수집 범위와 대응 기능은 제품 및 연결한 솔루션에 따라 확인한다. 다음은 2026-10-10 제품 공식 설명을 대조한 예시다.

- Microsoft Defender에서 alert는 악성 또는 의심스러운 사건을 나타내는 탐지 신호이고, incident는 관련 alert를 묶는 조사 단위다. 사건 안에서 원본 이벤트의 타임라인, 사용자와 장비, 조사와 대응 이력을 함께 확인할 수 있다.
- AhnLab XDR의 리스크 지수는 사용자와 자산을 중심으로 대응 우선순위를 정하는 데 쓰인다. 자산가치, 이벤트, 확률과 가중치를 함께 계산하므로 점수 80을 곧바로 침해 확률 80%로 해석하지 않는다.

이를 운영에 적용할 때는 경고 수와 사건 수를 같은 지표로 비교하지 않는다. 피싱 경고를 닫았더라도 관련 단말 실행과 다른 자산으로의 접근이 같은 사건에 남아 있는지 확인한다. 점수 하락을 평가할 때도 실제 조치, 로그 수집 범위와 분석 규칙의 변경을 함께 대조한다. 이는 제품 기능을 바탕으로 한 검토 기준이며 특정 제품의 도입 효과나 침해 부재를 입증한 수치는 아니다.

## 탐지에서 자동 차단으로 연결하기

탐지 결과와 대응 실행은 별도의 경계다. 계정, 단말과 서비스의 신호를 연결했더라도 실제 차단을 수행할 제품, 권한과 적용 범위가 있어야 한다.

Microsoft Defender XDR의 자동 공격 차단은 여러 제품의 신호를 사건 단위로 묶고, 공격에 이용되는 자산을 찾아 연결된 제품으로 대응하는 사례다. 특정 신호를 이용하려면 해당 제품이, 대응을 실행하려면 그 조치를 담당하는 제품이 배포돼 있어야 한다. 라이선스, 권한과 제품별 설정도 확인한다. 이는 공식 기능 설명이며 개별 도입 환경의 탐지 정확도나 피해 감소를 입증한 결과는 아니다.

운영 설계에서는 다음 경계를 먼저 정한다.

- 차단할 계정이나 기기, 예상되는 정상 업무 영향과 담당자
- 자동 조치를 검토하고 해제하는 경로, 자동 차단에서 제외할 중요 자산과 대체 보호 조치
- 판단의 근거가 된 원본 이벤트와 실제 수행한 조치의 이력

Defender는 자동 조치의 해제와 지원 대상 자산의 제외 설정을 제공하지만, 조치를 해제한다고 이미 생긴 업무 중단까지 없어지는 것은 아니다. 생성형 AI가 조사 설명을 보조할 때도 설명과 실행 권한을 분리한다. 외부 로그나 메일의 문장을 실행 지시로 받아들이는 위험은 [[LLM-Application-Security|LLM 애플리케이션 보안]]에서 다룬다.

## 생성형 AI로 만든 보안 리포트의 검증

CSV가 생성됐다는 사실은 수집과 필드 변환이 정확하다는 증거가 아니다. 생성된 코드와 설명은 원 API 응답에 대조하고, 누락을 정상 결과로 바꾸지 않는지 확인한다.

다음은 2026-10-07 Amazon Inspector API Reference를 대조한 검증 예시다.

- **API와 수집 범위**: 의도한 제품 API, 계정, 리전과 필터인지 확인한다. `ListFindings` 응답에 `nextToken`이 있으면 후속 페이지를 조회한다. 첫 페이지를 전체 결과로 내보내지 않는다.
- **필드 매핑**: 패키지 취약점 식별자는 `packageVulnerabilityDetails.vulnerabilityId`에서 읽는다. 네트워크 도달성 등 다른 finding에는 이 객체가 없을 수 있으므로 모든 행에 CVE가 있어야 한다고 가정하지 않는다.
- **빈 값의 의미**: 적용되지 않는 필드, 파서가 놓친 필드, API 호출 실패를 같은 `N/A`나 0건으로 합치지 않는다. 원본 finding과 출력 행을 비교하고 수집이 끝나지 않았으면 불완전한 보고서로 표시한다.

이 항목들은 API 계약을 이용한 검토 기준이다. 특정 환경에서 코드를 실행하거나 취약점을 점검했다는 기록은 아니다. 보고서의 권고 조치를 실행할 때는 대상과 변경 영향, 승인과 복구 경로를 별도로 검토한다.

## 이해 점검

1. 차단 뒤에도 다른 자산의 침해 흔적을 찾아야 하는 이유는 무엇인가?
2. 서비스가 켜진 것과 안전하게 복구된 것은 어떻게 다른가?
3. 수집이 빠진 기간이 있으면 침해 타임라인의 어느 결론을 보류해야 하는가?
4. 탐지 도구가 경고를 냈지만 차단할 수 없는 이유를 제품 연결과 권한으로 설명할 수 있는가?

## 출처

- [Microsoft Learn, Incidents and alerts in the Microsoft Defender portal](https://learn.microsoft.com/en-us/defender-xdr/incidents-overview)
- [AhnLab XDR 출시, 통합 보안의 정점을 향하다 — AhnLab](https://www.ahnlab.com/ko/contents/content-center/34045)
- [NIST, SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf)
- [ASD ACSC, Best practices for event logging and threat detection](https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-for-event-logging-and-threat-detection)
- [Microsoft Learn, Automatic attack disruption in Microsoft Defender](https://learn.microsoft.com/en-us/defender-xdr/automatic-attack-disruption)
- [Microsoft Learn, Configure automatic attack disruption in Microsoft Defender XDR](https://learn.microsoft.com/en-us/defender-xdr/configure-attack-disruption)
- [Amazon Inspector API Reference, ListFindings](https://docs.aws.amazon.com/inspector/v2/APIReference/API_ListFindings.html)
- [Amazon Inspector API Reference, Finding](https://docs.aws.amazon.com/inspector/v2/APIReference/API_Finding.html)
- [Amazon Inspector API Reference, PackageVulnerabilityDetails](https://docs.aws.amazon.com/inspector/v2/APIReference/API_PackageVulnerabilityDetails.html)

## 관련 문서

- [[Security-Policy-and-Assessment|보안 정책과 점검]]
- [[Audit-Log|감사 로그]]
- [[Incident-Runbook|장애 대응 런북]]
- [[Incident-Recovery-Prevention|복구와 재발 방지]]
