---
tags: [security, web-attacks]
status: index
category: "Security - 웹 공격"
aliases: ["Web Attacks"]
---

# 웹 공격(Web Attacks)

CORS, CSRF, XSS, SQL Injection, Command Injection, 파일 업로드, IDOR, SSRF — 웹 기반 공격과 방어.

## 목차

- [x] [[Compressed-Input-Decoder-Security|압축 입력 디코더 보안]] — Brotli의 내장 사본, 도달 가능성, 상류 수정과 실제 재배포의 구분
- [[Signed-Payload-Deserialization|서명된 페이로드 역직렬화]] — 세션 서명과 pickle의 신뢰 경계
- [x] [[CORS|CORS]]
- [x] [[CSRF|CSRF Protection]]
- [x] [[XSS|XSS (Stored/Reflected/DOM, 컨텍스트별 인코딩, CSP, HttpOnly 한계)]]
- [x] [[SQL-Injection|SQL Injection (유형, 주석을 이용한 로그인 우회, prepared statement, TypeORM 바인딩)]]
- [x] [[Command-Injection|Command Injection (셸 없는 인자 배열, 허용 목록, 인자 인젝션과 --)]]
- [x] [[File-Upload-Security|파일 업로드 보안 (웹셸, 확장자 허용 목록, 시그니처 한계, 서버 생성 파일명, 별도 도메인 제공)]]
- [x] [[Security-Headers|Security Headers (CSP, HSTS, X-Frame-Options, Helmet)]]
- [x] [[IDOR|IDOR / Broken Access Control (부적절한 인가, 인증 vs 인가, 소유 조건 조회와 404 응답)]]
- [x] [[SSRF|SSRF (서버 측 요청 위조, 클라우드 메타데이터, 화이트리스트)]]
- [x] [[Capability-URL-Exposure|공유 링크(Capability URL)의 노출 경로 (Referer와 로그, 호스트 이름과 패시브 DNS, 만료와 폐기)]]
