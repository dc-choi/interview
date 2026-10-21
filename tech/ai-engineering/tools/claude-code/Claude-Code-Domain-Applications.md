---
tags: [ai, claude-code, domain, creator, research, finance, legal, medical, plugin, claude-managed-agents]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Domain Applications", "클로드 코드 도메인 응용", "전문 도구 위임"]
verified_at: 2026-10-21
---

# Claude Code 도메인 응용 — 크리에이터, 연구, 금융, 법무, 의료

전문 도메인(콘텐츠, 연구, 재무, 법무, 의료)에 AI 에이전트를 적용하는 패턴. 비즈니스 자동화와 골격은 같지만 세 가지가 도드라진다 — **전문 도구를 Claude가 대신 다루고**, **도메인 표준을 프롬프트에 명시하며**, **검증과 전문가 최종 판단을 워크플로우에 내장**한다. 같은 스킬을 데스크톱 플러그인과 관리형 런타임으로 나눠 배포하면 [[#금융 참조 구현은 같은 스킬을 두 실행 경로로 배포한다|사본과 권한 경계]]도 점검한다.

## 전문 도구는 Claude가 다룬다

사용자가 명령어를 몰라도 Claude가 전문 도구의 스크립트를 생성하고 "실행해줘"로 잇는다. 비개발자는 Cowork 탭에 파일 드래그로 같은 결과.

| 도메인 | 위임하는 도구 |
|---|---|
| 크리에이터 | FFmpeg(영상 변환/자막), Whisper(자막 생성), yt-dlp(챕터/자막 추출) |
| 연구 | pandas, statsmodels(통계), matplotlib(출판용 그래프) |
| 금융 | pandas(재무 분석), DCF 모델 스크립트 |

예: 쇼츠 9:16 크롭은 crop 수학(1080×9/16=608, 시작X=(1920-608)/2=656 → `crop=608:1080:656:0`)을 Claude가 계산. FFmpeg `-ss`를 `-i` 앞에 두면 디코딩 전 탐색으로 빨라지는 최적화까지.

## 설정 파일 우선 파이프라인

모든 도메인이 같은 형태 — 기준 정보를 md 파일로 먼저 만들고, 중간 산출물을 파일로 저장해 다음 단계 입력으로 연결한다.

- 크리에이터: `voice-pack.md`(내 글 3~5개 분석한 어투 규칙, CLAUDE.md에 추가하면 전 세션 적용), `content-config.md` → `calendar.md`, `news-sources.md` → 수집 스크립트
- 원소스 멀티유즈: 영상 트랜스크립트 하나 → 블로그(SEO 구조 재배치), 트위터 쓰레드, 인스타 캐러셀, 링크드인을 플랫폼 글자수에 맞춰 일괄 생성. 영상과 블로그는 구조가 달라 **순서 재배치가 필수**

## 도메인 표준을 프롬프트에 명시

결과 품질은 도메인 기준을 얼마나 구체적으로 주는가로 갈린다.

- **연구**: APA 7th 인용 규칙, 검정 자동 선택(Shapiro-Wilk 정규성 + Levene 등분산 선검정 → Student/Welch t-검정), 결과를 APA 형식으로("t(98)=4.21, p<.001, d=0.84"), 300 DPI 출판용 그래프. 랜덤 시드 고정이 재현성 기본
- **금융**: 한국 법인세상 내용연수 5년의 상각률은 정액법 0.200, 정률법 0.451이며 자산 종류에 허용되는 방법과 법인이 신고한 상각방법을 확인, 월말 마감의 차대 균형 검증("자산총계 = 부채 + 자본"), DCF의 FCFF = 영업이익×(1-세율)+감가상각-설비투자-운전자본증감, WACC(CAPM), Gordon Growth 터미널 가치, WACC×영구성장률 민감도 매트릭스
- **법무**: 계약서 위험 6영역(손해배상 무제한, 일방 해지, IP 귀속 등)을 조항 번호 + 원문 인용 + 위험도 표로, NDA 체크리스트, 소송 문서 타임라인(날짜 불명은 [추정] 표시)
- **의료**: SOAP 진료기록 구조, ICH-GCP E6의 16개 임상시험 프로토콜 구성 항목(E6(R3) Appendix B.1~B.16), CMS-1500 청구서, PA 사전승인(NPI, CPT, ICD-10)

## 검증을 워크플로우에 내장하고 전문 판단은 사람이

AI 산출물은 전 도메인에서 **초안**이다. 검증 스텝을 흐름에 넣고, 전문 판단은 전문가가 최종 확인한다.

- 내장 검증: 수치의 출처 페이지 표시(논문 데이터), 차대 균형 검증(회계), 원문 대조(인용, 계약서), \cite와 bib 대조(참고문헌 누락/미사용)
- 사람 몫: 법률 자문(변호사), 세무 신고(세무사), 통계 해석/베타값 입력(Claude에게 맡기면 임의 숫자), 벤더 선정 가중치(팀 합의), 의료 판단(의료진, RA, IRB)
- **AI가 원본에 없는 정보를 추가**할 수 있어 특히 인용, 소멸시효 날짜, 의료 정보는 원본 대조 필수

## 민감 정보와 규제

기밀 계약서, 미공개 재무, PHI(환자 정보)는 업로드 전 보안 정책 확인이 공통 전제. 의료는 규제가 1급 제약 — HIPAA 비식별화, 실환자 데이터는 IRB 승인, 임상 사용은 FDA SaMD/MFDS 의료기기 승인. 변호사-의뢰인 특권 문서 업로드는 특권 훼손 위험. 합성 데이터 성능(AUC 0.95)이 실데이터(0.70)와 다를 수 있음.

## 금융 참조 구현은 같은 스킬을 두 실행 경로로 배포한다

같은 스킬과 에이전트 정의를 데스크톱 플러그인과 관리형 런타임 두 경로로 배포하면 원본과 사본의 drift, 에이전트별 권한 분리와 배포 요청의 API 호환을 함께 점검해야 한다. 아래는 Anthropic이 2026-05-05 발표한 금융 에이전트 템플릿 10종의 공개 저장소 `anthropics/financial-services`(Apache License 2.0)를 2026-10-21 main 기준으로 대조한 사례다. 저장소 구성, API 상태와 데이터 보존 조건은 그날 확인한 것이며, 스크립트는 읽어서 대조했고 설치, 배포와 테스트는 실행하지 않았다. Claude Code에서는 마켓플레이스를 추가한 뒤 핵심 플러그인부터 설치한다(README 명령 가운데 일부).

```bash
claude plugin marketplace add anthropics/financial-services
claude plugin install financial-analysis@claude-for-financial-services
claude plugin install equity-research@claude-for-financial-services
```

- **두 실행 경로**: 같은 스킬과 에이전트 프롬프트를 바탕으로 Cowork나 Claude Code 플러그인으로 설치하거나, 에이전트 루프와 실행 환경을 제공하는 Claude Managed Agents API(beta)로 배포해 자체 워크플로우 엔진에서 호출한다(관리형 경로의 하위 에이전트는 cookbook의 별도 프롬프트를 쓴다). 발표 기준으로 플러그인은 분석가의 데스크톱 소프트웨어를 쓰며 분석가 곁에서 돌고, Claude Managed Agents는 Claude Platform에서 자율 실행되며 도구별 권한, 관리형 자격 증명 보관소와 Console 감사 로그를 둔다. Claude Managed Agents는 대화 기록, 샌드박스 상태와 산출물을 서버에 저장해 현재 ZDR 적용 대상이 아니므로([[Claude-Code-Cloud-Security|ZDR 범위]]) 미공개 재무 자료는 [[#민감 정보와 규제|민감 정보 확인]]을 먼저 거친다. HIPAA BAA 적용 대상도 아니므로 PHI는 비식별화한 데이터만 쓴다(운영 제안)
- **구성**: 에이전트 플러그인 10개(pitch-agent, earnings-reviewer, gl-reconciler, kyc-screener 등)가 고객 커버리지와 자문, 리서치와 모델링, 펀드 사무관리와 재무 운영, 운영과 온보딩 업무를 나눠 맡는다. 스킬 원본은 업무 영역별 플러그인 6개(financial-analysis, investment-banking, equity-research, private-equity, fund-admin, operations)에 있고, 데이터 제공사가 만든 파트너 플러그인(lseg, sp-global)도 따로 있다. MCP 데이터 커넥터는 핵심 플러그인 financial-analysis에 모았고 확인한 earnings-reviewer 에이전트 플러그인에는 커넥터 설정이 없으므로, 에이전트만 설치해서는 커넥터가 따라오지 않는다. financial-analysis를 함께 설치한 뒤에도 에이전트가 커넥터 도구를 실제로 받는지 확인한다(운영 제안). 커넥터는 제공사 구독이나 API 키가 필요할 수 있다. 설치 방식과 신뢰 경계는 [[Claude-Code-Customization#플러그인 — 확장을 묶어 설치하는 단위|플러그인과 마켓플레이스]]를 따른다
- **경계**: README는 산출물을 자격 있는 전문가가 검토할 초안으로 두고, 에이전트가 투자 추천, 거래 실행, 리스크 인수, 원장 기록, 온보딩 승인을 하지 않으며 모든 산출물을 사람 서명 전 단계에 둔다고 명시한다. [[#검증을 워크플로우에 내장하고 전문 판단은 사람이|전문가 최종 판단]]을 제품 범위로 정해 둔 예다
- **스킬 예**: equity-research의 earnings-preview(플러그인 스킬 네임스페이스 규칙상 `/equity-research:earnings-preview`, 설치 뒤 `/` 목록으로 확인)는 실적 발표 전 1쪽 프리뷰를 만든다. 매출과 EPS 컨센서스를 웹 검색으로 모으되 출처와 날짜를 적는다. 재무 지표와 업종별 운영 지표는 개수를 정하지 않은 채 중요도 순으로 정리하고, 강세, 기본, 약세 시나리오를 매출, EPS, 핵심 동인, 주가 반응 열의 표로 만든다. 주가 반응은 과거 실적 발표 때의 움직임과 옵션 내재 변동폭에 비춰 보고 반응을 가를 촉매 3~5개를 체크리스트로 둔다. 컨센서스 해석은 [[Stocks#좋은 실적과 기대를 넘는 실적은 다르다|기대와 실적의 차이]]를 본다
- **사본 관리**: 에이전트 플러그인에는 쓰는 스킬의 동기화 사본이 들어 있어 스킬을 따로 설치할 필요가 없다. `scripts/sync-agent-skills.py`가 원본 변경을 사본에 전파하고, `scripts/check.py`는 매니페스트 검사와 파일 간 참조 확인에 더해 사본이 원본에서 벗어나면 실패한다. README는 푸시 전에 이 검사를 돌리라고 안내하지만 확인한 pre-commit 훅과 GitHub Actions 워크플로우는 check.py를 부르지 않아 drift 검사는 수동 실행에 기댄다. 관리형 런타임 cookbook도 같은 에이전트 플러그인의 사본을 참조하므로, 확인할 drift는 원본과 사본 사이, 저장소와 `/v1/skills`에 올린 스킬 사이에 있다(설계 점검)
- **관리형 런타임 배포**: cookbook과 배포 스크립트로 같은 에이전트를 Claude Managed Agents에 올릴 때의 권한 배치, 인계 신호와 API 필드 차이는 [[Agent-Runtime-Deployment#플러그인 스킬을 관리형 런타임으로 옮기는 Claude Managed Agents|에이전트 런타임과 배포]]에서 다룬다. 도구 설정상의 에이전트별 분리는 같은 샌드박스와 파일시스템, 원문을 직접 읽으라는 오케스트레이터 프롬프트 때문에 격리로 이어지지 않는다

## 체크포인트

- 전문 도구(FFmpeg, statsmodels)를 사용자가 몰라도 Claude가 다룰 수 있게 위임하는가
- 도메인 표준(APA, 세법, ICH-GCP)을 프롬프트에 구체적으로 명시하는가
- 검증 스텝(출처 표시, 균형 검증, 원문 대조)을 워크플로우에 넣었는가
- 전문 판단(법률, 세무, 의료, 통계 해석)을 AI 초안으로만 쓰고 전문가가 확정하는가
- 민감 정보 업로드 전 규제(HIPAA, IRB, 특권)를 확인하는가
- 원본 스킬, 에이전트 플러그인 사본과 업로드한 스킬의 drift를 검사하고, 그 검사가 훅이나 CI에서 자동으로 도는가
- 비신뢰 문서를 읽는 에이전트의 도구 분리가 실제 배포 요청에 실렸는지, 다른 에이전트의 프롬프트와 도구 호출 기록에서 그 문서를 직접 읽지 않는지 확인하는가

## 출처

- [ICH E6(R3) Good Clinical Practice Guideline](https://database.ich.org/sites/default/files/ICH_E6%28R3%29_Step4_FinalGuideline_2025_0106.pdf)
- [국가법령정보센터, 법인세법 시행규칙 별표 4](https://www.law.go.kr/LSW/flDownload.do?bylClsCd=110201&flSeq=153978971&gubun=)
- [국가법령정보센터, 법인세법 시행령 제26조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032175685)
- [클로드 코드 가이드 (크리에이터/연구/금융/법무HR/의료 파트) — WikiDocs](https://wikidocs.net/book/19104)
- [Agents for financial services — Anthropic](https://www.anthropic.com/news/finance-agents)
- [anthropics/financial-services — GitHub, Anthropic](https://github.com/anthropics/financial-services) — 2026-10-21 main(574ed36, 2026-09-21 커밋) 기준 README, LICENSE, `.claude-plugin/marketplace.json`, `scripts/check.py`, `scripts/sync-agent-skills.py`, `.githooks/pre-commit`, `.github/workflows`와 earnings-reviewer 에이전트 플러그인 대조
- [earnings-preview SKILL.md — GitHub, Anthropic](https://github.com/anthropics/financial-services/blob/main/plugins/vertical-plugins/equity-research/skills/earnings-preview/SKILL.md)
- [Claude Platform Docs, Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview)
- [Claude Platform Docs, Multiagent orchestration](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration)
- [Claude Code Docs, Extend Claude with skills](https://code.claude.com/docs/en/skills)

## 관련 문서

- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (민감 정보, 허위정보)]]
- [[Claude-Code-Customization|Claude Code 커스터마이즈 (플러그인과 마켓플레이스)]]
- [[Agent-Skills|에이전트 스킬 (SKILL.md 포맷, 설치 경로와 신뢰)]]
- [[Agent-Runtime-Deployment|에이전트 런타임과 배포 (Claude Managed Agents 권한 배치와 API 필드)]]
