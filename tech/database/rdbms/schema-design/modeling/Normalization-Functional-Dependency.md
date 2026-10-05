---
tags: [database, rdbms, normalization, functional-dependency, modeling]
status: done
category: "Data & Storage - RDB"
aliases: ["Functional Dependency", "함수 종속성", "함수 종속", "FD", "Prime Attribute", "프라임 속성", "Attribute Closure", "속성 폐포"]
---

# 함수 종속성과 키

[[Normalization|정규화]]의 2NF, 3NF와 BCNF는 함수 종속성(functional dependency, FD)과 키만으로 정의된다. 1NF는 값의 원자성을, 4NF 이후는 다치 종속과 조인 종속을 쓴다. 이 문서는 정규형을 판정할 때 쓰는 FD의 종류, 키와 프라임 속성, FD로 후보키를 빠짐없이 찾는 방법을 다룬다. 정규형별 위반 사례와 분해는 [[Normalization|정규화]]에 있다.

## 정의

릴레이션의 두 속성 집합 X, Y에 대해, 들어올 수 있는 어떤 두 튜플이든 X 값이 같으면 Y 값도 같을 때 `X → Y`라고 쓴다. X가 Y를 함수적으로 결정하고, Y는 X에 함수적으로 종속된다고 읽는다. 화살표 왼쪽을 left-hand side(결정자), 오른쪽을 right-hand side(종속자)라고 부른다.

- `employee_id → {name, birth_date, position, salary}`: 직원마다 유일하게 부여한 ID가 같으면 나머지도 같다.
- `{student_id, class_id} → grade`: 학생과 수업이 함께 정해져야 성적 하나가 정해진다.
- `{bank_name, account_number} → {balance, opened_at}`: 계좌번호는 은행이 다르면 우연히 같을 수 있으므로 은행명과 함께여야 계좌가 정해진다.
- `{user_id, location_id, visited_at} → {comment, picture_url}`: 위치 기반 서비스의 방문 기록처럼 세 속성이 모두 있어야 나머지가 정해지기도 한다.

## 현재 데이터가 아니라 스키마의 의미로 판단한다

FD는 특정 시점의 데이터 상태가 아니라 스키마가 표현하는 업무 규칙으로 정한다.

- 지금 저장된 직원들의 이름과 생일이 1:1로 보여도, 이름이 같고 생일이 다른 직원이 들어오는 순간 `name → birth_date`는 깨진다. 데이터 관찰은 FD가 없다는 반례가 될 수는 있지만 FD가 있다는 증거는 되지 않는다.
- 같은 속성이라도 정책에 따라 FD가 달라진다. 모든 직원이 한 부서에만 속한다면 `employee_id → department_id`가 성립하지만, 겸직을 허용하면 성립하지 않고 직원과 부서의 관계는 별도 테이블이 된다.
- `X → Y`가 `Y → X`를 뜻하지는 않는다. `employee_id → name`이어도 동명이인이 있으므로 `name → employee_id`는 성립하지 않는다. 반대로 직원 ID와 주민등록번호처럼 양방향이 함께 성립하기도 하므로, 한쪽 방향에서 다른 방향의 존재나 부재를 추론하지 않는다.

## 공집합이 결정하는 속성

`{} → Y`는 Y가 어떤 속성에도 의존하지 않고 모든 행에서 같은 값 하나만 갖는다는 뜻이다. 여러 회사명을 담을 것으로 설계했지만 업무상 한 회사명으로 고정된 `company` 컬럼이 그렇다. 지금 데이터에 같은 값만 보인다는 관찰이 아니라 값이 하나로 고정된다는 규칙이 있어야 이 종속이 성립한다. 공집합은 비어 있지 않은 모든 키의 진부분집합이므로 이런 상수 속성은 [[Normalization#2정규화|2NF]] 판정에 영향을 준다.

## 자명 종속과 비자명 종속

| 종류 | 조건 | 예 |
|---|---|---|
| 자명(trivial) | Y가 X의 부분집합 | `{a, b, c} → {c}`, `{a, b} → {a, b}` |
| 비자명(non-trivial) | Y가 X의 부분집합이 아님 | `{a, b, c} → {b, c, d}` |
| 완전 비자명(completely non-trivial) | X와 Y의 공통 속성이 없음 | `{a, b} → {c, d}` |

자명 종속은 어떤 릴레이션에서도 항상 성립하므로 설계에 주는 정보가 없다. 3NF와 BCNF의 조건은 비자명 종속에만 적용한다.

## 부분 종속과 완전 종속

X의 진부분집합(proper subset)은 X의 부분집합이면서 X와 같지 않은 집합, 즉 X에서 속성을 하나 이상 뺀 집합이다. `{a, b, c}`의 진부분집합은 `{a, c}`, `{a}`, `{}` 등이고 `{a, b, c}` 자신은 아니다.

- 부분 종속(partial FD): `X → Y`에서 X의 진부분집합 중 하나라도 Y를 결정한다. `{employee_id, name} → birth_date`는 `employee_id` 하나로도 생일이 정해지므로 부분 종속이다.
- 완전 종속(full FD): X의 어떤 진부분집합도 Y를 결정하지 못한다. `{student_id, class_id} → grade`는 학생 하나로도(여러 수업을 듣는다), 수업 하나로도(여러 학생이 듣는다), 공집합으로도 성적을 정할 수 없으므로 완전 종속이다.

결정자에서 속성을 빼도 종속이 유지되면 부분 종속, 어떤 속성 하나를 빼도 깨지면 완전 종속이다. 2NF는 모든 비프라임 속성이 모든 후보키에 완전 종속하도록 요구한다.

## 키와 프라임 속성

| 용어 | 뜻 |
|---|---|
| 슈퍼키 | 튜플을 유일하게 식별하는 속성 집합 |
| 후보키 | 속성을 하나라도 빼면 유일성이 깨지는 최소 슈퍼키. 줄여서 키라고도 한다 |
| 기본키 | 후보키 가운데 대표 식별자로 고른 키 |
| 프라임 속성 | 어느 후보키에든 속한 속성 |
| 비프라임 속성 | 어느 후보키에도 속하지 않는 속성 |

기본키를 고르는 전략과 나머지 후보키를 `UNIQUE`로 보존하는 방법은 [[Primary-Key-Strategy|Primary Key 전략]]에 있다. 정규형은 선택한 기본키 하나가 아니라 모든 후보키를 기준으로 판정하므로, 프라임 여부도 모든 후보키에 비추어 정한다.

## 속성 폐포로 후보키를 찾는다

FD 집합에서 속성 집합 X가 결정하는 모든 속성을 모은 것을 X의 폐포(closure) X⁺라고 한다. X⁺가 릴레이션의 모든 속성이면 X는 슈퍼키이고, X에서 어떤 속성을 빼도 폐포가 전체가 되지 않으면 후보키다.

X⁺는 X에서 시작해, 왼쪽이 이미 모은 속성에 모두 들어 있는 FD의 오른쪽을 더하는 일을 더 늘어나지 않을 때까지 반복해 구한다. 이 계산은 암스트롱 공리를 기계적으로 적용한 것이다. 반사 규칙은 Y가 X의 부분집합이면 `X → Y`, 증가 규칙은 `X → Y`면 `XZ → YZ`, 이행 규칙은 `X → Y`이고 `Y → Z`면 `X → Z`다.

계좌 테이블 `(account_id, bank_name, account_number, class, ratio, employee_id, employee_name)`에서 등급명이 은행마다 겹치지 않는다고 하자(한 은행은 star, prestige, royal, 다른 은행은 bronze, silver, gold). FD는 다음과 같다.

- `account_id → 나머지 전부`
- `{bank_name, account_number} → account_id`
- `class → bank_name`
- `employee_id → employee_name`

`{class, account_number}⁺`는 `class → bank_name`으로 bank_name을 얻고, `{bank_name, account_number} → account_id`로 account_id를 얻은 뒤 나머지 전부에 닿는다. class나 account_number 하나만으로는 전체가 되지 않으므로 `{class, account_number}`도 후보키다. 눈으로 찾은 `{account_id}`와 `{bank_name, account_number}`만 키로 두면 class를 비프라임 속성으로 잘못 분류한다. 정규형을 판정하기 전에 폐포로 후보키를 모두 찾는 이유다.

## 이행 종속

`X → Z`와 `Z → Y`가 성립하고, 중간의 Z가 후보키도 아니고 어떤 키의 부분집합도 아니면 `X → Y`는 이행 종속이다. 3NF는 비프라임 속성이 어떤 키에도 이행 종속하지 않도록 요구한다.

- 위 계좌 테이블에서 `account_id → employee_id`와 `employee_id → employee_name`이 성립하고 employee_id는 어떤 키에도 속하지 않는다. employee_name은 키에 이행 종속하므로, 한 직원의 이름이 그 직원의 계좌 수만큼 반복된다.
- 중간 결정자가 키의 일부면 이행 종속으로 보지 않는다. 그 종속자가 비프라임 속성이면 그 키에 대한 부분 종속이라 2NF에서 걸리고, 프라임 속성이면 3NF는 허용하지만 결정자가 슈퍼키가 아니므로 BCNF는 위반한다. 위 계좌 테이블의 `class → bank_name`이 뒤의 경우다.
- 비프라임 속성 사이에 FD가 없어야 한다는 설명은 이행 종속 조건을 쉽게 옮긴 근사여서, 결정자에 프라임 속성과 비프라임 속성이 섞인 경우를 놓칠 수 있다. 정확한 판정은 [[Normalization#3정규화|3정규화]]의 일반형 정의(비자명 종속 `X → A`마다 X가 슈퍼키이거나 A가 프라임 속성)로 한다.

## 면접 체크포인트

- FD를 현재 데이터가 아니라 스키마의 업무 규칙으로 정해야 하는 이유를 동명이인 예로 설명할 수 있는가
- 자명, 비자명, 완전 비자명 종속을 구분할 수 있는가
- 진부분집합으로 부분 종속과 완전 종속을 정의하고, 공집합도 진부분집합이라는 점이 2NF 판정에 주는 영향을 말할 수 있는가
- 슈퍼키, 후보키, 기본키, 프라임 속성을 구분하고 폐포로 숨은 후보키를 찾을 수 있는가
- 중간 결정자가 키의 일부인 연쇄를 이행 종속에서 빼는 이유와, 그 종속을 2NF의 부분 종속 규칙과 3NF의 프라임 속성 예외가 대신 판정한다는 점을 설명할 수 있는가

## 출처

- [YouTube, 쉬운코드, DB functional dependency(함수 종속)](https://www.youtube.com/watch?v=fw8hvolebLw)
- [YouTube, 쉬운코드, DB 정규화 1부, 1NF와 2NF](https://www.youtube.com/watch?v=EdkjkifH-m8)
- [YouTube, 쉬운코드, DB 정규화 2부, 3NF, BCNF와 역정규화](https://www.youtube.com/watch?v=5QhkZkrqFL4)

## 관련 문서

- [[Normalization|정규화]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Data-Modeling-Workflow|데이터 모델링 절차]]
