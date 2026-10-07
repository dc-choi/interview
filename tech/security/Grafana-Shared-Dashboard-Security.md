---
tags: [security, grafana, dashboard, access-control]
status: done
verified_at: 2026-10-07
category: "보안(Security)"
aliases: ["Grafana 공유 대시보드 보안", "Grafana Shared Dashboard Security"]
---

# Grafana 공유 대시보드 보안

## 일시정지와 접근 권한 폐기

공유 화면을 일시정지하는 기능과 공유 링크의 접근 토큰을 폐기하는 기능은 구분해서 확인해야 한다. 화면이 멈췄다는 사실만으로 관련 API의 접근까지 차단됐다고 판단할 수 없다.

Grafana의 CVE-2026-81841은 일시정지한 공개 대시보드의 토큰이 프런트엔드 초기화 데이터 엔드포인트에서 계속 유효했던 인가 누락이다. 해당 링크를 가진 사람은 인증 없이 데이터 소스 설정을 조회할 수 있었다. **browser access를 사용하는 데이터 소스**는 저장된 자격증명도 노출될 수 있었다. 모든 데이터 소스의 비밀 값이 노출된다고 일반화하지 않는다.

## 수정 버전과 대응

2026-09-29 공개된 공식 권고의 다음 브랜치별 수정 버전을 2026-10-07 확인했다.

| 브랜치 | 수정 버전 시작점 |
|---|---|
| 12.4 | 12.4.12 |
| 13.0 | 13.0.10 |
| 13.1 | 13.1.7 |
| 13.2 | 13.2.3 |

다른 버전은 공식 권고의 전체 범위를 확인한다. 이 표는 해당 취약점의 수정 기준이며 제품 지원 기간을 보장하지 않는다. 공식 권고는 **공유 대시보드 삭제 시 토큰이 폐기된다**고 명시한다.

운영 점검에서는 다음을 함께 확인한다.

1. 실제 실행 버전과 일시정지된 공유 대시보드의 존재 여부.
2. 공개 링크 보유자가 접근할 수 있는 초기화 데이터와 데이터 소스 설정의 범위.
3. 패치 또는 공유 삭제 후 기존 링크의 접근 차단 여부.
4. 자격증명 노출이 의심되는 경우 접근 기록과 자격증명 교체 필요성.

위 목록은 권고를 적용하기 위한 점검 기준이다. 패치 적용만으로 과거 노출 여부까지 확인된 것은 아니다.

## 출처

- [CVE-2026-81841: Paused shared dashboard access tokens still expose data source configuration — Grafana Labs](https://grafana.com/security/security-advisories/cve-2026-81841/)

## 관련 문서

- [[Access-Control-Models|접근 제어 모델]]
- [[Security-Incident-Response|보안 사고 대응]]
- [[Grafana-Alerting|Grafana 알림]]
