---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security Index"]
---

# 보안(Security)

## 목차

- [[Smart-Contract-Price-Feed-Validation|스마트 컨트랙트 가격 피드 검증]] — 부호, 자릿수와 최신성, 누적값과 TWAP, 장애 시 기능 경계
- [[IoT-Device-and-Firmware-Security|IoT 기기 인증과 펌웨어 보안]] — 식별과 개인키 보유 증명, 인증서 교체, secure boot와 OTA 검증, 업데이트 복구와 지원 기간
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]] — 악용까지의 시간 관측값과 읽는 법, 자산과 소프트웨어 목록, 패치 작성과 적용의 병목, 번들 런타임과 배포 형태별 수정 경로, 패치 시나리오와 단계적 배포, 업데이트 기본값과 패치 물결, 오염된 업데이트와 관찰 기간의 한계, 독립된 다층 통제, AI 방어 자동화의 권한 경계
- [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰 경계]] — 정품 칩 인증과 추가 부품 탐지의 차이, 화면 경로의 비밀 노출
- [[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]] — 통신 암호화와 피싱, 기기 제어의 인증 조건
- [[Elliptic-Curve-Parameter-Provenance|타원곡선 파라미터의 출처]] — 공개 seed 재현과 개인키 복구의 구분, 미해결 선택 과정
- [[Security-Architecture-and-Threat-Modeling|보안 아키텍처와 위협 모델링]] — 데이터 흐름, 신뢰 경계, 자원별 접근과 통제 검증
- [[Forensic-Watermarking|포렌식 워터마킹]] — 배포본 식별, 변형 내성, 검출과 행위 판단의 구분
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]] — 규칙 파일 인젝션과 의존성 대체, 알아채고도 따른 사례, 탐지기의 미탐과 오탐, 리뷰 시점별 점검
- [[Malicious-Agent-Skills|악성 에이전트 스킬]] — 자연어 페이로드의 비중, scanner 비교의 기준, 빈 줄과 HTML 주석과 보이지 않는 Unicode로 숨긴 지시, 메모리 파일 지속성, 설치 전후 점검
- [[Smart-Contract-Reentrancy|스마트 컨트랙트 재진입과 상태 일관성]] — 외부 호출, 상태 변경 순서, 가드의 범위와 산술 버전 경계
- [[AI-Content-Provenance|AI 콘텐츠의 워터마크와 출처 증명]] — 통계적 텍스트 신호, C2PA, 숨은 문자와 탐지 결과의 한계
- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작]] — 숨은 지시와 분석 방해, 조작 시도와 실제 영향의 구분, 수집기별 본문 차이, 인용 세탁과 출처 확인 순서
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개 (CVD)]] — 단계와 역할, 수정 지연의 구조, 사전 통지와 정보 공유 범위, AI로 찾은 버그의 공개 보고와 보고량 증가, 엠바고 유출과 조기 공개 대응
- [[Adversarial-Examples-Decision-Based-Attacks|적대적 예제와 결정 기반 공격]] — 위협 모델과 쿼리 예산, Boundary Attack과 HopSkipJumpAttack, 잠재 공간 변형, 상태 기반 탐지와 강건성 평가 도구
- [[Agent-Execution-Isolation|에이전트 실행 격리]] — MXC 백엔드별 강제 범위, 내부자 위험과 조건부 백도어, 자기 호스팅과 egress 통제의 구분
- [[Memory-Safety-Vulnerabilities|메모리 안전성 취약점]] — 읽기/수명 결함, PHP2Shell의 시도와 성공 및 권한 상승, EDK II의 PXE 부팅 노출, 설정 완화와 앞단 WAF 규칙의 범위, 업데이트와의 구분, 조사 시작일
- [[VM-Guest-to-Host-Escape|VM 게스트에서 호스트로의 탈출]] — 하이퍼바이저 밖 호스트 커널 경로까지 포함한 격리 경계, 검사 후 사용 결함, 게스트가 아닌 호스트 패치와 롤링 재부팅, 에이전트 샌드박스 다층 방어, PwnEscape 사례
- [[Enterprise-Browser-Control|기업용 브라우저 통제]] — Firefox Enterprise의 관리 위치와 early access
- [[Bot-Traffic-Operations|봇 트래픽 운영]] — 요청 로그와 사용자 분석, 차단과 부하 측정, AI 수집기 이름과 실제 요청자, robots.txt 응답 코드와 그룹 규칙, 관찰부터 캐시, 요청 제한, WAF까지 쌓는 순서
- [[Signed-Payload-Deserialization|서명된 페이로드 역직렬화]] — 키 유출과 객체 복원 위험
- [[FIDO-WebAuthn#보안성과 사용자 통제권을 따로 평가한다|패스키 논쟁의 구분]] — 피싱 저항, 인증기 증명과 이전/복구

- [[Inline-vs-Out-of-Path#AI 런타임 검사: API 판정과 실제 차단|AI 런타임 검사 위치]] — 네트워크 인라인과 애플리케이션 검사 API, TLS 가시성, 스트리밍 전달과 차단 시점
- [[Grafana-Shared-Dashboard-Security|Grafana 공유 대시보드 보안]] — 일시정지와 토큰 폐기, 데이터 소스 설정 노출, 브랜치별 수정 기준
- [[Synthetic-Data-Privacy|합성 데이터와 개인정보 보호]] — 합성과 익명성의 구분, DP 보장과 정확도 검증
- [[SSH-Authentication|SSH 인증]] — 서버 인증과 사용자 인증의 분리, 키 교환, 호스트 키 검증, Tailscale 포워딩 권한
- [[OpenSSF-Scorecard|OpenSSF Scorecard]] — 저장소 보안 관행 평가, 검사별 근거와 총점의 한계
- [[Application-Security|애플리케이션 보안 / 시큐어코딩]] — 4대 원칙, 진단 vs 모의해킹, OWASP Top 10, OWASP API Security Top 10:2023, 트렌드 리스크, 클라이언트 불신, 비밀번호 확인 UI와 서버 검증 계약, 학습 경로
- [[Java-Secure-Coding-Guidelines|Java SE 시큐어코딩 가이드라인]] — 명백히 결함 없는 설계와 검사 지점, 서드파티 코드 추적, 자원 한도와 기밀정보, 데이터를 코드로 해석하는 인젝션, XXE와 DTD 제한, API 동작 검증, 역직렬화 필터 계층, Security Manager 비활성화 이후의 격리
- [[CIA-Triad|CIA Triad (기밀성, 무결성, 가용성)]] — 세 보안 목표, 위협과 통제, 트레이드오프와 가장 약한 고리
- [[Security-Policy-and-Assessment|보안 정책과 점검]] — 자산과 위험, 역할별 교육, 점검 범위와 증거, Prowler와 Service Screener, 예외 처리와 재점검
- [[Security-Incident-Response|보안 사고 대응]] — NIST CSF 2.0 수명주기, 로그 상관분석, IOC 검사의 미탐/검사 범위, 자동 차단과 AI 리포트의 실행 경계, 증거 보존과 복구 조건
- [[Access-Control-Models|접근 제어 모델 (RBAC, ABAC, PBAC)]] — 역할, 속성, 정책의 관계, PAP/PDP/PIP/PEP, 하이브리드 설계와 운영
- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session과 비밀번호 변경 재인증, JWT, OAuth2, Token Exchange, FIDO, Refresh Token, Spring Security의 자동 로그인 저장소와 검증
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA, 난수와 파일 키, 저장장치 인증, 이메일 암호화, 인터넷 투표의 검증
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]] — 인벤토리, 공인 TLS 유효기간 단축, 갱신 후 적용 확인과 복구 경계
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — 아카이브 파서 차이, CORS, CSRF, XSS와 프레임 메시지, SQL/Command Injection, 파일 업로드, IDOR, SSRF, 공유 링크
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]] — 운영 엔드포인트 노출, 필요한 것만 열기
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[tech/security/secrets/API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]] — 자격증명 노출, 권한 범위가 곧 공격 표면, 클라이언트/서버 키 구분, 정상 요청 위장 탐지, 사용자 키를 맡는 서비스(BYOK)의 통제와 사고 후 조치
- [[tech/security/secrets/Hardcoded-Credentials|하드코딩된 자격증명]] — 소스 접근이 운영 접근이 되는 경로, 증폭 요인(장기 키, 전체 접근, 메신저 공유, 짧은 로그), 시크릿 스캐닝 한계와 임시 자격증명
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm과 IDE 확장 배포, 아카이브 검사/설치 차이, postinstall/.pth, 전이 의존성, lockfile 핀과 별도 영속성 대응
- [[Dependency-Release-Cooldown|의존성 릴리스 쿨다운]] — 고정, 해시, 쿨다운이 막는 단계, uv, pip, pnpm, npm의 게시 시점 필터와 기본값, 업로드 시각이 없을 때의 차이, 예외 경로와 보안 수정 지연
- [x] [[SaaS-Application-Trust-Compromise|SaaS 앱 신뢰와 자격증명 침해]] — 외부 앱의 기존 권한 악용, 인증과 유출의 구분, 차단과 증거 보존
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — MIT/Apache 고지, GPL 전달 조건, AGPL 네트워크 조건, SaaS와 납품, SPDX/SBOM의 판단 범위
- [[tech/security/network-security/네트워크보안(NetworkSecurity)|네트워크 보안 (Network Security)]] — 경계 보안과 공인 IP 배치, UTM, 보안 장비 배치 순서, 인라인과 아웃오브패스, 포트 미러링과 TAP, IDS와 IPS, ARP 스푸핑과 DAI, ARP 기반 NAC 차단, 망분리와 망연계
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP Top 10 2025, 2026판 순위 변경)]] — 프롬프트 인젝션, Spotlighting과 Instruction Hierarchy의 한계, Dual-LLM과 CaMeL 격리, 가드의 한계, 적응형 공격과 Rule of Two, 민감정보 유출, 공급망, 출력 처리, 과도한 위임, RAG 임베딩, 허위정보, 무제한 소비
- [[tech/security/age-identity-verification/연령신원검증(AgeIdentityVerification)|연령/신원 검증 (Age & Identity Verification)]] — age assurance, IDV, PET, 규제 지형, 제3자 위탁 리스크

## 보강 체크리스트
- [x] [[SQL-Injection|SQL Injection (유형, prepared statement 원리, TypeORM 바인딩, 식별자 자리 한계)]] — 기존 보강: [[Security-Headers#정적 검사 + SQL Injection은 별개|보안 헤더 계층의 범위]], [[Prepared-Statement-Cache#서버 동작|Prepared Statement 기본]]
- [x] [[TLS-Config|TLS config]] — 기존 보강: [[HTTPS-TLS|TLS 핸드셰이크와 버전]], [[Security-Headers#HSTS — HTTPS 강제|HSTS]]
- [x] [[Rate-Limiting|Rate limit 정책 설계 (알고리즘, 계층, 분산 환경, 429 응답)]]
- [x] [[Shield-WAF-NetworkFirewall|WAF]]
- [x] [[Audit-Log|Audit log]] — 기존 보강: [[CloudTrail-Config|AWS API 감사]], [[Secret-Management#운영 필수 항목|Vault Audit Log]], [[Deployment-Automation-ChatOps#보안|ChatOps 감사 로그]]
- [x] [[IAM-Best-Practices#모범 사례|Least privilege IAM]] / [[IAM-Policy|정책 평가와 권한 경계]]
- [x] [[Dependency-Vulnerability-Scanning|Dependency vulnerability scanning]] — 기존 보강: [[Dependency-Management#취약점 스캔|Dependabot, Snyk와 언어별 도구]], [[DevOps-vs-DevSecOps#SCA (의존성)|SCA의 파이프라인 위치]], [[Supply-Chain-Security#방어|공급망 방어]]

## 현장사례
- [[IDOR#실제 사례 — 대규모 API 인가 유출|강남언니 API 인가 유출]] — 객체 수준 인가 부재, 과다 데이터 노출, 형제 엔드포인트 재접근
- [[API-Key-Exposure#사례 — 결제 연동키 노출로 결제내역 조회|토스페이먼츠 결제내역 조회]] — 연동키 노출, 시스템 침입 없는 데이터 유출, 과도한 권한 스코프
- [[API-Key-Exposure#사례 — 코딩 에이전트 서비스에 저장된 AI 공급자 키 노출|OpenCode Console의 AI 공급자 키 노출]] — 사용자 키를 맡은 서비스의 침해, 공급자 차단과 사용자의 직접 폐기
- [[Hardcoded-Credentials#사례 — 하드코딩된 운영 접속키로 3954만 계정 유출|티빙 계정 유출]] — 소스 코드 내 운영 접속키, 개발 환경에서 운영 인프라로 이동, 1차 차단 뒤 다른 키로 재반출
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무 (개념과 현행 규정 범위는 [[Network-Separation|망분리와 망연계]])
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — Argon2id 우선, scrypt 대안, bcrypt는 입력 길이와 work factor 관리가 필요한 레거시 선택지
