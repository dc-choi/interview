---
tags: [security, http-header, csp, helmet]
status: done
category: "보안(Security)"
aliases: ["Security Headers", "CSP", "HTTP Security Headers"]
---

# HTTP Security Headers

브라우저에 송신하는 응답 헤더로 **클라이언트 측 보안 정책**을 강제한다. 서버 코드에 취약점이 있어도 헤더가 깔려 있으면 1차 방어선으로 동작. Helmet 같은 미들웨어가 모범 기본값을 한 번에 적용.

## 핵심 헤더

| 헤더 | 방어 대상 | 효과 |
|------|----------|------|
| `Content-Security-Policy` | XSS, 데이터 인젝션, clickjacking | 로드 가능한 리소스 출처 화이트리스트 |
| `Strict-Transport-Security` (HSTS) | 다운그레이드 공격 | HTTPS 강제, HTTP 자동 차단 |
| `X-Frame-Options` | Clickjacking | iframe 임베드 차단 (`DENY`/`SAMEORIGIN`) |
| `X-Content-Type-Options: nosniff` | MIME 스니핑 | 브라우저가 Content-Type 무시, 재해석 차단 |
| `Referrer-Policy` | 정보 누출 | Referer 헤더 송신 정책 |
| `Permissions-Policy` | 브라우저 API 남용 | 카메라, 마이크, 지오로케이션 등 사용 제한 |
| `X-XSS-Protection` (레거시) | 반사형 XSS | 대부분 브라우저에서 deprecated — CSP로 대체 |

`X-XSS-Protection: 1; mode=block`은 **모던 브라우저에서 더 이상 효과 없음**. CSP로 가는 것이 표준이지만, 레거시 브라우저 대응 차원에서 같이 둘 수는 있음.

## CSP — 가장 큰 한 방

XSS의 1차 방어선. 인라인 스크립트, 외부 출처 스크립트를 통제.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  report-uri /csp-report
```

| 디렉티브 | 통제 |
|---------|------|
| `default-src` | 기본 — 다른 디렉티브가 없을 때 적용 |
| `script-src` | JS 출처 |
| `style-src` | CSS 출처 |
| `img-src` | 이미지 출처 |
| `connect-src` | XHR, fetch, WebSocket, EventSource 송신 대상 |
| `frame-ancestors` | 이 페이지를 누가 iframe으로 임베드 가능 (X-Frame-Options 후속) |
| `report-uri` / `report-to` | 위반 발생 시 알림 받을 엔드포인트 |

### 인라인 스크립트 운영 트릭

`'unsafe-inline'`은 안전성 크게 낮춤. 대안:
- **nonce** — 응답마다 랜덤 nonce 생성 → 스크립트 태그에 같은 nonce 부착 → CSP에 `script-src 'nonce-XYZ'`
- **hash** — 인라인 스크립트의 SHA-256 hash를 CSP에 등록

### Report-Only 모드

운영에 적용하기 전 단계. `Content-Security-Policy-Report-Only` 헤더로 위반만 수집하고 차단은 안 함. 정책 튜닝에 필수.

## HSTS — HTTPS 강제

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age` — 클라이언트가 이 도메인을 HTTPS로만 인식할 기간(초). 1년이 일반적.
- `includeSubDomains` — 서브도메인까지 적용.
- `preload` — 브라우저 빌트인 HSTS preload list 등록 후보. 첫 방문 전부터 HTTPS 강제.

운영 안정화 전엔 짧게(`max-age=300`)로 시작 → 점진적으로 늘리기.

## Frame-Ancestors vs X-Frame-Options

`frame-ancestors`(CSP)가 X-Frame-Options 상위 호환. 모던 브라우저는 `frame-ancestors` 우선. 둘 다 두는 것이 가장 호환.

## NestJS, Express 적용

### Helmet (권장)
```ts
import helmet from 'helmet';
app.use(helmet());   // 합리적 기본값 일괄 적용
app.use(helmet.contentSecurityPolicy({ directives: {...} }));
```

### 직접 미들웨어
```ts
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }
}
```

가능하면 Helmet — 새 헤더(`Permissions-Policy` 등) 추가될 때 자동 반영.

## 정적 검사 + SQL Injection은 별개

보안 헤더는 **클라이언트 보호**. 서버 측 입력 검증, 파라미터 바인딩은 별도. 정규식으로 SQL 키워드를 차단하는 패턴은 **거짓 양성, 우회 둘 다 잘 일어나** 보조 수단으로만 — 본 방어는 ORM/Prepared Statement.

## 흔한 실수

- **`'unsafe-inline'`을 켜둔 채 운영**: XSS 1차 방어 무력화. nonce/hash로.
- **HSTS preload 켜고 짧은 max-age로 토글**: preload 등록되면 변경 어려움. 충분히 검증 후.
- **CSP 도입 즉시 차단 모드**: 합법적인 리소스까지 막아 화면 깨짐. Report-Only로 시작.
- **X-XSS-Protection만 믿음**: deprecated. CSP로.
- **subdomain에 includeSubDomains 켜고 일부만 HTTPS**: 다른 서브도메인 접속 불가.
- **API 응답에도 CSP 적용**: API는 브라우저가 직접 렌더 안 함 → 효과 적음. 적용 대상은 HTML 응답.

## 면접 체크포인트

- 보안 헤더가 **방어 계층**에서 차지하는 위치 — 서버 검증 + 클라이언트 정책의 조합
- CSP 디렉티브 종류와 의미 — 특히 `script-src`/`frame-ancestors`
- `'unsafe-inline'`, `'unsafe-eval'`이 위험한 이유, nonce/hash 대안
- HSTS preload — 한번 등록되면 되돌리기 어려움
- `X-Frame-Options` vs CSP `frame-ancestors`
- `X-XSS-Protection`이 deprecated인 이유
- Helmet 같은 라이브러리를 쓰는 이유 — 새 헤더 자동 반영
- SQL Injection 정규식 차단의 한계

## 관련 문서

- [[XSS|XSS 공격과 방어]]
- [[CSRF|CSRF]]
- [[CORS|CORS]]
- [[NestJS-Middleware|NestJS Middleware (Helmet 적용)]]
