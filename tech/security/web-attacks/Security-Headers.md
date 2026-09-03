---
tags: [security, http-header, csp, helmet]
status: done
verified_at: 2026-09-03
category: "보안(Security)"
aliases: ["Security Headers", "CSP", "HTTP Security Headers"]
---

# HTTP Security Headers

브라우저에 송신하는 응답 헤더로 **클라이언트 측 보안 정책**을 강제한다. 서버 측 방어가 뚫렸을 때 피해를 줄이는 심층 방어 계층이다. Helmet 같은 미들웨어가 모범 기본값을 한 번에 적용.

## 핵심 헤더

| 헤더 | 방어 대상 | 효과 |
|------|----------|------|
| `Content-Security-Policy` | XSS, 데이터 인젝션, clickjacking | 로드 가능한 리소스 출처 화이트리스트 |
| `Strict-Transport-Security` (HSTS) | 다운그레이드 공격 | HTTPS 강제, HTTP 자동 차단 |
| `X-Frame-Options` | Clickjacking | iframe 임베드 차단 (`DENY`/`SAMEORIGIN`) |
| `X-Content-Type-Options: nosniff` | MIME 스니핑 | 브라우저가 Content-Type 무시, 재해석 차단 |
| `Referrer-Policy` | 정보 누출 | Referer 헤더 송신 정책 |
| `Permissions-Policy` | 브라우저 API 남용 | 카메라, 마이크, 지오로케이션 등 사용 제한 |
| `X-XSS-Protection` (레거시) | 반사형 XSS | 모던 브라우저에서 제거됨 — `0`으로 명시 비활성화, 방어는 CSP |

`X-XSS-Protection`은 필터를 제거한 모던 브라우저(Chrome 78에서 XSS Auditor 삭제, WebKit도 제거, Firefox는 미구현)에서는 값과 무관하게 동작하지 않는다. 레거시 대응으로 `1; mode=block`을 남기는 것은 현행 권고가 아니다 — OWASP Secure Headers Project와 HTTP Headers Cheat Sheet는 `X-XSS-Protection: 0`(명시적 비활성화)이나 아예 보내지 않는 쪽을 권장한다.

`0` 권고의 이유는 필터가 아직 남아 있는 구형 브라우저에서 필터 자체가 공격 표면이 되기 때문이다. sanitize 모드(`1`)에서 브라우저가 주입으로 오판한 조각을 지우면 원래 안전하던 페이지의 전제(예: `productionMode` 플래그)가 무너져 디버그 경로 같은 취약한 코드가 실행될 수 있다. `1; mode=block`은 이 시나리오는 막지만, 페이지가 iframe으로 임베드 가능하면 렌더 차단 여부가 side-channel이 되어 토큰 유출에 악용될 수 있다. 반사형 XSS의 본 방어는 CSP(`script-src`에서 `'unsafe-inline'` 제거, nonce/hash)다.

## CSP — 심층 방어의 핵심 계층

출력 인코딩과 살균 위에 얹는 심층 방어 계층([[XSS]]). 인라인 스크립트, 외부 출처 스크립트를 통제.

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
| `default-src` | 명시되지 않은 fetch 디렉티브의 폴백. `frame-ancestors`, `form-action`, `base-uri`, `report-uri`에는 폴백하지 않으므로 별도 선언 필요 |
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

Helmet은 지원하는 보안 헤더에 검증된 기본값을 일괄 적용하지만 `Permissions-Policy`는 설정하지 않는다. 이 정책은 `res.setHeader`나 별도 미들웨어로 명시해야 하며, Helmet이 새 표준 헤더를 자동으로 추가한다고 가정하지 않는다. `Cross-Origin-Embedder-Policy`도 기본 비활성이다.

## 정적 검사 + SQL Injection은 별개

보안 헤더는 **클라이언트 보호** 계층이고 SQL Injection의 본 방어는 서버 측 파라미터 바인딩이다 — 정규식 키워드 차단이 거짓 양성과 우회로 보조 수단에 그치는 이유를 포함한 상세는 [[SQL-Injection]].

## 흔한 실수

- **`'unsafe-inline'`을 켜둔 채 운영**: CSP 계층 무력화. nonce/hash로.
- **HSTS preload 켜고 짧은 max-age로 토글**: preload 등록되면 변경 어려움. 충분히 검증 후.
- **CSP 도입 즉시 차단 모드**: 합법적인 리소스까지 막아 화면 깨짐. Report-Only로 시작.
- **X-XSS-Protection만 믿음**: 모던 브라우저에서 제거된 기능. CSP로.
- **레거시 대응이라며 `1; mode=block`을 남겨둠**: 현행 권고와 반대. `0`으로 끄거나 헤더를 보내지 않는다.
- **subdomain에 includeSubDomains 켜고 일부만 HTTPS**: 다른 서브도메인 접속 불가.
- **API 응답에도 CSP 적용**: API는 브라우저가 직접 렌더 안 함 → 효과 적음. 적용 대상은 HTML 응답.

## 면접 체크포인트

- 보안 헤더가 **방어 계층**에서 차지하는 위치 — 서버 검증 + 클라이언트 정책의 조합
- CSP 디렉티브 종류와 의미 — 특히 `script-src`/`frame-ancestors`
- `'unsafe-inline'`, `'unsafe-eval'`이 위험한 이유, nonce/hash 대안
- HSTS preload — 한번 등록되면 되돌리기 어려움
- `X-Frame-Options` vs CSP `frame-ancestors`
- `X-XSS-Protection`을 `1; mode=block`이 아니라 `0`으로 두는 이유 — 필터 자체가 취약점을 만들 수 있음
- Helmet 같은 라이브러리를 쓰는 이유 — 지원하는 헤더의 검증된 기본값과 중앙화된 설정 관리. `Permissions-Policy`처럼 지원하지 않는 헤더는 별도 설정
- SQL Injection 정규식 차단의 한계

## 출처

- [X-XSS-Protection — MDN (deprecated, CSP 권고와 필터가 만드는 취약점 설명)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection)
- [OWASP Secure Headers Project — X-XSS-Protection (0 설정 권고)](https://github.com/OWASP/www-project-secure-headers/blob/master/mainsite/01_headers.md#x-xss-protection)
- [OWASP HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [Helmet Reference](https://github.com/helmetjs/helmet/blob/main/README.md)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/#directive-frame-ancestors)

## 관련 문서

- [[XSS|XSS 공격과 방어]]
- [[SQL-Injection|SQL Injection (파라미터 바인딩)]]
- [[CSRF|CSRF]]
- [[CORS|CORS]]
- [[NestJS-Middleware|NestJS Middleware (Helmet 적용)]]
