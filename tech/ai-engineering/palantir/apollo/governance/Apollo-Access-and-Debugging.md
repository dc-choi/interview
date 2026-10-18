---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo 접근 제어와 운영 디버깅

## 인증, 역할과 승인

로그인은 SAML IdP 연동 또는 Palantir Auth를 사용할 수 있다. 인증된 뒤 Team에 부여한 RBAC가 허용 operation을 정하고 변경 승인은 CEL이 별도로 정한다. 역할은 자원 타입 전체 또는 특정 자원에 줄 수 있다. 특정 Entity에 추가한 역할은 환경의 기본 inherited 권한을 제거하지 않는다.

Release creator는 기존 제품의 릴리스를 다루지만 새 제품 생성 권한은 아니다. 채널 Contributor는 label 조건을 만족하는 release를 추가하고 Restricted Contributor는 소유 제품으로 제한된다. Label Contributor도 대상 resource를 수정할 권한이 추가로 있어야 한다. 권한 페이지의 label 예시는 Environment administrator/editor 표현이 혼재하므로 실제 Hub operation grant를 확인한다.

Team 기본 설명에는 admin/member group을 요구하지만 생성 workflow는 직접 user도 허용한다. 최소 한 admin user/group을 정하고 admin은 membership 권한도 갖는다. 실제 membership은 Team에 직접 들어온 사용자와 IdP group을 모두 본다. 구형 team 편집 문서의 CR 설명과 달리 What's New는 2025-10/12에 Team CRUD가 RBAC만으로 처리된다고 명시하므로 현재 변경 경로와 버전을 대조한다.

## 터미널과 JIT

debug terminal은 사용자별로 격리되고 TTL4시간, 창을 닫으면 삭제되는 세션이다. 기본 Kubernetes 접근은 get/list/watch 중심이며 실제 resource/log 범위는 환경에 따라 다르다. elevated access는 JIT policy의 기간과 권한을 확인하고 별도 CR로 요청한다. 문서는 Terminal User 역할과 Environment Administrator 승인을 요구하며 자기 승인은 금지한다. 취소/승인/만료는 기존 세션과 새 세션 모두에 반영된다.

일반 터미널 페이지는 Environment Operator를, 2026-05 출시 안내와 JIT 페이지는 Terminal User를 언급한다. 역할 차이를 임의로 하나로 단정하지 않고 현재 Hub의 terminal operation 권한을 확인한다.

Terminal profile은 Hub 전체에 정의하지만 그 registry가 설치된 환경에서만 선택 가능하다. name은 불변, image는 /bin/bash 포함, numeric non-root UID, target node architecture 일치, 특정 version tag가 필요하다. latest tag는 금지된다. 같은 tag를 덮어써도 node가 이전 cache를 쓸 수 있어 새 tag를 발행한다. registry push는 Hub Artifacts Creator가 필요하다. profile 목록의 기본 버전 생략과 latest tag 금지를 같은 의미로 해석하지 않는다.

## 진단은 Apollo와 Kubernetes 양쪽을 본다

Plan details/raw agent output으로 실패 단계를 찾고 Pod의 Pending/ImagePullBackOff/CreateContainerConfigError는 describe Events, CrashLoop/Error는 logs, 외부 접근은 Service와 LoadBalancer를 확인한다. Helm history와 get values로 실제 install/rollback과 렌더링 입력을 대조한다. Apollo는 Pod 응용 로그 전체를 대체하는 수집 도구가 아니다. Pod Running이어도 agent가 보고하지 않으면 Plan을 발행하지 못할 수 있다.

local kind에는 cloud LoadBalancer가 기본 제공되지 않아 chart가 가정한 인프라를 별도로 제공해야 한다. 재연결 문제는 manifest 재적용과 agent/Hub 통신을 확인한다. 클러스터 재시작 후 새 환경을 만드는 가이드 예시는 모든 장애의 기본 해결책으로 쓰지 않는다.

2026-10-16 브라우저 정책은 최근1년 Chrome/Edge의 full 지원,2년까지 부분 지원, 그보다 오래되면 미지원이다. Firefox는 최근6개월 버전의 critical fix를 제공한다. 이는 문서 확인일의 정책이며 현재 설치 브라우저를 검사한 결과는 아니다.

## 출처

- [Palantir, authentication](https://www.palantir.com/docs/apollo/core/authentication) — SAML 또는 Palantir Auth 인증.
- [Palantir, authorization](https://www.palantir.com/docs/apollo/core/authorization) — resource/global RBAC와 inherited 권한의 가산성.
- [Palantir, supported-browsers](https://www.palantir.com/docs/apollo/core/supported-browsers) — Chrome/Edge/Firefox 버전별 지원 기간.
- [Palantir, teams](https://www.palantir.com/docs/apollo/core/teams) — Team을 권한/알림/승인의 조직 단위로 정의.
- [Palantir, troubleshooting-in-cluster](https://www.palantir.com/docs/apollo/core/troubleshooting-in-cluster) — Events/logs/Services/Helm과 agent 보고를 함께 진단.
- [Palantir, debugging](https://www.palantir.com/docs/apollo/debugging) — 부모 debugging 경로의 시간 제한 terminal.
- [Palantir, jit-access](https://www.palantir.com/docs/apollo/debugging/jit-access) — JIT 요청/승인/회수와 자기 승인 금지.
- [Palantir, terminal](https://www.palantir.com/docs/apollo/debugging/terminal) — 4시간 세션, scoped 읽기 권한과 Operator 설명.
- [Palantir, terminal-profiles](https://www.palantir.com/docs/apollo/debugging/terminal-profiles) — custom image bash/nonroot/tag/architecture 요구.
- [Palantir, managing-teams](https://www.palantir.com/docs/apollo/managing-teams) — Team 관리 부모 경로와 관리자 workflow.
- [Palantir, create-new-team](https://www.palantir.com/docs/apollo/managing-teams/create-new-team) — 직접 user와 IdP group, 최소 admin.
- [Palantir, overview](https://www.palantir.com/docs/apollo/managing-teams/overview) — Team 관리 UI 범위.
- [Palantir, view-edit-existing-teams](https://www.palantir.com/docs/apollo/managing-teams/view-edit-existing-teams) — membership, 역할 변경과 global 권한 제한.

## 관련 문서

- [[Apollo-CEL-Approval-Policies]]
- [[Apollo-CLI-Security-and-Terminals]]
