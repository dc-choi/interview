---
tags: [architecture, ecommerce, policy]
status: done
category: "Architecture - Data Model"
aliases: ["커머스 리뷰와 혜택 정책의 변경"]
---

# 커머스 리뷰와 혜택 정책의 변경

[[Ecommerce-Shopping-Mall-ERD]]의 구체 정책과 실패 조건을 다룬다.

### 리뷰 형식과 보상

텍스트 리뷰에 이미지를 추가하거나 이미지 리뷰에서 이미지를 지우면 보상도 달라질 수 있다. 작성뿐 아니라 형식 전이별 지급/회수 규칙을 정하고 같은 전이가 재시도되어도 한 번만 반영한다. 이미지 수정은 추가/삭제 ID의 차이로 표현할 수 있지만 소유권과 해당 리뷰에 대한 수정 권한을 함께 검사한다.

작성 자격의 구매 기간, 수정 가능 기간과 평점 집계 기간은 서로 다른 정책이다. 리뷰에 작성 자격이 된 주문 항목을 남기면 재구매, 부분 취소와 중복 작성 판단이 분명해진다. 전체 기간 평균과 최근 평균 중 무엇을 보여줄지도 별도로 정한다.

이미 사용한 적립 포인트를 회수하면 잔액 비음수 규칙과 충돌한다. 잠금만으로 해결할 수 없으므로 회수할 채무를 별도 기록할지, 적립을 확정 전 보류할지 등 업무 정책을 정한다. 취소나 삭제를 임의로 막아 해결했다고 간주하지 않는다. 사용할 수 있는 잔액과 회수 미완료 금액을 구분해 추적한다.

### 쿠폰 발급과 목록

상품에 직접 적용하는 쿠폰과 상품 카테고리에 적용하는 쿠폰을 합쳐 목록을 만들 수 있다. 이미 받은 쿠폰은 제외하거나 수령 상태를 표시한다. 발급은 보유권을 만드는 행위이며, 선조회 뒤 저장만으로는 중복 발급을 막지 못하므로 업무 키의 unique 제약이 필요하다.

발급분이 마스터를 그대로 참조하면 조건 수정이 기존 보유자에게도 전파된다. 발급 당시 조건이 유지되어야 하면 스냅샷이나 불변 정책 버전을 참조한다. 목록에 사용 완료 쿠폰을 보여주는 정책과 실제 checkout 허용 여부는 구분한다.

### 주문 중심과 화면 API

일반 커머스에서는 구매 의도와 확정 금액을 주문에 두고 PG 연동을 결제 경계로 격리할 수 있다. 이는 결제 서비스를 중심으로 하는 사업까지 같은 모델로 만들라는 규칙은 아니다. 주문, 결제와 취소의 관계는 [[Concept-Map-and-Boundaries|개념 지도]]로 먼저 확인한다.

화면별 통합 API는 클라이언트 요청 수와 조합 부담을 줄이고, 개념별 API는 재사용과 독립 변경에 유리하다. 내부 도메인 소유권과 외부 응답 모양을 동일시하지 않는다. 무거운 쿠폰 조회나 Q&A 답변은 사용자가 여는 시점으로 미룰 수 있으며, 어느 방식이든 구버전 앱의 계약을 유지한다.

## 출처

- [리뷰 - 요구사항 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392782)
- [리뷰 - 레거시 x AI 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392783)
- [리뷰 - 코드 느끼기](https://www.inflearn.com/courses/lecture?courseId=340204&unitId=392784)

- [Stripe, Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe, Webhook signature verification](https://docs.stripe.com/webhooks/signature)
- [TypeORM, Transactions](https://typeorm.io/docs/transactions/)
- 강의 준비: [소개](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354217), [구성](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354078), [상황 정의](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354077), [프로젝트 구조](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354079)
- 상품 목록: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354096), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354097), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354098)
- 상품 상세: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354099), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354120), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354121)
- Review: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354100), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354119), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354122)
- Q&A: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354101), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354118), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354123)
- Favorite: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354102), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354117), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354124)
- Point: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354103), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354116), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354125)
- Coupon: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354104), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354115), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354126)
- Cart: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354105), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354114), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354127)
- Order: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354106), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354113), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354128)
- Payment: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354107), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354112), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354129)
- Cancel: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354108), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354111), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354130)
- Settlement: [요구사항](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354109), [코드](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354110), [개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354131)
- 마무리: [전체 개념](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354093), [다음 단계](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354094), [학습 방향](https://www.inflearn.com/courses/lecture?courseId=339108&unitId=354662)
- 김영한 강사, 활용 1 커머스 모델: [요구사항 분석](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24281), [구현 요구사항](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24286), [애플리케이션 아키텍처](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24287), [상품 엔티티 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24293), [주문, 주문상품 엔티티 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24297), [주문 서비스 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24299), [주문 검색 기능 개발](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24301)
