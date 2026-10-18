---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 지원 증거 수집과 Issue 접근

## 재현 가능한 증거

기대한 동작, 실제 결과와 최소 재현 단계를 분리한다. 재현에 필요한 코드/입력/설정은 빠짐없이 포함하되 독점 데이터가 없어도 재현되는 예제를 우선한다. 최근 정상 시점 이후 변경, 알려진 장애와 maintenance, Data Lineage의 권한/빌드/스케줄을 먼저 비교한다.

errorID/errorInstanceID와 응답 header의 x-b3-traceid는 지원팀의 서버 로그 연결에 쓰인다. Console은 화면 오류를, Network는 실제 요청/응답과 HTTP status를 조사한다. 재현 직전 로그를 지우고 마지막 단계만 실행하면 관련 요청을 좁히기 쉽다. Network recording이 켜져 있는지도 확인한다.

Copy as cURL에는 토큰과 데이터가 포함될 수 있다. 토큰, bearer 값과 민감 내용을 제거한 뒤 안전한 지원 경로로 전달한다. Elements는 표시된 DOM을 조사하는 보조 수단이다. 화면 오류 하나만으로 서버 원인을 확정하지 않는다.

## HTTP status의 조사 단서

400은 요청 형식/크기, 401은 인증, 403은 접근 권한, 404는 주소/자원 존재를 확인할 단서다. 500은 서비스 내부 실패, 502는 gateway의 upstream 응답, 503은 가용성/부하, 504는 upstream 응답 지연을 조사한다. 코드만으로 실제 원인이나 복구 가능성을 단정하지 않는다.

## Issue의 가시성과 배정

Issues는 질문/장애/데이터 요청을 추적하며 우선순위, 담당자, 라벨과 날짜로 검색한다. 지원 type의 초기 assignee 설정에 따라 생성 후 배정하거나 보고자가 담당자를 골라야 한다. 해결 여부는 close 상태와 후속 설명으로 남긴다.

일반 Issue는 조직 내 다른 사용자에게 보일 수 있으며 resource 관련 Issue는 해당 filesystem/project role로 접근을 제한할 수 있다. Issue 생성 자체가 관련 데이터 접근 권한을 주지는 않는다.

다른 조직에 배정할 때 Issue에 관련 Organization을 추가해야 담당자가 볼 수 있다. 그룹의 Organization 연계는 개별 구성원에게 guest membership을 주지 않는다. 그룹에 배정됐어도 담당 구성원의 실제 조직 접근을 따로 확인한다. Assignee/Reporter/Automated comment tag는 관계에 따라 자동 표시한다.

## 클라이언트 환경

검증일 기준 desktop Chrome/Edge, mobile Chrome/Edge/Safari가 정식 지원 대상이다. Desktop Safari와 mobile Firefox는 지원 대상이 아니며 desktop Firefox는 최근 6개월 버전의 critical fix만 제한 지원한다. 지원 브라우저도 최근 1년 버전은 정식, 1~2년은 부분 지원, 2년 초과는 미지원이다. 모바일 지원은 모바일용 앱에 한한다.

Proxy의 WebSocket 차단은 기능 실패를, HTTP/2를 HTTP/1.1로 낮추는 구성은 많은 동시 요청의 지연을 일으킬 수 있다. 지원 브라우저라는 사실만으로 네트워크 경로가 정상이라고 가정하지 않는다.

## 번역과 과거 안내의 경계

이전 getting-started 경로의 한국어/중국어 페이지는 검증되지 않은 AIP 기계 번역이다. 당시 Issue 제출 흐름의 basic/simplified 구분과 Stack Overflow 안내가 남아 있고, 중국어 browser 안내는 최근 6개월 기준이라 현재 영어 지원 문서의 1년 기준과 다르다. 현재 운영 UI/지원 정책은 getting-help의 영어 안내를 우선하고, 번역 페이지의 존재를 영어 경로의 현재 가용성 보장으로 확대하지 않는다.

## 출처

- [Palantir Foundry, getting-help](https://www.palantir.com/docs/foundry/getting-help/)
- [Palantir Foundry, debug-using-devtools](https://www.palantir.com/docs/foundry/getting-help/debug-using-devtools/)
- [Palantir Foundry, file-support-ticket](https://www.palantir.com/docs/foundry/getting-help/file-support-ticket/)
- [Palantir Foundry, http-error-codes](https://www.palantir.com/docs/foundry/getting-help/http-error-codes/)
- [Palantir Foundry, issues](https://www.palantir.com/docs/foundry/getting-help/issues/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/getting-help/overview/)
- [Palantir Foundry, supported-browsers-network-requirements](https://www.palantir.com/docs/foundry/getting-help/supported-browsers-network-requirements/)

- [Palantir Foundry, debug-using-devtools (기계 번역)](https://palantir.com/docs/kr/foundry/getting-started/debug-using-devtools/)
- [Palantir Foundry, file-support-ticket](https://www.palantir.com/docs/foundry/getting-started/file-support-ticket/)
- [Palantir Foundry, http-error-codes (기계 번역)](https://palantir.com/docs/kr/foundry/getting-started/http-error-codes/)
- [Palantir Foundry, issues (기계 번역)](https://palantir.com/docs/kr/foundry/getting-started/issues/)
- [Palantir Foundry, network-requirements (기계 번역)](https://palantir.com/docs/zh/foundry/getting-started/network-requirements/)
- [Palantir Foundry, support-overview (기계 번역)](https://palantir.com/docs/kr/foundry/getting-started/support-overview/)
- [Palantir Foundry, supported-browsers (기계 번역)](https://palantir.com/docs/zh/foundry/getting-started/supported-browsers/)

## 관련 문서

- [[Palantir-Foundry-Operations]]
