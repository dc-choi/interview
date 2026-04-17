---
tags: [cs, code-quality, maintainability, magic-number]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Avoid Hard Coding", "하드코딩 피하기", "Magic Number"]
---

# 하드코딩 · 매직 넘버 제거

하드코딩은 변할 수 있는 값을 소스 코드 안에 **리터럴로 박아넣는 것**을 말한다. 파일 경로·URL·비밀번호·화면 문자열·숫자 임계값 같은 값이 흩어져 있으면 가독성·유지보수성·보안이 동시에 무너진다. 매직 넘버(Magic Number)는 그중 **의미가 드러나지 않는 숫자 리터럴**을 특히 지칭한다.

## 왜 문제인가

- **의미 전달 실패** — `if (age >= 19)`의 19가 무엇을 뜻하는지 읽는 사람이 추론해야 함
- **변경 파급** — 값이 흩어져 있으면 바꿔야 할 때 전부 찾아내야 하고, 하나라도 누락되면 버그
- **테스트 어려움** — 외부 의존(URL·경로)이 하드코딩되면 환경별로 테스트 분리가 안 됨
- **보안** — API 키·비밀번호·토큰이 코드에 박히면 커밋 히스토리에서 제거도 어려움
- **결합도 상승** — 특정 환경에서만 동작하는 코드가 되어 배포 유연성이 사라짐

## 어디에 나타나나

| 영역 | 예시 | 옮길 곳 |
|---|---|---|
| 숫자 임계값 | `age >= 19`, `if (retry < 3)` | 상수/설정 |
| 문자열 리터럴 | `"ROLE_ADMIN"`, 에러 메시지 | Enum·i18n 리소스 |
| 경로·URL | `"/var/log/app"`, `"https://api.prod.com"` | 환경변수·설정 파일 |
| 시크릿 | DB 비밀번호, JWT 시크릿 | Secret Manager·환경변수 |
| 정책 값 | 수수료율·할인율 | DB·설정 서버(Feature Flag) |

## 단계별 개선 전략

### 1. 이름 있는 상수로 추출

의미가 드러나는 이름을 붙여 **왜**를 코드에 남긴다.

```java
// 나쁨
if (user.getAge() >= 19) { ... }
price * 0.1;

// 좋음
private static final int LEGAL_ADULT_AGE = 19;
private static final double VAT_RATE = 0.1;

if (user.getAge() >= LEGAL_ADULT_AGE) { ... }
price * VAT_RATE;
```

### 2. 열거형(Enum)·상수 클래스로 그룹화

연관된 값은 하나의 타입으로 묶어 타입 안정성 확보.

```typescript
// 나쁨: 문자열 상태가 코드 전역에 산재
if (order.status === "PAID") { ... }

// 좋음: Enum·유니온
type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "CANCELLED";
const ORDER_STATUS: Record<OrderStatus, OrderStatus> = { ... };
```

### 3. 설정 외부화

환경마다 다른 값은 **12-factor** 원칙에 따라 설정으로 분리.

- Spring: `@Value("${app.base-url}")` + `application-{profile}.yml`
- Node.js: `process.env.BASE_URL` + `dotenv`
- 시크릿: AWS Secrets Manager·HashiCorp Vault·Kubernetes Secret

### 4. 정책 값은 DB·Feature Flag로

수수료·할인율·쿨다운처럼 **런타임에 바뀔 수 있는 값**은 배포 없이 변경 가능한 저장소로.

## 언제 하드코딩이 허용되는가

- **수학 상수** — 원주율 `Math.PI`, 광속 같은 불변 자연법칙값
- **단위 변환 계수** — `1_000`(초 → 밀리초), `1024`(KB → B)
- **테스트 데이터** — 테스트 파일 안에서 명확히 의도된 값
- **단 한 번만 쓰이는 즉시 값** — 이름을 붙이면 오히려 의도가 흐려지는 경우

핵심은 **"변경될 여지가 없고, 의미가 리터럴 그 자체로 전달되는가"**.

## 실전 체크리스트

- 3회 이상 반복되는 리터럴이 있는가 → 상수 추출
- 의미를 주석으로 설명하고 있는가 → 상수 이름으로 대체
- 환경(dev/stage/prod)마다 달라지는 값이 코드에 있는가 → 설정으로 이동
- Git에 커밋된 값 중 시크릿이 있는가 → 즉시 rotate + Secret Manager 이전
- 매직 넘버를 리뷰에서 지적할 수 있도록 린트 규칙(`no-magic-numbers`)을 켰는가

## 흔한 안티패턴

- `final` 상수만 따로 모은 `Constants.java` → 응집도 낮은 잡동사니 클래스. 도메인 상수는 도메인 클래스 내부에
- 상수 이름이 값 그 자체 — `private static final int THREE = 3;` 같은 건 의미를 전혀 추가하지 않음
- 상수화를 과도하게 → 한 번만 쓰이는 값까지 상수화하면 오히려 간접화로 가독성 저하
- 환경변수에 기본값이 없음 → 배포 시 누락되면 런타임 NPE. 필수 값은 시작 시 fail-fast 검증

## 면접 체크포인트

- 매직 넘버가 왜 나쁜지 3가지 이상(가독성·변경 파급·테스트 어려움·보안)
- 상수·Enum·설정 외부화·Feature Flag의 적합 영역 구분
- 하드코딩이 정당화되는 예외(수학 상수·일회성 값)
- 12-factor 설정 외부화 원칙의 핵심
- 시크릿이 코드에 들어갔을 때의 대응 절차(rotate + history 정리)

## 출처
- [Tecoble — 하드코딩 피하기](https://tecoble.techcourse.co.kr/post/2020-05-07-avoid-hard-coding/)

## 관련 문서
- [[Readable-Code-Cognition|코드 가독성의 인지과학]]
- [[tech/computer-science/js/Code-Readability-Dark-Patterns|코드 가독성 · JS 다크패턴]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
