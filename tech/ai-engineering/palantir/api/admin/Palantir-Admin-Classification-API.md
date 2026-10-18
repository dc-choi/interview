---
tags: [palantir, foundry, api, administration, cbac]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 분류 배너와 CBAC 제약을 별도로 검증한다

CBAC classification은 Marking을 조합하는 규칙을 갖는다. 사람에게 보일 배너 문자열을 얻거나 문자열을 ID로 parse한 사실만으로 현재 사용자의 접근 자격이나 유효한 분류임을 확정할 수 없다. 아래 endpoint는 admin-read scope를 요구한다.

## 배너는 인식한 Marking의 표시다

`GET /api/v2/admin/cbacBanner`는 markingIds와 optional displayType을 받는다. 기본 PORTION_MARKING은 paragraph용 짧은 표현, BANNER_LINE은 문서 header용 긴 표현이다.

응답의 classificationString, markings, textColor/backgroundColors를 사용한다. 중복 ID는 제거하며 현재 CBAC 설정이 모르는 ID는 무시하고 응답 markings에서도 빠진다. 따라서 요청 전부가 적합했다고 가정하지 않고 요청/반환 ID 차이를 확인한다. 순서는 정해져 있지 않다.

backgroundColors는 현재 하나의 색을 담고 여러 색이 오면 첫 번째를 쓰도록 설명한다. 임의 gradient 처리 계약이 아니다. CBAC 미지원은 CbacUnavailable, 알려지지 않은 displayType/권한/배너 부재도 구별한다.

## 제약 검사와 현재 사용자의 자격

Preview `GET /admin/cbacMarkingRestrictions`는 preview=true와 markingIds로 disallowed/implied/required 정보를 받는다.

- disallowedMarkings는 함께 쓸 수 없는 ID 전체다. 입력 안에 있는 금지 조합만 반환하는 목록이 아니다.
- impliedMarkings는 입력 중 어떤 Marking의 member이면 자동으로 부여되는 자격이다.
- requiredMarkings는 목록들의 목록이다. 각 내부 목록에서 적어도 하나를 입력 markingIds에 포함해야 한다.
- isValid는 금지 조합이 없고 필요한 Marking을 충족하는 **분류 조합의 유효성**이다.
- userSatisfiesMarkings는 **현재 사용자의 자격**이다. conjunctive Marking은 모두, disjunctive는 category별 최소 하나가 필요하다.

isValid와 userSatisfiesMarkings는 서로 다른 판단이다. 하나가 true인 응답을 전체 접근 허용 boolean으로 합치지 않는다. 실제 resource의 일반 역할과 Organization 조건도 함께 확인한다.

## 문자열 파싱은 부분 성공을 담을 수 있다

`POST /admin/markings/parseClassifications`는 classificationStrings를 1~1,000개 받는다. 중복도 요청 크기에 포함하지만 한 번만 parse한다. 빈 목록은 MissingBatchRequest, 상한 초과는 BatchRequestSizeExceededLimit이다. schema optional 표시만 보고 빈 배열을 정상으로 처리하지 않는다.

응답 parsed map은 성공 문자열→component Marking IDs, errors map은 실패 문자열→사람이 읽을 오류다. 전체 HTTP 성공 안에서도 일부 문자열은 실패할 수 있다. parsed의 부재와 errors의 존재를 함께 확인한다. parse 성공이 배너 생성, CBAC 조합 검증이나 접근 권한 확인을 대신하지 않는다.

공개 명세 검토이며 실제 조직의 classification policy나 분류 자료를 검증한 것은 아니다. [[Palantir-Admin-Marking-API]]와 [[Palantir-Filesystem-Access]]를 함께 본다.

## 출처

- [Palantir, Get CBAC Banner](https://www.palantir.com/docs/foundry/api/admin-v2-resources/cbac-banners/get-cbac-banner)
- [Palantir, Get CBAC Marking Restrictions](https://www.palantir.com/docs/foundry/api/admin-v2-resources/cbac-marking-restrictions-objects/get-cbac-marking-restrictions)
- [Palantir, Parse Classifications](https://www.palantir.com/docs/foundry/api/admin-v2-resources/markings/parse-classifications)
