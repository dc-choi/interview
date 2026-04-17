---
tags: [architecture, data-model, ecommerce, erd]
status: done
category: "Architecture - 데이터 모델"
aliases: ["Ecommerce ERD", "Shopping Mall ERD", "이커머스 ERD"]
---

# 이커머스 · 쇼핑몰 ERD 패턴

쇼핑몰은 **상품·주문·결제·배송·쿠폰·고객·리뷰**가 얽힌 도메인. 단순 CRUD가 아니라 **증거 보존·금전 거래·사기 방지** 요구가 데이터 모델 자체에 영향을 준다. 표준 패턴을 이해하면 새 이커머스를 설계할 때 흔한 함정을 피할 수 있다.

## 핵심 도메인 분류

| 도메인 | 역할 | 대표 엔티티 |
|---|---|---|
| 고객 | 연결·인증 | customers, members, sellers, citizens |
| 상품 | 카탈로그·재고 | sales, snapshots, units, options, stocks |
| 장바구니·주문 | 거래 | carts, orders, order_publishes |
| 결제·배송 | 이행 | deposits, mileages, deliveries |
| 쿠폰·할인 | 프로모션 | coupons, coupon_tickets |
| 게시판·리뷰 | 콘텐츠 | articles, snapshots, comments |

## 핵심 설계 원칙

### 1. 스냅샷 패턴 (Snapshot Pattern)
**구매 시점의 상품·가격·내용을 보존**해야 한다. 판매자가 가격이나 설명을 바꿔도 이미 결제된 주문은 그 시점 정보를 유지해야 분쟁이 없다.

구현:
- `shopping_sales` (현재 판매 정보) + `shopping_sale_snapshots` (변경 이력)
- 주문은 **snapshot ID를 참조** → 판매자가 가격을 올려도 주문 내역은 옛 가격 그대로
- 게시글·리뷰도 같은 패턴: `bbs_articles` + `bbs_article_snapshots`

장점: 사기 방지, 분쟁 시 증거. 단점: 저장량 증가, 조회 쿼리에 항상 "최신 snapshot" 조인 필요.

### 2. 소프트 삭제 (Soft Delete)
**물리 삭제 금지**. `deleted_at` 컬럼을 두고 NULL이면 활성, 값이 있으면 삭제. 환불·재발송·감사 시 데이터 필요.

### 3. 다중 채널 · 다중 역할 고객
"고객"은 사람이 아니라 **연결(connection)** 단위. 같은 사람이라도:
- 모바일 앱 / 웹 / 카카오톡 / 라인 등 채널마다 별도 record
- 비회원 → 회원 가입 → 판매자 등록 같은 역할 변화도 누적

엔티티:
- `shopping_customers` — 연결 단위 (가장 기본)
- `shopping_members` — 회원 가입한 고객
- `shopping_sellers` — 판매자
- `shopping_administrators` — 관리자
- `shopping_citizens` — 실명 인증 정보

이 분리 덕에 비회원 장바구니가 회원가입 시 자연스럽게 합쳐지고, 한 사람이 여러 역할을 동시에 가질 수 있다.

## 상품 모델 — 4단계 정규화

복잡한 상품(옵션·재고·가격)을 표현하는 표준 패턴:

```
shopping_sales              ─ 판매 상품 (논리)
  └ shopping_sale_snapshots ─ 시점별 정보 보존
      └ shopping_sale_snapshot_units      ─ 단위 (번들 지원: "본체+케이블 세트")
          └ shopping_sale_snapshot_unit_options   ─ 옵션 (색상·사이즈)
              └ shopping_sale_snapshot_unit_stocks ─ 옵션 조합별 최종 SKU + 재고 + 가격
```

- **Unit**: 카탈로그상 구분되는 상품 단위 (단품·번들·세트)
- **Option**: 구성 가능한 속성 (CPU, RAM, 색상, 사이즈)
- **Candidate**: 옵션의 가능한 값들
- **Stock**: 옵션 조합으로 정해지는 **실제 SKU**. 가격·재고는 여기서 관리

장점: "Red, L 사이즈 티셔츠"와 "Blue, M 사이즈 티셔츠"가 같은 상품의 다른 stock으로 깔끔하게 표현. 옵션 조합이 N개면 stock도 N개 생성.

## 주문 흐름 — 3단계 분리

```
shopping_carts → shopping_orders → shopping_order_publishes
   장바구니        주문 신청            결제 확정
```

- **carts**: 임시 모음. 결제 전까지 자유로 변경
- **orders**: "이 상품을 사겠다"는 신청. 가격이 fix되고 재고가 일시 차감
- **order_publishes**: 결제 성공 후 발행. PG사 응답 저장, 환불·취소 추적의 출발점

이 분리 덕에 **결제 실패 → 다시 결제 시도 → 부분 결제** 같은 시나리오를 깔끔하게 처리. 단순 `orders.status = 'PAID'` 하나로는 표현이 어려움.

## 배송 — M:N 관계

배송과 주문은 **1:1이 아니다**. 한 주문이 여러 배송으로 쪼개지거나(부분 발송), 여러 주문이 한 배송으로 합쳐질 수 있다(합포장).

```
shopping_orders ──(M:N)── shopping_deliveries
                    │
            shopping_delivery_pieces  (배송에 어떤 stock이 몇 개 포함되는지)
                    │
            shopping_delivery_journeys (제조→집하→이동→배송 단계 추적)
```

3단계 분리: `delivery` (배송 자체) + `delivery_pieces` (포함 항목) + `delivery_journeys` (단계 추적). 실제 물류 흐름과 일치.

## 결제·정산 도메인

- **shopping_deposits**: 입금 (현금·계좌)
- **shopping_mileages**: 마일리지 적립·사용 — 별도 잔액 테이블 + 거래 이력
- **shopping_coupons**: 쿠폰 정책 (할인율, 유효기간, 사용 조건)
- **shopping_coupon_tickets**: 발급된 쿠폰 (어느 회원이 받았고 사용했는지)

마일리지·잔액은 **거래 이력 + 잔액 캐시** 패턴 권장. 잔액만 저장하면 감사·디버깅 불가능.

## 게시판·리뷰

- **bbs_articles** — 글 메타정보 (작성자·생성 시각)
- **bbs_article_snapshots** — 내용 (제목·본문). 수정 시마다 새 snapshot 추가
- **bbs_article_comments** — 댓글, 계층 구조 (parent_id로 자기 참조)

수정 시 원본 덮어쓰기가 아니라 **snapshot을 추가**하는 이유: 누가 언제 무엇을 바꿨는지 증거 보존. 환불·신고 처리 시 "원래 어떻게 적혀 있었나"를 보여줘야 함.

## 흔한 실수

### 가격을 orders에 직접 저장
판매자가 가격을 올려도 OK라면 OK지만, **할인 쿠폰·프로모션이 적용된 가격**까지 보존하려면 결국 snapshot 필요.

### enum으로 주문 상태 관리
ENUM('PENDING', 'PAID', 'SHIPPED', 'CANCELLED') 식. 상태 추가 시 ALTER TABLE → 위험. **참조 테이블** 권장. ([[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴]] 참고)

### 소프트 삭제 누락
"리뷰 삭제했더니 환불 처리 안 됨" — 진짜로 지우면 안 됨. `deleted_at` 패턴.

### 회원가입 = 고객 시작
비회원도 장바구니·주문 가능해야 하는 게 보통. **고객(connection) 먼저, 회원은 그중 일부**.

### 상품 가격을 number 타입으로
화폐는 BIGINT (원화 기준 10원·1원 단위까지) 또는 DECIMAL. FLOAT/DOUBLE은 부동소수점 오차로 결제 분쟁의 원인.

## 사례: prisma-markdown 쇼핑몰 ERD

오픈소스 reference로 이 패턴을 충실히 구현한 예시는 [samchon/prisma-markdown](https://github.com/samchon/prisma-markdown)의 ERD. 실제 한국 이커머스 도메인 지식을 반영해 위 모든 원칙(스냅샷·소프트 삭제·다중 역할·옵션-stock 분리·M:N 배송)을 보여준다.

## 면접 체크포인트

- 스냅샷 패턴이 왜 필요한가 (가격 변경·증거 보존)
- 소프트 삭제 vs 물리 삭제 선택 기준
- 옵션·재고를 어떻게 모델링하는가 (Unit-Option-Stock 4단계)
- 주문 → 결제 → 배송이 1:1이 아닌 이유
- 마일리지·잔액을 단일 컬럼으로 관리하면 안 되는 이유 (감사 불가)
- ENUM으로 주문 상태를 관리하면 발생하는 문제

## 출처
- [samchon — Let's learn shopping mall architecture (dev.to)](https://dev.to/samchon/lets-learn-shopping-mall-architecture-of-relational-database-56b4)
- [samchon/prisma-markdown — ERD.md](https://github.com/samchon/prisma-markdown/blob/master/ERD.md)

## 관련 문서
- [[DTO-Layering|DTO 레이어 스코프]]
- [[VO-DTO|VO vs DTO]]
- [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴]]
- [[Schema-Design|Schema Design]]
- [[Aggregate-Boundary|Aggregate 경계]]
