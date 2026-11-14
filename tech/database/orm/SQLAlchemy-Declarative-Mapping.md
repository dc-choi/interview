---
tags: [database, orm, python, sqlalchemy]
status: done
verified_at: 2026-11-14
category: "Database - ORM"
aliases: ["SQLAlchemy Declarative Mapping", "SQLAlchemy 선언적 매핑", "Mapped와 mapped_column"]
---

# SQLAlchemy 선언적 매핑(Mapped와 mapped_column)

SQLAlchemy는 Python의 SQL toolkit이자 ORM이다. 2.0 스타일의 선언적 매핑은 `DeclarativeBase`를 상속한 클래스에 `__tablename__`과 타입 주석이 붙은 속성을 두어 테이블 구조를 코드로 정의한다. 아래는 SQLAlchemy 2.0 문서 기준이다.

## 구성 요소

- `Mapped[T]`: ORM이 매핑한 클래스 속성을 나타내는 타입 주석이다. 이 문서에서는 컬럼 속성에 쓴다. `T`로 Python 타입을 정하고, 별도 SQL 타입을 주지 않으면 이 주석에서 컬럼 타입(`str`이면 `String`, `int`면 `Integer`)을 정한다.
- `mapped_column()`: 클래스 속성과 테이블 컬럼을 연결하면서 SQL 타입(`String(255)`), `primary_key`, `unique`, `nullable`, `default`, `server_default` 같은 컬럼 설정을 받는다.
- `__tablename__`: 매핑할 테이블 이름이다. 복수형(`users`) 사용은 관례이지 규칙이 아니다.

```python
from typing import Optional

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)  # NOT NULL, 단일 정수 PK라 autoincrement
    email: Mapped[str] = mapped_column(String(255), unique=True)  # NOT NULL + UNIQUE
    password_hash: Mapped[str] = mapped_column(String(255))
    terms_agreed: Mapped[bool]
    marketing_agreed: Mapped[bool] = mapped_column(default=False)
    nickname: Mapped[Optional[str]]  # NULL 허용
```

## NULL 여부를 정하는 순서

1. `mapped_column(nullable=...)`을 주면 그 값이 항상 우선한다.
2. `primary_key=True`이면 NOT NULL이다.
3. 둘 다 없으면 `Mapped[...]` 주석에 `Optional[...]`(또는 같은 의미의 표기)가 있으면 NULL, 없으면 NOT NULL이다.
4. `Mapped[...]` 주석도 없으면 `Column`의 기본값인 NULL을 따른다.

따라서 `Mapped[str]`만 써도 NOT NULL이 되어 `nullable=False`를 반복할 필요가 없다. 반대로 `Mapped[Optional[str]] = mapped_column(nullable=False)`처럼 객체를 만드는 동안 Python에서는 `None`을 허용하되 저장 컬럼은 NOT NULL로 둘 수도 있다.

## 기본키와 autoincrement

`autoincrement`의 기본값은 `"auto"`다. 외래키나 다른 client/server default가 없는 단일 컬럼 정수 기본키는 자동으로 autoincrement 의미를 얻으므로 `autoincrement=True`를 따로 적지 않아도 된다. 복합 기본키의 컬럼에 autoincrement를 강제하려면 `True`를, 절대 쓰지 않으려면 `False`를 준다. 실제 DDL은 dialect가 정한다(MySQL은 `AUTO_INCREMENT`).

정수 증가 키와 UUID 같은 다른 키 전략의 선택 기준은 [[Primary-Key-Strategy|기본키 전략]]에서 다룬다.

## 기본값: default와 server_default

| 설정 | 동작 위치 | 결과 |
| --- | --- | --- |
| `default=False` | SQLAlchemy가 INSERT를 만들 때 | 값을 주지 않은 INSERT에 SQLAlchemy가 값을 넣는다. 테이블 DDL에는 DEFAULT가 생기지 않는다 |
| `server_default="..."` | 데이터베이스 | CREATE TABLE에 DEFAULT 절이 생기고, INSERT에서 컬럼을 빼면 DB가 값을 채운다 |

같은 테이블에 SQLAlchemy 밖의 경로(직접 SQL, 다른 서비스)로도 INSERT한다면 `default`만으로는 그 경로의 기본값을 보장하지 못한다. 선택 동의 항목처럼 미입력을 거부 대신 명시값으로 저장하려면 NOT NULL과 기본값을 함께 두고, 기본값을 어느 계층에서 보장할지 정한다.

## 제약 조건이 하는 일과 하지 않는 일

- `unique=True`는 UNIQUE 제약을 만들어 중복을 DB가 거부하게 한다. 중복 INSERT는 DB 오류로 돌아오고, SQLAlchemy는 DBAPI 드라이버의 IntegrityError를 감싼 `IntegrityError`로 올리므로 회원가입 같은 흐름은 사전 조회만 믿지 않고 이 오류를 업무 오류로 바꿔 처리한다. 동시 요청 사이의 경쟁은 사전 조회로 막을 수 없다.
- `nullable=False`는 NOT NULL 제약을 만든다. `String(255)`의 길이는 DDL의 `VARCHAR(255)`로 전달될 뿐 SQLAlchemy가 검증하지 않으며, 강제 여부는 DB가 정한다(SQLite는 VARCHAR 길이를 강제하지 않는다). 이메일 형식 같은 입력 검증은 API 경계의 스키마(예: FastAPI의 Pydantic 모델)가 맡는다.
- 비밀번호는 해시 결과만 저장하고 해시 계산은 서비스 계층에서 한다. 컬럼 정의가 암호화를 해 주지 않는다.

## Pydantic 스키마와 ORM 모델의 역할 분리

FastAPI 같은 구성에서 요청 흐름은 보통 요청 스키마 검증, 서비스 로직(중복 확인, 비밀번호 해시), ORM 모델로 저장, 응답 스키마로 내보낼 필드 선택 순서다. 요청/응답 스키마는 API 계약이고 ORM 모델은 저장 구조다. 응답에 ORM 객체를 그대로 직렬화하면 `password_hash` 같은 저장 전용 필드가 새어 나갈 수 있으므로 응답 스키마로 필드를 고른다.

## 테이블 생성과 스키마 변경

`Base.metadata.create_all(engine)`은 기본적으로 이미 있는 테이블은 다시 만들지 않고 없는 테이블만 만든다. 기존 테이블의 컬럼 추가나 변경(ALTER)은 하지 않으므로, 운영 중인 스키마 변경은 Alembic 같은 마이그레이션 도구로 관리한다. 같은 이유로 모델 클래스를 고쳤다고 DB 구조가 따라 바뀌었다고 가정하지 않는다.

## 체크포인트

- `Mapped[str]`과 `Mapped[Optional[str]]`의 NULL 차이를 설명할 수 있는가
- `nullable`을 명시했을 때 주석과 다른 결과가 나오는 경우를 아는가
- `default`와 `server_default`의 적용 위치 차이와, ORM 밖 INSERT에서 생기는 차이를 아는가
- UNIQUE 위반을 사전 조회 대신 DB 오류 처리로 막아야 하는 이유를 설명할 수 있는가
- `create_all`이 기존 테이블 변경을 반영하지 않는다는 점을 아는가

## 출처

- [SQLAlchemy 2.0 Documentation, Table Configuration with Declarative](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html)
- [SQLAlchemy 2.0 Documentation, Class Mapping API (mapped_column)](https://docs.sqlalchemy.org/en/20/orm/mapping_api.html)
- [SQLAlchemy 2.0 Documentation, Column INSERT/UPDATE Defaults](https://docs.sqlalchemy.org/en/20/core/defaults.html)
- [SQLAlchemy 2.0 Documentation, Describing Databases with MetaData](https://docs.sqlalchemy.org/en/20/core/metadata.html)
- [SQLAlchemy 2.0 Documentation, Core Exceptions](https://docs.sqlalchemy.org/en/20/core/exceptions.html)
- [SQLite, Frequently Asked Questions](https://www.sqlite.org/faq.html)
- [YouTube, 구디사는 개발자 9Diin, AX 풀스택 11강 SQLAlchemy란? 유저(회원) 테이블 기초 설계](https://www.youtube.com/watch?v=6vtdpzZ43cM)
- [YouTube, 구디사는 개발자 9Diin, AX 풀스택 12강 파이썬 코드로 DB 테이블 만들기](https://www.youtube.com/watch?v=OCEuw6pIC5s)

## 관련 문서

- [[ORM|ORM 기초]]
- [[Primary-Key-Strategy|기본키 전략]]
- [[Data-Integrity-Constraints|데이터 무결성 제약]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
