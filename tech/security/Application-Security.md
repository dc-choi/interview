---
tags: [security, secure-coding, owasp]
status: done
verified_at: 2026-09-30
category: "보안(Security)"
aliases: ["Application Security", "애플리케이션 보안", "시큐어코딩", "Secure Coding", "OWASP Top 10"]
---

# 애플리케이션 보안 (Application Security) / 시큐어코딩

보안은 막는 기능을 추가하는 일이 아니라, **공격자가 서비스를 비정상적으로 사용할 가능성을 줄이는 설계와 구현 습관**이다. 별도 단계로 미루지 않고 코드를 짜는 순간에 함께 결정하는 것이 핵심이다.

## 4대 압축 원칙

대부분의 애플리케이션 취약점은 이 네 가지를 어겨서 생긴다.

1. **클라이언트는 믿지 않는다** — 클라이언트가 보낸 값, 클라이언트에서 한 검증은 모두 변조 가능하다.
2. **권한은 서버에서 검증한다** — 인증, 인가, 접근 제어는 서버 책임. 세션, 토큰을 기준으로 매 요청 확인.
3. **필요한 것만 노출한다** — 엔드포인트, 정보, 포트는 기본 차단 후 필요한 것만 연다.
4. **토큰과 설정은 서버가 제어할 수 있게 한다** — 무효화, 변경이 가능한 구조로 둔다.

## 취약점 진단 vs 모의해킹

| 구분 | 취약점 진단 | 모의해킹 (Penetration Test) |
|---|---|---|
| 방식 | 체크리스트로 위험 요소 점검 | 실제 공격자처럼 분석, 침투 |
| 단위 | 항목별 (SQLi 가능?, 인가 누락 API?) | 취약점 조합으로 어디까지 뚫리나 |
| 비유 | 문이 잠겼는지 확인 | 창문, 벽, 사회공학, 우회 경로까지 동원 |

진단은 넓고 얕게 빠진 항목을 찾고, 모의해킹은 좁고 깊게 실제 침투 경로를 증명한다. 둘은 대체재가 아니라 보완재다.

## 시큐어코딩: 충돌을 줄이는 방식

보안팀은 개발자가 만든 서비스를 공격자 관점에서 테스트하므로, 개발자에게는 배포를 막거나 일을 늘리는 존재로 느껴지기 쉽다. 이 충돌을 구조적으로 줄이는 것이 시큐어코딩 — **처음부터 취약점이 생기기 어렵게 코드를 작성**하는 것이다.

- **실패하는 방식**: 수백 페이지 보안 가이드를 던지고 "알아서 지키세요"
- **작동하는 방식**: 중요도 높은 항목부터 체크리스트화해 개발자가 직접 빠르게 확인
- **협업 구조**: 배포 직전 검사 절차로만 두면 일정 압박과 위험 차단이 정면충돌. 설계 단계부터 보안팀이 참여하고, 보안팀은 "이 취약점이 왜 위험하고 어떤 공격으로 이어지나"를, 개발팀은 구현 제약과 운영 환경을 공유한다.

## OWASP Top 10:2025, 웹 보안의 위험 지도

웹 애플리케이션에서 특히 위험한 취약점 10가지 목록. 우선순위를 잡는 지도로 쓴다.

- **A01 Broken Access Control (접근 제어 실패)** — 2025년에도 1위. 권한 없는 사용자가 남의 정보에 접근하거나, 일반 사용자가 관리자 기능을 실행. [[IDOR]]가 대표 사례다.
- **A02 Security Misconfiguration (보안 설정 오류)** — 불필요한 포트, 기능, 계정, 과도한 오류 정보와 안전하지 않은 클라우드 권한이 공격면을 만든다.
- **A03 Software Supply Chain Failures (소프트웨어 공급망 실패)** — 직접, 전이 의존성과 빌드, 배포 경로의 취약점 또는 악성 변경을 함께 관리해야 한다.
- **A05 Injection** — 2025년에는 5위다. 프레임워크와 ORM이 파라미터 바인딩 같은 기본 방어를 제공해도, 동적 쿼리와 안전 기능 우회에서 발생한다. 대표 사례는 [[SQL-Injection]]과 [[XSS]]다.

## 최근 개발 트렌드가 만드는 리스크

개발 방식의 변화가 새 취약점 표면을 만든다.

| 트렌드 | 리스크 |
|---|---|
| 클라이언트 처리 증가 | 서버에서 해야 할 권한, 인증, 접근 제어를 클라이언트에 맡기면 쉽게 우회됨 |
| 프레임워크, 라이브러리 의존 상승 | 생산성은 오르지만 설정 오류, 라이브러리 자체 취약점의 영향이 커짐 → [[Supply-Chain-Security]] |
| 클라우드 확대 | 온프레미스에서 안 보이던 메타데이터 API, 내부망 접근, 클라우드 권한 탈취 등장 → [[SSRF]] |
| AI 코딩 도구 확산 | 기능 요구만 주면 동작하는 코드는 나오지만, 요구하지 않은 보안 속성은 빠지기 쉽다 |

### AI에 보안 요구사항을 체크리스트로 주입한다

AI는 프롬프트에 없는 제약을 스스로 채워 넣지 않는 경우가 많다. 그래서 웹 서비스 기능을 맡길 때는 보안 요구사항을 명시적인 체크리스트로 함께 주고, 각 항목이 반영됐다는 증거로 통과한 테스트를 요구한다. 개념 설명은 각 문서에 있고, 여기서는 주입할 항목만 묶는다.

| 영역 | 요구할 속성 | 참조 |
|---|---|---|
| 교차 출처 요청 | Origin 허용 목록, Preflight 처리, 와일드카드 금지 | [[CORS]] |
| 상태 변경 요청 위조 | CSRF 토큰 또는 SameSite 기반 방어 | [[CSRF]] |
| 스크립트 주입 | 출력 인코딩, CSP | [[XSS]], [[Security-Headers\|보안 헤더]] |
| 서버 측 요청 | 외부 URL 호출의 대상 제한 | [[SSRF]] |
| 인증과 인가 | 매 요청 서버 검증, RBAC나 ABAC, 테넌트 격리, 최소 권한 | [[Auth-Method-Selection\|인증 방식 선택]], [[Access-Control-Models\|접근 제어 모델]], [[IDOR]] |
| 입력 처리 | 서버 측 검증, 파라미터 바인딩 | [[SQL-Injection]] |
| 남용 방지 | Rate Limit, 로그인 무차별 대입 차단 | [[Rate-Limiting\|Rate Limit]] |
| 세션 | 쿠키 HttpOnly, Secure, SameSite와 세션 만료 | [[Cookie]], [[Session]] |
| 시크릿 | 코드와 저장소 밖 보관, 교체 절차 | [[Secret-Management\|시크릿 관리]] |
| 전송과 헤더 | HTTPS, HSTS와 보안 헤더 | [[Security-Headers\|보안 헤더]] |
| 추적과 노출 | 감사 로그, 운영 오류 응답의 내부 정보 차단 | [[Audit-Log\|감사 로그]], [[Actuator-Exposure\|Actuator 노출]] |
| 의존성 | 취약점 스캔 | [[Dependency-Vulnerability-Scanning\|의존성 취약점 스캔]] |

한계도 분명하다.

- 목록은 검증이 아니다. AI가 반영했다고 답하거나 AI가 작성한 테스트가 통과해도, 테스트가 실제 공격 경로를 겨냥하는지는 사람이 다시 확인해야 한다.
- 항목이 길수록 매 요청의 토큰 비용이 늘고 핵심 요구가 희석된다. 프로젝트 규칙 파일에 한 번 두고 기능별로 관련 항목만 짚는 편이 낫다.
- 체크리스트는 알려진 항목만 막는다. 이 서비스의 자산, 신뢰 경계와 공격 경로가 무엇인지 묻는 위협 모델링과 설계 리뷰를 대신하지 못한다.

## 클라이언트 보안에 의존하면 안 된다

클라이언트 코드(React, Vue, 모바일 앱)는 결국 사용자에게 전달되고 공격자가 분석할 수 있다.

- **클라이언트에 맡기면 안 되는 것**: 권한 검증, 인증 판단, 핵심 암호화 키 보관
- **클라이언트에서 할 수 있는 보조 보안**: 운영 환경 소스맵 미노출, 불필요한 디버깅 정보 제거
- 최종 권한 판단은 반드시 서버에서. 클라이언트 보안은 어디까지나 보조다.

### 난독화와 매핑 파일

난독화(minification 포함)는 클래스, 함수, 변수 이름에서 의미를 지워 배포물을 읽기 어렵게 만든다. 목적은 보안 하나가 아니다. Android의 R8은 이름을 짧게 바꿔 DEX 크기를 줄이고, 코드 축소와 인라이닝 같은 최적화를 함께 수행한다. 웹 번들의 minify도 주목적은 전송 크기다. 따라서 난독화는 분석 비용을 높여 로직과 지식재산을 보호하는 보조 수단이지, 서버 검증을 대신하는 방어가 아니다.

난독화하면 크래시 스택 트레이스도 읽을 수 없게 된다. 그래서 빌드 도구는 원래 이름과 바뀐 이름의 대응을 기록한 파일을 함께 만든다. Android는 `mapping.txt`, 웹과 npm 번들은 source map(`.map`)이다. 이 파일을 가진 쪽은 스택 트레이스를 원래 이름으로 되돌리고, 원본 구조를 거의 그대로 복원할 수 있다.

- 매핑 파일은 역난독화가 필요한 채널(내부 보관소, Play Console, 크래시 수집 도구)에만 둔다. 사용자에게 배포되는 APK, 웹 정적 파일과 npm tarball에 넣지 않는다.
- Android의 `mapping.txt`는 빌드마다 덮어써지므로 릴리스마다 사본을 보관해야 해당 버전의 크래시를 되돌릴 수 있다.
- npm 패키지는 `package.json`의 `files` 허용 목록으로 포함 대상을 좁히고, 배포 전 `npm pack --dry-run`으로 실제 포함 파일을 확인한다. 번들러가 운영 빌드에도 source map을 기본 생성하는지 확인한다.
- 사례: 2026-03-31 Anthropic의 `@anthropic-ai/claude-code` npm 패키지 한 릴리스에 source map이 포함돼 난독화 전 TypeScript 원본이 노출됐다. Anthropic은 보안 침해가 아니라 사람의 실수로 생긴 릴리스 패키징 문제이며 고객 데이터나 자격 증명은 관련이 없다고 밝혔다. 배포 산출물의 포함 파일 점검이 빠지면 난독화의 효과가 한 번에 사라진다는 점을 보여 준다.

## 학습 경로

웹 해킹을 이해하려면 먼저 공격 대상(웹의 동작)을 알아야 한다. 프론트엔드, 백엔드, HTTP, 세션, 쿠키, DB, 네트워크 흐름을 모르면 공격이 왜 가능한지 설명하지 못한다. 보안 담당자가 개발을 모르면 취약점을 찾아도 조치를 제안하기 어렵고, 개발자가 보안 원리를 알면 설계 단계에서 취약점을 크게 줄인다.

- 실습 기반 플랫폼: Web Security Academy(PortSwigger), webhacking.kr, Dreamhack
- 개념만 읽기보다 직접 공격하고 방어해보는 경험이 오래 남는다.

## 면접 포인트

Q. 보안을 어떻게 접근하나?
- 막는 기능 추가가 아니라 습관으로 본다. 클라이언트 불신, 서버 권한 검증, 최소 노출, 서버 제어 가능한 토큰, 설정 — 이 네 가지를 API 단위로 자문한다.

Q. 자주 발생하는 취약점부터 꼽는다면?
- IDOR(인가 누락), SSRF, XSS, 인증, 인가, 민감정보 노출, 프레임워크 설정 오류. 완벽주의보다 체크리스트 습관이 현실적이다. API 하나 만들 때마다 "다른 사용자가 변조하면?", "이 URL이 내부 주소라면?", "이 값이 탈취되면?"을 한 번 더 묻는다.

Q. 보안팀과 개발팀의 충돌은?
- 배포 직전 검사로만 두면 충돌이 커진다. 설계 단계 참여 + 중요도순 체크리스트로 시큐어코딩을 내재화하면 보안이 막는 조직이 아니라 안전하게 출시하게 돕는 기능이 된다.

## 출처

- [OWASP, Top 10:2025](https://owasp.org/Top10/2025/)
- [애플리케이션 보안 핵심 — 시큐어코딩, IDOR, SSRF, JWT, Spring Actuator (YouTube)](https://www.youtube.com/watch?v=RQv86D0M5YY&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=19)
- [Android Developers, Shrink, obfuscate, and optimize your app](https://developer.android.com/build/shrink-code)
- [Android Developers, Recover the original stack trace](https://developer.android.com/topic/performance/app-optimization/test-and-troubleshoot-the-optimization)
- [npm Docs, package.json files](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#files)
- [Claude Code source leak — InfoQ](https://www.infoq.com/news/2026/04/claude-code-source-leak)
- [웹 SaaS 바이브코딩 보안 프롬프트 체크리스트 — Threads, prompt.daily_](https://www.threads.com/@prompt.daily_/post/DWF07HqkX01)
- [Claude Code 원본 노출과 map 파일 — Threads, lightsoft_crew](https://www.threads.com/@lightsoft_crew/post/DWjQE0ek6bX)

## 관련 문서

- [[IDOR|IDOR / Broken Access Control (인가 누락)]]
- [[SSRF|SSRF (서버 측 요청 위조, 클라우드 메타데이터)]]
- [[SQL-Injection|SQL Injection (파라미터 바인딩과 식별자 자리 한계)]]
- [[XSS|XSS]]
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]]
- [[JWT|JWT (토큰 무효화, 저장 위치)]]
- [[Supply-Chain-Security|공급망 보안]]
- [[Access-Control-Models|RBAC, ABAC, PBAC 접근 제어 모델]]
- [[CORS|CORS]]
- [[CSRF|CSRF]]
- [[Security-Headers|보안 헤더 (CSP, HSTS)]]
- [[Rate-Limiting|Rate Limit 정책 설계]]
- [[Secret-Management|시크릿 관리]]
- [[Audit-Log|감사 로그]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
