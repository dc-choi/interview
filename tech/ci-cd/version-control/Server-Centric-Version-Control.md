---
tags: [cicd, version-control, monorepo, scaling]
status: done
verified_at: 2026-10-16
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Server-centric Version Control", "서버 중심 버전 관리", "Scion"]
---

# 서버 중심 버전 관리

대규모 모노레포에서 이력 조회와 체크아웃을 반복하는 비용이 병목이면, 전체 저장소를 각 작업에 복제하는 방식과 서버 API로 필요한 데이터만 가져오는 방식을 비교한다. 클라이언트의 오프라인 자율성과 중앙 서비스 의존성은 교환 관계다.

## Scion 사례의 전제

Anthropic의 2026-10-13 발표(10-15 갱신)를 10-16에 대조했다. 하루 병합이 5월 약 2,500건에서 9월 30,000건 이상으로 늘고 CI 체크아웃이 하루 약 2,500만 회에 이른 특수 부하에서, 5개월에 걸쳐 사내 모노레포를 Git에서 Scion으로 옮겼다는 보고다.

일반 Git 사용을 부정하는 사례가 아니다. 발표도 대부분 저장소에는 Git의 분산/오프라인 설계가 적합하다고 구분한다.

## 반복 복제 대신 필요한 연산을 서비스한다

- 서버가 커밋, 병합, 리베이스와 이력 질의를 처리하고 클라이언트는 제한된 캐시와 작업 파일을 유지한다.
- 변경 집합과 내용 주소 기반 데이터로 불변 객체를 공유하고, 이력 검색용 파생 데이터를 별도로 계산한다.
- 파일이 필요하지 않은 CI 작업은 API만 사용하고, 필요한 경우 sparse 또는 지연 materialization으로 읽는 범위를 줄인다.
- 계층별 캐시가 장애 시 상위 저장소로 한꺼번에 몰리지 않도록 실패 영역을 구분한다.

CPU와 메모리 요구량이 이전 Git 미러 인프라의 1/200로 줄었다는 수치는 자체 운영 비교다. 같은 이득을 다른 저장소에 적용하거나 직접 재현했다고 보지 않는다.

## 선택 기준

먼저 checkout 횟수, 저장소 크기와 작업별 필요 범위를 측정한다. 기존 Git의 partial/shallow clone, sparse checkout과 캐시로 해소 가능한지도 본다. 중앙 서비스로 옮기면 가용성, IAM, 복구, 외부 협업과 이력 내보내기가 설계 비용에 추가된다.

## 출처

- [Redesigning source control at Anthropic — Anthropic Engineering](https://www.anthropic.com/engineering/redesigning-source-control)

## 관련 문서

- [[Version-Control-Tooling|버전 관리 도구 선택]]
- [[Monorepo-CICD|모노레포 CI/CD]]
- [[Open-Source-License-Review|호스팅과 라이선스의 경계]]
