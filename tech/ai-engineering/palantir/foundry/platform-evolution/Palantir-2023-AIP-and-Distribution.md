---
tags: [palantir, foundry, releases]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 2023 AIP와 Marketplace 도입의 범위

2023년 AIP와 Marketplace 발표는 플랫폼 확장의 방향을 보여주지만 현재 제품의 보안/지원 계약을 대신하지 않는다. 공식 release 본문의 설명과 공개 계획을 구분한다.

## AIP 기능별 맥락

6월 AIP Assist sidebar beta는 사용 중인 Foundry 앱과 대화 맥락을 활용하되 조직 데이터에는 접근하지 않는 문서 기반 도움말로 소개됐다. 같은 시기 Notepad 텍스트 수정과 Quiver 분석 생성/설정 보조는 별도 제품 기능이다. Sidebar 발표의 데이터 접근 설명을 모든 AIP 기능에 적용하지 않는다.

Quiver는 다음 동작 제안, prompt completion과 비동기 생성 UX를 추가했다. 9월 Pipeline Builder AIP Generate는 생성된 변환을 읽고 검토할 수 있는 형태로 제공한다고 설명한다. 생성 결과가 정확하다는 보장은 없으므로 입력 schema, join cardinality와 output을 검증한다.

10월 OSDK의 AIP Logic-backed function 지원은 사용자 입력과 model 호출부터 시작했고 추가 tool 호출은 향후 계획이었다. 12월 AIP 설정을 customer-only model access group 관리로 확대한 기록도 enrollment/배포 시점과 함께 읽는다. 현재의 agent tool 기능은 최신 해당 문서가 근거다.

## SDK, 모델과 배포 패키지

2023년에는 Python OSDK import module 변경, aggregation 지원, unsupported function 문서 제거와 snake_case 정비가 이어졌다. TypeScript OSDK query의 2D/3D aggregation 반환 지원도 추가됐다. SDK generator가 recalled되면 새 버전에 선택하지 못하도록 표시했다. 과거 예제보다 실제 생성 SDK와 generator 버전이 호환성 기준이다.

모델은 no-code open-source language model import, model training template, sandbox 제출과 multi-input/output live deployment를 확장했다. Inference History는 live deployment에 보낸 입력/출력을 기록하는 dataset으로 소개됐다. 모델 자체 성능이나 모든 경로의 로그 완전성을 이 기능만으로 보장하지 않는다.

10월 Marketplace GA는 product 검색, input mapping과 설치 위치 선택, 유지보수 시간대/채널별 자동 upgrade를 결합한다. 같은 product를 서로 다른 부서 데이터나 preproduction/production에 설치할 수 있다. Product 설치 권한, 실제 source 접근과 parameter mapping은 별도로 검증한다.

발표의 Foundry DevOps GA와 중앙 Marketplace 유료 유통은 2024년 예정 사항이었다. 2023년 발표만으로 출시 완료를 판단하지 않는다. 고객 사례의 개발/운영 분리도 모든 설치에 자동으로 같은 경계가 적용된다는 뜻은 아니다.

## 출처를 해석할 때

Release 제목과 description이 서로 다른 작업을 가리키는 항목이 있다. 예를 들어 favicon 제목 아래 query 조건 실행 수정이 설명돼 있다. 재사용할 때 본문의 구체적인 동작을 우선하고 제목만으로 새 기능을 추론하지 않는다. 본문에 남은 작성 지침/초안 문구와 이메일 안내는 제품 사양이 아니다.

Version string, 성능 개선 비율과 GA 발표는 해당 시점의 공급자 설명이다. 사용자 환경에서의 benchmark, runtime 확인과 구분한다. 작은 UI 수정도 탐색/복구/표시 문제의 이력으로 읽되 전부 새로운 보안 보장으로 승격하지 않는다.

## 출처

- [Palantir, 2023 release notes](https://www.palantir.com/docs/foundry/release-notes/2023)
- [Palantir, 2023 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2023)

## 관련 문서

- [[Palantir-Platform-Evolution-2023]]
- [[Palantir-Foundry]]
