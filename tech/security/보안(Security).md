---
tags: [security]
status: index
category: "보안(Security)"
aliases: ["보안(Security)", "Security Index"]
---

# 보안(Security)

## 목차

- [[Targeted-Social-Engineering|표적형 사회공학: 채용 위장과 AI로 개인화한 사기]] — 공개 정보로 만든 신뢰, 사전 채용 과제와 개발 도구 교체를 통한 단말 침해, 내부 도구를 거친 확산과 서명 서비스 접근, 위장 지원자의 원격 채용 침투, 공개 문장을 되비춘 사기 메일, 조직과 구직자의 점검
- [[Personal-Knowledge-Graph-Privacy|기기 안 개인 지식 그래프와 추론 데이터의 프라이버시]] — 메타데이터로 추정한 관계, macOS 지식 그래프의 저장과 보호 범위, 근거보다 오래 남는 결론, 추론 기능의 삭제와 정정 점검
- [[Smart-Device-Data-Collection|스마트 기기의 데이터 수집과 거부의 범위]] — TV의 자동 콘텐츠 인식(ACR)과 수집 주체, 기본값과 동의 단위, 끈 뒤에도 남는 전송과 오프라인 버퍼, 같은 네트워크의 기기 탐색, 음성 저장, 설정을 바꿀 수 없는 주변인
- [[Smart-Contract-Price-Feed-Validation|스마트 컨트랙트 가격 피드 검증]] — 부호, 자릿수와 최신성, 누적값과 TWAP, 장애 시 기능 경계
- [[IoT-Device-and-Firmware-Security|IoT 기기 인증과 펌웨어 보안]] — 식별과 개인키 보유 증명, 인증서 교체, secure boot와 OTA 검증, 업데이트 복구와 지원 기간, 클라우드 의존 기기의 평문 신뢰 앵커와 로컬 동작
- [[Vulnerability-Operations-AI-Agents|취약점 운영(VulnOps)과 보안팀의 AI 에이전트 활용]] — 고치는 속도에 맞춘 운영, 취약점 원장과 중복 묶기, 배포 확인으로 판정하는 완료, 에이전트의 수행과 검증 분리, 여러 모델의 합의와 반증, 소규모 보안팀의 도구 직접 개발, Project Zero의 공개 기한 단축과 패치 격차, Apache mod_http2의 독립 발견과 HTTP/2 끄기 완화, nginx HTTP/2와 nginx2root의 기능별 노출, 완화 범위와 실행 중 워커 확인
- [[Detection-as-Code-AI-SOC|탐지 룰의 코드화(Detection as Code)와 AI 에이전트 보안관제]] — 콘솔 편집의 형상 불일치, 룰 생성과 원본과 배포의 분리, 컴파일러가 주입하는 공통 필드, 임시 탐지 룰과 커버리지 매트릭스, 경보 판정 흐름과 코드 검증, 확인 못 함과 없음의 구분, 싼 모델 분업의 한계, 로컬 LLM 분석 보조와 에이전트 실행의 EDR 흔적
- [[Security-Alert-Triage-Automation|보안 알림 triage 자동화]] — 즉시, 보류, 자동 확인의 세 갈래 판정과 정식 결과로서의 보류, shadow 운영 뒤 켜는 자동 종결, 하루치로 보는 EDR과 DLP 알림, 감시 도구의 감시, Frequency, SNR, 엔트로피로 신호를 먼저 고르는 방식, 확인 범위를 밝히는 조사 에이전트와 조사 경로를 고치는 오답 수정
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격에 대비하는 방어]] — 악용까지의 시간 관측값과 읽는 법, 자산과 소프트웨어 목록, 패치 작성과 적용의 병목, 번들 런타임과 배포 형태별 수정 경로, 패치 시나리오와 단계적 배포, 업데이트 기본값과 패치 물결, 오염된 업데이트와 관찰 기간의 한계, 독립된 다층 통제, AI 방어 자동화의 권한 경계
- [[Security-as-Enabler|가능하게 하는 보안: 위험 평가로 허용 조건을 설계하기]] — 막기만 할 때의 우회와 가시성 상실, 위험 0 목표의 함정, 구체적 위험 정의로 만드는 허용 조건, 사내 AI 허용 기준과 AI Gateway, 에이전트 권한 경계, 바이브 코딩 산출물 전용 인프라, 도달 가능성 기반 패치 우선순위, 가상 패치와 1%, 5%, 25% 단계 배포, 자동화로 만든 여력과 경영진 설득, 보안 솔루션 내재화 사례
- [[AI-Offensive-Testing-Tools|AI 침투 테스트 도구의 운영 위험과 탐지]] — 모델을 부리는 실행 틀로서의 구조, 공격 비용 하락과 외곽 서비스, 점검 도구가 데이터를 지운 실험과 실행 환경으로 정하는 피해 범위, 도구 트래픽 탐지의 수명, 수정 대기열 병목
- [[Hardware-Wallet-Physical-Trust|하드웨어 지갑의 물리적 신뢰 경계]] — 정품 칩 인증과 추가 부품 탐지의 차이, 화면 경로의 비밀 노출
- [[Public-WiFi-Trust-Boundaries|공공 Wi-Fi의 신뢰 경계]] — 통신 암호화와 피싱, 기기 제어의 인증 조건
- [[Elliptic-Curve-Parameter-Provenance|타원곡선 파라미터의 출처]] — 공개 seed 재현과 개인키 복구의 구분, 미해결 선택 과정
- [[Security-Architecture-and-Threat-Modeling|보안 아키텍처와 위협 모델링]] — 데이터 흐름, 신뢰 경계, 자원별 접근과 통제 검증, 가릴 목록 대신 처리 결과를 넘기는 반출 조건(구글 지도 국외반출)
- [[Forensic-Watermarking|포렌식 워터마킹]] — 배포본 식별, 변형 내성, 검출과 행위 판단의 구분
- [[Coding-Agent-Package-Hallucination|코딩 에이전트의 패키지 환각 공격]] — 규칙 파일 인젝션과 의존성 대체, 알아채고도 따른 사례, 탐지기의 미탐과 오탐, 리뷰 시점별 점검
- [[Malicious-Agent-Skills|악성 에이전트 스킬]] — 자연어 페이로드의 비중, scanner 비교의 기준, 빈 줄과 HTML 주석과 보이지 않는 Unicode로 숨긴 지시, 메모리 파일 지속성, 설치 전후 점검
- [[Smart-Contract-Reentrancy|스마트 컨트랙트 재진입과 상태 일관성]] — 외부 호출, 상태 변경 순서, 가드의 범위와 산술 버전 경계
- [[AI-Content-Provenance|AI 콘텐츠의 워터마크와 출처 증명]] — 통계적 텍스트 신호, C2PA, 숨은 문자와 탐지 결과의 한계, 응답을 만든 모델의 검증 가능한 추론 증명, 이미지 탐지기의 영역 표시와 자체 평가 읽기
- [[Web-Content-Manipulation-for-AI|AI가 읽는 웹 콘텐츠의 조작]] — 숨은 지시와 분석 방해, 조작 시도와 실제 영향의 구분, 수집기별 본문 차이, 인용 세탁과 출처 확인 순서
- [[AI-Refusal-Triggers-and-Context-Bombs|AI 분석 회피와 안전 거부 유도]] — 안전 판정 유도와 안전 거부 유도의 구분, 악성 코드의 프롬프트 인젝션, 방어용 context bomb의 실험과 한계, 분석 파이프라인의 거부 처리
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개 (CVD)]] — 단계와 역할, 수정 지연의 구조, 사전 통지와 정보 공유 범위, AI로 찾은 버그의 공개 보고와 보고량 증가, 충돌로 분류된 결함, 대량 발견의 재현과 경로 검증과 패치 동봉, 엠바고 유출과 조기 공개 대응, 공개 뒤 정정된 CVE 레코드와 Store 앱 수정 경로
- [[Adversarial-Examples-Decision-Based-Attacks|적대적 예제와 결정 기반 공격]] — 위협 모델과 쿼리 예산, Boundary Attack과 HopSkipJumpAttack, 잠재 공간 변형, 상태 기반 탐지와 강건성 평가 도구
- [[Agent-Execution-Isolation|에이전트 실행 격리]] — MXC 백엔드별 강제 범위, 내부자 위험과 조건부 백도어, 자기 호스팅과 egress 통제의 구분
- [[Memory-Safety-Vulnerabilities|메모리 안전성 취약점]] — 읽기/수명 결함, PHP2Shell의 시도와 성공 및 권한 상승, EDK II의 PXE 부팅 노출, 설정 완화와 앞단 WAF 규칙의 범위, 업데이트와의 구분, 조사 시작일
- [[VM-Guest-to-Host-Escape|VM 게스트에서 호스트로의 탈출]] — 하이퍼바이저 밖 호스트 커널 경로까지 포함한 격리 경계, 검사 후 사용 결함, 게스트가 아닌 호스트 패치와 롤링 재부팅, 에이전트 샌드박스 다층 방어, PwnEscape 사례와 배포판 수정 상태
- [[VM-Guest-to-Host-Escape-Shared-Kernel|공유 커널 컨테이너에서 호스트로의 탈출]] — 공유 커널 컨테이너에서 microVM으로의 전환, nginx2root의 SCTP 커널 단계와 수정 커밋 상태, 모듈 차단, 기본 seccomp의 한계
- [[Enterprise-Browser-Control|기업용 브라우저 통제]] — Firefox Enterprise의 관리 위치와 early access
- [[Bot-Traffic-Operations|봇 트래픽 운영]] — 요청 로그와 사용자 분석, 차단과 부하 측정, AI 수집기 이름과 실제 요청자, robots.txt 응답 코드와 그룹 규칙, 관찰부터 캐시, 요청 제한, WAF까지 쌓는 순서, 함정 링크 자동 차단과 오탐
- [[Signed-Payload-Deserialization|서명된 페이로드 역직렬화]] — 키 유출과 객체 복원 위험
- [[FIDO-WebAuthn#보안성과 사용자 통제권을 따로 평가한다|패스키 논쟁의 구분]] — 피싱 저항, 인증기 증명과 이전/복구

- [[Inline-vs-Out-of-Path#AI 런타임 검사: API 판정과 실제 차단|AI 런타임 검사 위치]] — 네트워크 인라인과 애플리케이션 검사 API, TLS 가시성, 스트리밍 전달과 차단 시점
- [[Grafana-Shared-Dashboard-Security|Grafana 공유 대시보드 보안]] — 일시정지와 토큰 폐기, 데이터 소스 설정 노출, 브랜치별 수정 기준
- [[Synthetic-Data-Privacy|합성 데이터와 개인정보 보호]] — 합성과 익명성의 구분, DP 보장과 정확도 검증
- [[SSH-Authentication|SSH 인증]] — 서버 인증과 사용자 인증의 분리, 키 교환, 호스트 키 검증, 하드웨어에 묶은 사용자 키, Tailscale 포워딩 권한, musl 환경의 비밀번호 인증 우회
- [[OpenSSF-Scorecard|OpenSSF Scorecard]] — 저장소 보안 관행 평가, 검사별 근거와 총점의 한계
- [[Application-Security|애플리케이션 보안 / 시큐어코딩]] — 4대 원칙, 진단 vs 모의해킹, OWASP Top 10, OWASP API Security Top 10:2023, 트렌드 리스크, 클라이언트 불신, 비밀번호 확인 UI와 서버 검증 계약, 학습 경로
- [[Java-Secure-Coding-Guidelines|Java SE 시큐어코딩 가이드라인]] — 명백히 결함 없는 설계와 검사 지점, 서드파티 코드 추적, 자원 한도와 기밀정보, 데이터를 코드로 해석하는 인젝션, XXE와 DTD 제한, API 동작 검증, 역직렬화 필터 계층, Security Manager 비활성화 이후의 격리
- [[CIA-Triad|CIA Triad (기밀성, 무결성, 가용성)]] — 세 보안 목표, 위협과 통제, 트레이드오프와 가장 약한 고리
- [[Security-Policy-and-Assessment|보안 정책과 점검]] — 자산과 위험, 역할별 교육, 점검 범위와 증거, Prowler와 Service Screener, 예외 처리와 재점검
- [[Security-Incident-Response|보안 사고 대응]] — NIST CSF 2.0 수명주기, 로그 상관분석, IOC 검사의 미탐/검사 범위, 자동 차단과 AI 리포트의 실행 경계, 증거 보존과 복구 조건
- [[Linux-Host-Security-Checks|Linux 호스트 보안 점검]] — 해시 기준선과 보관 위치, 수정 시각의 한계, utmp/wtmp와 process accounting, UID 0과 RID 500, umask 비트 계산과 default ACL, pam_pwquality 음수 credit
- [[Access-Control-Models|접근 제어 모델 (RBAC, ABAC, PBAC)]] — 역할, 속성, 정책의 관계, PAP/PDP/PIP/PEP, 하이브리드 설계와 운영
- [[tech/security/auth/인증(Auth)|인증 (Auth)]] — Session과 비밀번호 변경 재인증, JWT, OAuth2, Token Exchange, FIDO, Refresh Token, Spring Security의 자동 로그인 저장소와 검증
- [[tech/security/crypto/암호(Crypto)|암호 (Cryptography)]] — 패스워드 해싱, 공개키, RSA, 난수와 파일 키, 저장장치 인증과 휴대폰 잠금 상태, 이메일 암호화, 인터넷 투표의 검증, 양자내성암호 전환, PQC 전환 실행(암호 인벤토리 레코드, 수명주기별 발견, 에이전트 기반 전환), 기관용 디지털자산 월렛의 자격증명과 키 관리
- [[Certificate-Lifecycle-Management|인증서 수명주기 관리]] — 인벤토리, 공인 TLS 유효기간 단축, 갱신 후 적용 확인과 복구 경계
- [[tech/security/web-attacks/웹공격(WebAttacks)|웹 공격 (Web Attacks)]] — 아카이브 파서 차이, 정규식 엔진의 공격면, CORS, CSRF, XSS와 프레임 메시지, SQL/Command Injection, 파일 업로드, IDOR, SSRF, 공유 링크
- [[Actuator-Exposure|Actuator 노출 (Security Misconfiguration)]] — 운영 엔드포인트 노출, 필요한 것만 열기
- [[tech/security/secrets/Secret-Management|시크릿 관리 (Secret Management)]] — Vault, K8s Secret 제거, CSI/Injector/AVP/ESO 주입, Auto Unseal, 동적 시크릿
- [[tech/security/secrets/API-Key-Exposure|API 연동 키 노출과 최소 권한 스코프]] — 자격증명 노출, 권한 범위가 곧 공격 표면, 클라이언트/서버 키 구분, 정상 요청 위장 탐지, 사용자 키를 맡는 서비스(BYOK)의 통제와 사고 후 조치
- [[tech/security/secrets/Hardcoded-Credentials|하드코딩된 자격증명]] — 소스 접근이 운영 접근이 되는 경로, 증폭 요인(장기 키, 전체 접근, 메신저 공유, 짧은 로그), 시크릿 스캐닝 한계와 임시 자격증명
- [[Supply-Chain-Security|공급망 보안 (Supply Chain)]] — PyPI/npm과 IDE 확장 배포, 아카이브 검사/설치 차이, postinstall/.pth, 전이 의존성, lockfile 핀과 별도 영속성 대응, Homebrew 탭 신뢰와 cask quarantine
- [[IDE-Extension-Trust-Model|IDE 확장 신뢰 모델과 AI 코딩 도구의 공격 표면]] — 확장의 편집기 동일 권한, 시작 시 활성화와 Workspace Trust 선언, 자동 업데이트 지연, 게시자 신뢰와 허용 목록, MCP 서버와 패키지 경로, 의도된 전송과 침해의 구분, 방어 계층 순서
- [[Dependency-Release-Cooldown|의존성 릴리스 쿨다운]] — 고정, 해시, 쿨다운이 막는 단계, uv, pip, pnpm, npm, Cargo의 게시 시점 필터와 기본값, 업로드 시각이 없을 때의 차이, 저장소 프록시에서 강제하는 쿨다운, 오래된 릴리스에 늦게 붙는 파일과 PyPI 게시 경로 경고, 예외 경로와 보안 수정 지연
- [[Dependency-Patch-Cycle|의존성 패치 반영 지연과 CI 패치 사이클]] — 패치가 나와도 남는 이유, 권고문 전 공백, OSV-Scanner 진단과 guided remediation 전략, 만료 있는 예외, MR 게이트와 예약 스캔
- [x] [[SaaS-Application-Trust-Compromise|SaaS 앱 신뢰와 자격증명 침해]] — 외부 앱의 기존 권한 악용, 인증과 유출의 구분, 차단과 증거 보존
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — MIT/Apache 고지, GPL 전달 조건, AGPL 네트워크 조건, SaaS와 납품, SPDX/SBOM의 판단 범위, DMCA 게시 중단과 포크 네트워크
- [[tech/security/network-security/네트워크보안(NetworkSecurity)|네트워크 보안 (Network Security)]] — 경계 보안과 공인 IP 배치, UTM, 보안 장비 배치 순서, 인라인과 아웃오브패스, 포트 미러링과 TAP, IDS와 IPS, ARP 스푸핑과 DAI, ARP 기반 NAC 차단, 망분리와 망연계, 금융권 망분리 완화와 보안 목적 AI 특례, 호스트의 앱별 아웃바운드 통제, 차세대 방화벽(NGFW)과 TLS 검사, RFC 9411 성능 수치 읽기
- [[OWASP-Agentic-Top-10|OWASP Top 10 for Agentic Applications (2026판)]] — 최소 자율성(Least Agency), ASI01~ASI10의 위험과 완화, 분류 경계, 2025년 사례 대응, 통제 지점별 묶음
- [[Cloud-Security-Posture-and-AI-Assets|클라우드 보안 태세와 AI 자산 보호]] — CSPM, CIEM, CWPP, CNAPP의 범위, AI 자산 목록과 AI-SPM, 관리형 영역과 사각지대, 공격 경로로 줄이는 우선순위, 에이전트의 비인간 신원 관리
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP Top 10 2025, 2026판 순위 변경)]] — 프롬프트 인젝션, Spotlighting과 Instruction Hierarchy의 한계, Dual-LLM과 CaMeL 격리, 가드의 한계, 적응형 공격과 Rule of Two, 민감정보 유출, 공급망, 출력 처리, 과도한 위임, RAG 임베딩, 허위정보, 무제한 소비
- [[Agent-Governance-Controls#데이터 등급이 외부 AI 허용 범위를 정한다|외부 AI 사용의 데이터 등급 통제]] — 등급별 허용 범위, 기밀 문서 색인의 유사도로 거르는 전송 전 차단, 응답 비식별과 로그 탐지, 단계별 한계
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
- [[API-Key-Exposure#사례 — 배포 플랫폼의 환경 변수 저장소 침해|Railway 환경 변수 저장소 침해]] — 플랫폼 쪽 비밀 저장소 침해, 봉투 암호화로 키 단위 특정이 어려운 영향 범위, 모든 사용자의 저장 비밀 교체
- [[Hardcoded-Credentials#사례 — 하드코딩된 운영 접속키로 3954만 계정 유출|티빙 계정 유출]] — 소스 코드 내 운영 접속키, 개발 환경에서 운영 인프라로 이동, 1차 차단 뒤 다른 키로 재반출
- [[Kakao-Ent-Seminar#보안|카카오엔터 보안]] — 서비스 접근 권한, 네트워크 망 설정
- [[Fintech-Seminar#망분리|금융 망분리]] — 법적 망분리 의무 (개념과 현행 규정 범위는 [[Network-Separation|망분리와 망연계]])
- [[TS-Backend-Meetup-1#Cryptographic Hash 101|패스워드 해싱]] — Argon2id 우선, scrypt 대안, bcrypt는 입력 길이와 work factor 관리가 필요한 레거시 선택지
