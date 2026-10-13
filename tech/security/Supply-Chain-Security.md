---
tags: [security, supply-chain, dependency, devsecops, ai-tooling]
status: done
verified_at: 2026-08-05
category: "보안(Security)"
aliases: ["Supply Chain Security", "공급망 공격", "공급망 보안", "의존성 공격", "AI 네이티브 보안 딜레마"]
---

# 공급망 보안 (Supply Chain Attack)

공급망 공격은 **신뢰하는 패키지나 배포 경로를 통해 악성코드를 주입하는 공격**이다. 직접 작성하거나 리뷰하지 않은 코드가 빌드, 설치 시점에 실행되기 때문에, 내 코드가 멀쩡해도 의존성 하나가 머신 전체를 장악할 수 있다. 패키지 레지스트리(PyPI, npm 등)가 표준 배포 경로가 되면서 공격자가 노리는 핵심 표면이 됐다.

## 공격 벡터

### 배포 경로 우회

정상 릴리스 프로세스(GitHub, CI/CD)를 거치지 않고 레지스트리에 악성 버전을 직접 올린다.

- **메인테이너 계정 탈취** 후 npm/PyPI CLI로 수동 배포 → CI 검증, 코드 리뷰, 태그를 전부 우회
- **소스 저장소에 없는 버전이 레지스트리에만 존재**하는 형태가 대표 신호 (GitHub엔 없는데 PyPI엔 1.82.x가 올라옴)

### 설치 시점 자동 실행

코드를 import하지 않아도 **설치만으로 실행**되는 후크를 악용한다.

- **npm `postinstall` 스크립트**: 패키지 설치 직후 임의 코드 실행
- **Python `.pth` 파일**: site-packages에 놓이면 Python 프로세스가 시작될 때마다 자동 실행
- 둘 다 의존성으로 설치되는 경로에서 실행될 수 있으므로, 직접 사용 여부와 무관하다

### 가짜 의존성 주입

악성 버전이 **소스 어디에서도 import하지 않는 의존성**을 추가한다. 그 패키지의 유일한 목적은 postinstall로 RAT(원격 접근 트로이목마) 같은 페이로드를 실행하는 것. lockfile만 봐서는 정상 의존성처럼 보인다.

## 페이로드가 하는 일

설치된 악성코드의 전형적 행동 단계:

1. **크레덴셜 수집** — SSH 키, `.env`, AWS/GCP/Azure 인증정보, K8s 설정, DB 비밀번호, 쉘 히스토리
2. **유출(exfiltration)** — 수집물을 암호화(예: AES-256-CBC)해 외부 C2 서버, 도메인으로 전송
3. **횡이동(Lateral Movement)** — K8s 서비스 어카운트 토큰이 있으면 클러스터 전체 시크릿을 읽고 백도어 Pod 생성, 다단계 페이로드 다운로드
4. **흔적 제거** — 실행 후 자기 자신을 삭제해 포렌식 증거를 없앰

**설치 한 번으로 그 머신의 모든 키가 탈취된 것으로 간주**해야 한다.

## 전이 의존성 리스크 (transitive dependency)

직접 쓰지 않는 패키지도 위험하다. 의존성의 의존성으로 딸려오기 때문이다.

- AI 코딩 도구의 플러그인(예: MCP 플러그인, 서버)이 내부적으로 특정 LLM 프록시 라이브러리나 HTTP 클라이언트를 끌어온다
- 보안, 모니터링을 위해 설치한 CI/CD 도구가 내부에서 취약 패키지를 의존성으로 쓰면, **보안을 지키려고 깐 도구가 오히려 공격 경로**가 되는 역설이 생긴다

그래서 "우리는 그 패키지 안 써요"는 안전의 근거가 못 된다. lockfile 전체를 봐야 한다.

## AI 네이티브 조직의 공격 표면 확대

전 직원이 AI 도구를 쓰기 위해 터미널을 열고 `pip install`, `npm install`을 하면, **전 직원의 머신이 공급망 공격의 표면**이 된다. 그중에는 SSH 키가 뭔지, `.env`가 왜 위험한지 모르는 비개발자도 포함된다. 생산성을 위한 개방이 곧 공격 표면의 확대로 직결된다.

여기에 더해 브라우저 제로데이(악성 HTML 렌더링만으로 샌드박스 내 코드 실행) 같은 **기존 보안 운영 부담**은 그대로 남는다. AI 도구 리스크는 이 기본 부담을 없애주는 게 아니라 그 위에 추가된다.

### 상방-하방 딜레마

- **상방(개방)** — 전 직원에게 AI 도구를 열어 생산성을 끌어올림. 그러나 보안 인력이 충분치 않으면 잦은 전사 대응(버전 점검, 크레덴셜 로테이션, 패치 공지)을 감당 못 함
- **하방(통제)** — 지식 있는 사람만 도구를 설치하고 의존성과 환경을 통제하면 위험을 줄일 수 있지만, 전 직원의 자유로운 AI 활용에는 제약이 생김

정답이 있는 문제가 아니라 **조직 상황(보안/데브옵스 인력, 데이터 민감도)에 맞게 어디쯤 설지 선택하는 문제**다. 가장 위험한 건 이 고민 자체를 하지 않고 개방의 매력에만 끌려 하방 상태를 돌아보지 않는 것이다. AI 생태계가 커질수록 공격 표면도 함께 커지므로 빈도는 줄지 않는다.

## 방어

### 예방 (설치 전, 빌드 단계)

- **lockfile 고정 + 무결성 검증**: `npm ci`(lockfile 그대로 설치), 해시 핀(`pip install --require-hashes`), 버전 범위 대신 정확한 버전 핀
- **설치 스크립트 차단**: `npm install --ignore-scripts`로 postinstall 차단, 신뢰 패키지만 예외
- **사설 레지스트리, 프록시**: 외부 레지스트리를 그대로 바라보지 않고 검증된 미러(Artifactory, Verdaccio)만 사용
- **업데이트 지연 정책**: Renovate, Dependabot에 cooldown을 둬 갓 배포된 버전을 즉시 받지 않음 (악성 버전은 보통 빠르게 내려감)
- **SCA, SBOM**: [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]]과 SBOM으로 무엇이 깔렸는지 항상 파악
- **provenance 검증**: Sigstore, npm provenance로 "이 아티팩트가 그 소스에서 그 CI로 빌드됐는가" 확인
- **런타임 격리, 최소 권한**: 개발 환경의 egress 제한(C2 통신 탐지), 단기 토큰, 최소 권한 IAM, EDR

### 아티팩트 저장소의 역할과 보안 통제

2026-10-13 Sonatype Nexus Repository 공식 문서 부분 대조 기준이다. 저장소를 경유한다는 사실과 보안 정책으로 반입을 차단한다는 사실은 구분한다.

- **Proxy:** 외부 저장소의 구성요소를 가져와 캐시한다. 캐시가 있다는 이유로 원격 조회가 영구히 사라지는 것은 아니며 캐시 설정에 따라 다시 확인한다.
- **Hosted:** 내부 릴리스 등 직접 게시한 구성요소의 정본을 저장한다.
- **Group:** 여러 저장소를 한 URL로 제공한다. 구성한 저장소 순서대로 구성요소를 찾으므로 포함된 저장소와 순서도 검토 대상이다.

이 기능들은 저장과 배포 경로를 정리한다. 정책 위반 구성요소의 격리는 아래 Repository Firewall 설정으로 따로 확인한다. 운영 점검 제안은 빌드가 실제로 사용하는 저장소 URL, group 구성과 격리 결과를 함께 확인하는 것이다. 문서 전체의 공격 사례를 재검증한 것은 아니므로 `verified_at`은 유지한다.

### 패키지 정책의 탐지와 실제 차단

2026-10-13 Cloudsmith 공식 문서 부분 대조 기준이다. 아래는 정책 집행의 구체적인 예이며 다른 레지스트리의 동작까지 보장하지 않는다.

- **탐지와 격리:** vulnerability policy는 임계값 이상 취약점을 찾더라도 자동 격리 옵션이 꺼져 있으면 위반 표시만 남긴다. 스캔 결과가 있다는 사실과 다운로드가 막혔다는 사실을 구분한다.
- **전파와 캐시:** 새 deny policy는 upstream에서 직접 프록시하는 미캐시 패키지에 즉시 적용하지만 기존 패키지는 백그라운드로 처리한다. 정책 상태가 `Pending`에서 `Complete`로 바뀌는지 확인한다. 긴급하면 기존 아티팩트의 수동 격리도 검토하며, 전파 완료 뒤에도 최근 다운로드한 사용자는 CDN 캐시 때문에 잠시 다시 받을 수 있다.
- **검사 단위:** deny policy로 Docker 이미지 이름이나 digest를 차단할 수 있지만, 이미지 내부 SBOM 구성요소에 같은 정책이 적용되는 것은 아니다. Python 패키지 차단만으로 그 패키지를 포함한 이미지까지 차단됐다고 판단하지 않는다.

운영 제안: 미캐시 다운로드, 기존 저장 아티팩트와 컨테이너 이미지를 각각 시험하고 정책 위반 표시, 격리 상태와 다운로드 결과를 함께 남긴다. 레지스트리 차단과 이미 배포한 워크로드의 영향 조사는 별도 작업이다.

### 반입 전 조회와 프록시 격리는 별도 통제다

2026-10-13 Sonatype Guide와 Repository Firewall 공식 문서 부분 대조 기준이다. 아래는 해당 제품의 통제 경계이며 다른 스캐너에 그대로 적용하지 않는다.

- **선택 전 조회:** Sonatype MCP Server의 `getComponentVersion`, `getLatestComponentVersion`, `getRecommendedComponentVersions`는 각각 특정 버전 정보, 최신 버전 정보와 권장 버전 후보를 제공한다. 현재 버전을 생략한 권장 조회는 처음 도입할 버전 후보를 반환한다. 서버는 요청에 포함된 의존성 정보를 처리하며 소스 저장소나 로컬 파일 전체를 검사하지 않는다.
- **다운로드 차단:** Repository Firewall에서 격리를 활성화하고 `PROXY` 단계 정책을 `FAIL`로 설정하면 정책에 위반된 신규 요청 구성요소를 격리한다. 기존 프록시 구성요소는 감사하지만 자동 격리하지 않으므로, 설치된 의존성과 배포된 애플리케이션의 위험 관리는 별도로 수행한다.
- **검사 서비스 장애:** 격리가 활성화된 상태에서 Firewall 서비스를 사용할 수 없으면 신규 구성요소를 평가하고 해제할 때까지 격리한다. 기존 캐시와 신규 다운로드의 가용성 영향을 구분한다. 위반 면제는 위험 수용이지 위험 제거가 아니다.

운영 제안: AI의 버전 추천 결과, 실제 lockfile의 버전과 다운로드 통제 결과를 대조한다. 추천 조회 성공을 설치 차단이나 전체 의존성 검사 완료로 계산하지 않는다. 실제 제품을 설치하거나 차단 시험을 수행한 기록은 아니다.

### AI 모델과 컨테이너의 검사 범위

2026-10-13 JFrog Xray 공식 지원 문서 부분 대조 기준이다. 모델을 저장하고 버전을 관리하는 기능과 그 모델의 위험을 검사하는 기능은 구분한다.

- **저장소 범위:** Artifactory의 local repository는 Xray 색인 설정 뒤 검사한다. remote repository는 캐시된 아티팩트만 검사하며 upstream 레지스트리 전체를 검사하지 않는다.
- **컨테이너와 모델:** 컨테이너 이미지의 OS 패키지, 의존성과 포함된 ML 모델을 검사하지만 모델의 출처에 따라 라이선스와 악성 모델 탐지 지원이 달라진다. 같은 이미지 안에 있다는 이유로 모든 구성요소가 같은 검사를 받았다고 판단하지 않는다.
- **결과의 의미:** Xray는 모델 자체에 CVE 취약점 결과를 보고하지 않는다. CVE가 없다는 결과만으로 모델의 악성 동작이나 출력 안전성이 검증됐다고 해석하지 않는다.

운영 점검 제안: 반입한 모델과 실행 이미지의 버전, 실제 검사 대상과 지원 범위, 승인한 배포 대상을 함께 기록한다. 검사하지 못한 구성요소를 정상으로 집계하지 않는다. 이 절의 검사 범위만 대조했으며 문서 전체의 검증일은 유지한다.

Sonatype의 Hugging Face 분석은 모델 파일 디렉터리를 IQ CLI로 검사하거나 Jenkins 및 IQ Server UI로 평가할 수 있다(2026-10-13 공식 문서 대조). 지원 형식과 실행 버전을 확인한다. IQ release 189부터는 전체 모델을 다운로드하지 않은 Git LFS pointer도 분석할 수 있으며, IQ CLI 2.3.0은 pointer로 모델 식별자를 알아낸다. 따라서 모델 식별과 정책 평가 결과를 파일 전체의 직접 검사나 추론 출력 안전성 검증으로 확대하지 않는다(검사 범위에 대한 해석). 프록시 반입 통제와 애플리케이션 분석도 별도 기능으로 확인한다.

### 대응 플레이북 (사고 발생 시)

1. 영향받는 버전, 아티팩트가 깔렸는지 확인 (lockfile, `pip show`, `node_modules` 내 의심 패키지)
2. 확인되면 **그 머신의 모든 크레덴셜을 탈취당한 것으로 간주**
3. SSH 키, 클라우드 크레덴셜, API 키, DB 비밀번호를 **전체 로테이션**, 감염 머신 격리
4. 크레덴셜 관리, 로테이션 체계는 [[Secret-Management|시크릿 관리]] 참고
5. 브라우저 등 제로데이는 전사 즉시 업데이트 공지 + 적용 여부 확인

## 면접 체크포인트

- 직접 작성한 코드에 문제가 없어도 공급망 공격이 위험한 이유 (postinstall과 `.pth`의 실행 경로)
- 전이 의존성 때문에 "그 패키지 안 써요"가 안전 근거가 못 되는 이유
- 침해 시 모든 크레덴셜의 탈취 가능성을 검토하고 로테이션하는 이유
- lockfile 고정, `--ignore-scripts`, 해시 핀, 사설 레지스트리, provenance의 역할
- AI 네이티브 조직의 상방-하방 트레이드오프와 조직별로 답이 다른 이유

## 사례

- **litellm (PyPI, 2026-03-24)** — 공급자 공지 기준, 공격자가 공식 CI/CD 워크플로를 우회해 `1.82.7`, `1.82.8`을 PyPI에 직접 업로드(GitHub 저장소 자체는 미침해). `1.82.8`에는 `litellm_init.pth`가 들어 있어 파이썬 프로세스 시작마다 자동 실행되며 환경변수, SSH 키, 클라우드 크레덴셜(AWS, GCP, Azure), K8s 토큰, DB 비밀번호를 수집해 외부 도메인으로 유출. 10:39 UTC부터 약 40분간 노출됐고, 공지는 AI 에이전트 프레임워크, MCP 서버, LLM 오케스트레이션 도구를 통해 핀 없이 전이 의존성으로 딸려 들어온 경우도 영향 대상으로 명시.
- **axios (npm, 2026-03-31)** — 리드 메인테이너 npm 계정이 탈취돼 `1.14.1`과 `0.30.4`가 배포. 소스에서 import하지 않는 `plain-crypto-js` 의존성이 설치 시점에 크로스플랫폼 RAT를 내려받아 실행했고, 약 3시간 뒤 npm에서 제거. `@datadog/datadog-ci`가 `axios: ^1.13.5`를 의존성으로 선언해 lockfile 없이 설치하면 악성 버전으로 해석되는 경로가 보고됨.
- **Chrome 제로데이 (2026-02-13)** — CSS use-after-free 취약점(CVE-2026-2441)을 수정한 스테이블 업데이트가 배포됐고, 릴리스 노트에 악용 사례가 실제로 존재한다고 명시. AI 도구와 무관한 기본 보안 운영 부담의 예.

## 출처
- [Sonatype, Repository Types](https://help.sonatype.com/en/repository-types.html)
- [Sonatype, Sonatype MCP Server](https://help.sonatype.com/en/automate-with-sonatype-guide.html)
- [Sonatype, Firewall Quarantine](https://help.sonatype.com/en/firewall-quarantine.html)
- [Sonatype, Hugging Face Model Analysis](https://help.sonatype.com/en/hugging-face-model-analysis.html)
- [JFrog, Supported Technologies](https://docs.jfrog.com/security/docs/supported-technologies-xray)
- [Cloudsmith, Package deny policy](https://docs.cloudsmith.com/policy-management/deny-policy)
- [Cloudsmith, Vulnerability policy](https://docs.cloudsmith.com/policy-management/vulnerability-policy)
- [Security Update: Suspected Supply Chain Incident — LiteLLM](https://docs.litellm.ai/blog/security-update-march-2026)
- [CRITICAL: Malicious litellm_init.pth in litellm 1.82.8 — BerriAI/litellm Issue #24512](https://github.com/BerriAI/litellm/issues/24512)
- [Post Mortem: axios npm supply chain compromise — axios/axios Issue #10636](https://github.com/axios/axios/issues/10636)
- [Supply chain risk: runtime `npx` install exposes users to transitive dependency attacks — DataDog/junit-upload-github-action Issue #49](https://github.com/DataDog/junit-upload-github-action/issues/49)
- [Stable Channel Update for Desktop (2026-02-13) — Chrome Releases](https://chromereleases.googleblog.com/2026/02/stable-channel-update-for-desktop_13.html)
- 공급망 공격과 AI 네이티브 조직의 보안 딜레마 — 개인 블로그 에세이 (상방-하방 딜레마 등 조직 관점 서술의 출처)

## 관련 문서
- [[Secret-Management|시크릿 관리]] — 크레덴셜 로테이션, 동적 시크릿
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]] — SCA, SBOM
- [[Dependency-Selection|의존성 선택]] — 도입 전 선별 단계의 공급망 신호 확인
- [[Open-Source-License-Review|오픈소스 라이선스 검토]] — 포함 구성요소의 재배포 허가와 고지/소스 제공 조건
- [[Dependency-Management|의존성 관리]] — lock 파일 3계층, semver 범위, 언어별 패키지 매니저
- [[보안(Security)|보안 인덱스]]
