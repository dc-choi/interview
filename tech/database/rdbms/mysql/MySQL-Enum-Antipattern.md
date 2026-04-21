---
tags: [database, rdbms, mysql, antipattern, schema-design]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL ENUM", "ENUM Antipattern"]
---

# MySQL ENUM 안티패턴

MySQL의 `ENUM` 타입은 컬럼에 허용 가능한 값을 스키마 정의에 박아두는 방식. 처음엔 편해 보이지만 **데이터 정규화·확장성·이식성** 모두 망가뜨린다. 대부분의 경우 **참조 테이블(lookup table)** 또는 애플리케이션 레벨 검증으로 대체해야 한다.

## 8가지 사용 금지 이유

### 1. 정규화 위반
ENUM의 가능한 값들은 **데이터**인데 스키마에 박아둔다. 정규화 원칙상 데이터는 테이블에 있어야 한다. ENUM은 "데이터를 데이터답게 저장하지 않는" 안티패턴.

### 2. 값 변경의 어려움
`ALTER TABLE ... MODIFY ... ENUM(...)` 으로 ENUM 값을 추가·변경·삭제하면 **테이블 락 + 전체 재구성**이 발생. 대규모 테이블에서 매우 느림. INSTANT DDL로 끝에 추가는 가능하지만 중간 삽입·삭제는 제외.

### 3. 속성 추가 불가
ENUM 값에 **연관 정보**를 못 붙인다. 예: 주문 상태가 `'PAID'`라는 사실 말고 "결제 완료된 상태의 표시 색상", "다음 가능한 상태", "한국어 라벨"을 같이 저장해야 한다면 → 결국 별도 테이블 필요.

참조 테이블이라면 컬럼 추가만으로 끝나는 일이 ENUM은 매번 코드·스키마 양쪽을 갱신해야 함.

### 4. 값 목록 조회의 복잡성
"이 ENUM 컬럼에 어떤 값들이 가능한가?"를 SQL만으로 깔끔하게 가져올 방법이 없다. `INFORMATION_SCHEMA.COLUMNS`의 `COLUMN_TYPE`을 문자열 파싱해야 함. 참조 테이블이라면 `SELECT * FROM order_statuses` 한 줄.

### 5. 미미한 성능 이점
ENUM이 정수로 저장되니 빠르다는 주장이 있지만, 실제로는 **조인 한 번 차이** 정도. 작은 참조 테이블은 메모리에 상주하고 인덱스를 타므로 비용이 거의 없다. **성급한 최적화의 전형**.

### 6. 재사용 불가
ENUM 정의는 **그 컬럼 한정**. 같은 값 집합을 여러 테이블에서 쓰려면 매번 정의를 복붙해야 한다. 정의가 어긋나면 데이터 정합성도 어긋남. 참조 테이블이라면 FK로 연결만 하면 됨.

### 7. 잘못된 값 처리의 함정
- 잘못된 값을 INSERT하면 **빈 문자열 `''`로 변환**된다 (strict mode 아닐 때). 의도치 않은 데이터 손실
- ENUM은 내부적으로 **1부터 시작하는 정수**로 매핑되어, 정수와 문자열을 혼동하기 쉽다 (`WHERE status = 1`이 `WHERE status = 'PAID'`와 같은 의미)
- ORDER BY가 알파벳이 아닌 **정의 순서**로 정렬됨 → 직관 어긋남

### 8. SQL 표준 미포함 → 이식성 부족
ENUM은 **MySQL 전용**. PostgreSQL은 다른 형태의 ENUM(별도 타입 객체), Oracle·SQL Server는 미지원. DB를 바꾸면 마이그레이션 작업 추가.

## 대안: 참조 테이블 (Lookup Table)

```sql
CREATE TABLE order_statuses (
  code        VARCHAR(20) PRIMARY KEY,
  label_ko    VARCHAR(50) NOT NULL,
  label_en    VARCHAR(50) NOT NULL,
  display_order INT NOT NULL,
  is_terminal BOOLEAN DEFAULT FALSE
);

CREATE TABLE orders (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  status_code VARCHAR(20) NOT NULL,
  FOREIGN KEY (status_code) REFERENCES order_statuses(code)
);
```

- 값 추가: `INSERT INTO order_statuses VALUES ('REFUNDED', '환불됨', ...)` 한 줄
- 라벨 변경: `UPDATE order_statuses SET label_ko = '결제됨' WHERE code = 'PAID'`
- 다른 테이블 재사용: 같은 `order_statuses`를 FK로 참조

## 대안: 애플리케이션 레벨 enum + CHECK 제약

```sql
CREATE TABLE orders (
  status VARCHAR(20) NOT NULL,
  CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'CANCELLED'))
);
```

- 코드(예: TS enum, Java enum)에서 값을 정의 → DB CHECK로 방어
- 변경 시 마이그레이션은 CHECK 재정의로 충분
- ENUM의 함정은 모두 회피

CHECK 제약은 MySQL 8.0.16+에서 정식 동작 (이전 버전은 무시).

## ENUM이 그래도 괜찮은 경우 (드뭄)

- 값이 **절대 변하지 않을** 것이 확실 (예: `'M'`, `'F'`, `'OTHER'`)
- 값에 추가 메타데이터가 영원히 필요 없음
- DB 이식성·재사용을 고려할 필요 없음
- 단일 테이블에서만 사용

심지어 이 조건도 시간이 지나면 깨지기 쉽다. **기본은 참조 테이블**.

## 면접 체크포인트

- ENUM이 정규화 원칙을 어떻게 위반하는가
- ENUM 값 추가가 왜 위험한가 (테이블 재구성)
- 잘못된 값을 INSERT했을 때 ENUM이 어떻게 동작하는가
- 참조 테이블 vs ENUM의 트레이드오프
- DB 마이그레이션(MySQL→PostgreSQL) 시 ENUM의 문제

## 출처
- [velog @leejh3224 — MySQL ENUM 타입을 사용하지 말아야 할 8가지 이유 (번역)](https://velog.io/@leejh3224/번역-MySQL의-ENUM-타입을-사용하지-말아야-할-8가지-이유)

## 관련 문서
- [[Schema-Design|Schema Design]]
- [[Normalization|Normalization]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL — 데이터 타입 차이]]
