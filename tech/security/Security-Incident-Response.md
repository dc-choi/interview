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

## 이해 점검

1. 차단 뒤에도 다른 자산의 침해 흔적을 찾아야 하는 이유는 무엇인가?
2. 서비스가 켜진 것과 안전하게 복구된 것은 어떻게 다른가?

## 출처

- [NIST, SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf)

## 관련 문서

- [[Security-Policy-and-Assessment|보안 정책과 점검]]
- [[Audit-Log|감사 로그]]
- [[Incident-Runbook|장애 대응 런북]]
- [[Incident-Recovery-Prevention|복구와 재발 방지]]
