---
tags: [palantir, apollo, continuous-delivery]
status: done
verified_at: 2026-10-16
category: AI Engineering
aliases: []
---

# Apollo Package와 Base Image 위험 예외

## suppression의 식별 단위

CVE 하나의 예외와 package 기반 예외는 범위가 다르다. package-based suppression은 package matcher, vulnerability matcher와 resource scope가 모두 맞는 현재/미래 finding을 대상으로 한다. 계층 위치와 무관하므로 OS base layer뿐 아니라 응용 package도 들어갈 수 있다. broad rule을 만들었다고 미검토 위험까지 자동 승인한 것으로 취급하지 않는다.

Package URL(PURL)의 type/namespace/name이 식별자다. `pkg:rpm/redhat/coreutils`와 `pkg:deb/ubuntu/coreutils`는 이름이 같아도 다르다. 버전의 @, qualifier의 ?와 subpath의 #는 PURL 입력에서 뺀다. 버전은 별도 version matcher로, qualifier는 별도 조건으로 지정한다. Subpath별 matcher는 이 문서에 제공되지 않으므로 예외 범위를 subpath로 제한할 수 있다고 가정하지 않는다.

## 세 축의 matcher

| 축 | 선택과 의미 |
|---|---|
| Resource scope | 정확한 image repository(기본), Product/SLS version, SLS distribution, image prefix, global |
| Vulnerability | 명시 CVE ID 또는 severity/source/fix status/known exploitation 속성 |
| Package | all, PURL, package namespace, upstream name; 별도 all/exact/SLS range version과 qualifier |

image repository는 registry와 tag/digest를 제거한 repository 경로를 정확히 비교한다. 속성 group 사이는 AND, 한 group의 여러 값은 대안이다. 제외 CVE는 다른 속성을 만족해도 매칭하지 않는다. 각 rule은 세 축을 함께 평가하므로 좁은 scope와 package만 보고 앞으로 발견할 CVE의 폭을 놓치지 않는다.

## 근거, 승인과 적용 시점

모든 예외에 rationale과 expiration이 필요하고 CR 승인을 거친다. package workflow는 verification에서 예측 matching finding을 보고 placement에서 기존 suppression에 추가할지 새로 만들지 검토한다. CR은 rule마다가 아니라 suppression마다 생성하므로 여러 rule의 묶음이 승인 단위를 바꾼다. 승인 뒤 다음 scan에서 suppressed로 바뀐다.

- False positive는 scanner가 실제 없던 취약점을 잘못 발견했다는 증거가 필요하다. 취약점은 있지만 통제로 막았다는 사실을 이 사유로 숨기지 않는다.
- Won't fix는 운영 필요와 보완통제, Vendor dependency는 upstream patch 부재 조사, Planned fix는 vendor advisory/issue와 일정 근거를 남긴다.
- 예외가 만료되면 다시 활성화되므로 만료일은 실제 수정/재검토 계획과 맞춘다.

구형 CVE suppression 안내는 세 category만 나열하지만 package 문서와 2026-04-02 변경 이력은 Planned fix를 추가한다. category 집합을 예전 페이지 하나로 고정하지 않는다. Suppress by Distribution은 non-container SLS 대상으로 container image에는 효과가 없다는 경계도 확인한다.

## Base image의 공통 위험

base image는 OS 이름 문자열이 아니라 registry 경로로 선언한 실제 image다. scanner가 pull할 수 있는지 검증하고 완료/실패/진행/미검사를 추적한다. finding은 (package,CVE) 쌍이며 영향을 받는 여러 image와 Product Release를 연결한다. 여러 쌍을 함께 요청하려면 같은 rationale이 모두에 적용되어야 한다.

Base image 선언, 제거와 suppression은 제품 Authorizing Official의 승인이 필요하며 scope를 넓혀도 승인 주체가 바뀌지 않는다. 해당 workflow의 category는 FALSE_POSITIVE, ACCEPTED_RISK, RECASTED_RISK, VENDOR_DEPENDENCY, PLANNED_FIX로 설명되어 package form의 category와 이름/의미를 임의 통일하지 않는다.

모든 예외는 숨겨지는 scan 발견이 아니라 **검토한 위험의 기간 제한 수용**이다. 범위를 바꾸면 현재 매칭 수뿐 아니라 미래 package/CVE도 확대될 수 있으므로 verification과 만료를 함께 검토한다.

## 출처

- [Palantir, base-image-vulnerability-management](https://www.palantir.com/docs/apollo/managing-vulnerabilities/base-image-vulnerability-management) — base image 선언, package/CVE 단위와 AO 승인.
- [Palantir, package-based-suppressions](https://www.palantir.com/docs/apollo/managing-vulnerabilities/package-based-suppressions) — PURL matcher, 미래 finding, 검증/placement와 suppression별 CR.

## 관련 문서

- [[Apollo-Vulnerability-Scanning-and-Remediation]]
- [[Apollo-CEL-Approval-Policies]]
