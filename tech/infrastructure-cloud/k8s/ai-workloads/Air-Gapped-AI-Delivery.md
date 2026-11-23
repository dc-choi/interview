---
tags: [kubernetes, openshift, air-gap, supply-chain, model-signing, oci, sbom, ai]
status: done
verified_at: 2026-11-23
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Air-Gapped AI Delivery", "폐쇄망 AI 반입", "폐쇄망 모델 반입", "Mirror Factory", "미러 팩토리", "모델 서명", "AI BOM"]
---

# 폐쇄망 AI 플랫폼의 이미지와 모델 반입

폐쇄망 AI 플랫폼은 밖에서 만든 플랫폼 이미지, 오퍼레이터와 모델을 안으로 들여야 돌아간다. 반입 경로가 곧 공급망이므로 검증을 어디서 끝내고, 무엇을 서명하고, 클러스터가 무엇을 거부하는지를 정해 둔다. 주권형 플랫폼의 통제 계층 전체는 [[Sovereign-AI-Platform|주권형 AI 플랫폼]], 망 사이 반입의 승인 절차는 [[Network-Separation#연구개발 산출물 반입을 승인 절차로 구성한다|연구개발 산출물 반입]]이 다룬다.

## 검증은 폐쇄망에 들이기 전에 끝낸다

2026년 9월 한국레드햇 발표의 구성이다. 인터넷 연결망에서 이미지를 받아 미러 레지스트리에 두고 CVE 검사와 동기화를 상시 돌린다. 발표가 Mirror Factory라 부르는 미러 영역(파이프라인, Mirror Factory 클러스터, Harbor)에서 검증과 서명을 마친 자원만 폐쇄망의 공용 레지스트리로 들인다. 폐쇄망 안에서는 공용 레지스트리로 반입한 자원만으로 개발, CI와 CD를 돌리고 배포 직전에 보안 게이트를 둔다. 폐쇄망 안에서 인터넷의 원본을 다시 찾지 않는다.

에어갭 경계의 위치는 발표 자료의 두 쪽이 다르다. 23쪽 구성도는 AIR GAP 점선을 인터넷 연결망의 미러 레지스트리와 Mirror Factory 사이에 그려 Mirror Factory를 경계 안쪽에 두었다. 같은 쪽 부제는 Mirror Factory에서 보안 검증을 마친 이미지만 Air-Gap 경계를 넘어 폐쇄망으로 들어간다고 적고, 24쪽 운영 주기는 AIR GAP 왼쪽 머리글에 Mirror Factory와 인터넷 연결을 함께 적어 Mirror Factory를 인터넷 연결 쪽에 둔다. 미러 영역이 인터넷에 닿는지는 구축할 때 따로 정한다. 닿는 구성이라면 미러 영역 자체가 공격 표면이다. 어느 쪽이든 미러 영역의 접근 권한, 서명 키의 보관과 반출 매체를 따로 통제한다(해석).

### 반입 주기

발표가 제시한 주기다.

| 작업 | 주기 |
|---|---|
| 플랫폼 릴리스 미러링 | 월 1회 |
| 오퍼레이터 카탈로그 관리 | 격주 |
| 이미지 프로모션 | 주 1회 |
| 보안 패치와 CVE 수정 | 수시 |
| 업그레이드 검증 | 분기 1회 |
| 레지스트리 유지보수 | 상시 |

폐쇄망의 패치 지연은 반입 주기만큼 늘어난다. 긴급 CVE는 정기 주기와 다른 경로로 들이고, 업그레이드는 반입 전에 미러 영역에서 같은 판으로 먼저 검증한다(해석). 패치 주기의 일반론은 [[Dependency-Patch-Cycle|의존성 패치 주기]]를 따른다.

### OpenShift의 미러링 도구

oc-mirror(2026-11-23 README 기준)는 선언형 `ImageSetConfiguration`(`mirror.openshift.io/v2alpha1`)으로 OpenShift 릴리스 payload, 오퍼레이터 카탈로그, Helm 차트와 추가 이미지를 찾아 미러 레지스트리나 로컬 아카이브로 복사한다.

- **완전 폐쇄망:** 인터넷에 연결된 장비에서 mirror to disk(`m2d`)로 tar 아카이브를 만들고, 폐쇄망 안에서 disk to mirror(`d2m`)로 내부 레지스트리에 올린다.
- **부분 연결:** 도구를 돌리는 장비가 인터넷과 대상 레지스트리에 모두 닿으면 mirror to mirror로 바로 복사한다.
- **삭제:** 지울 이미지를 먼저 목록으로 만들고(`--generate`) 그 목록으로 지우는 두 단계를 거친다.

## 모델 반입 파이프라인

외부 모델은 수집, 검증과 스캔, 서명과 패키징, 물리 반입, 레지스트리 등록 순서로 들어온다. 폐쇄망 안에서는 서빙 플랫폼에 배포하고(발표 구성은 KServe와 vLLM, GPU 노드 스케줄링), 서명 검증, 모델 카드와 승인 워크플로를 거쳐 내부 앱에 추론 API를 열며, 모니터링과 드리프트 추적을 붙인다(2026년 9월 한국레드햇 발표 구성).

### 검증 게이트의 순서

발표가 제시한 8단계는 모델 검증 여섯 단계와 배포 두 단계로 나뉜다.

1. 수집과 정적 무결성 검사
2. 적대적 감사와 레드티밍
3. 최적화와 양자화
4. 성능과 정확도 검증
5. 안전성 재검증
6. 프로모션과 출처 증명
7. 기밀 컴퓨팅(배포)
8. 런타임 가드레일(배포)

- **양자화 뒤에 다시 잰다:** 3단계가 가중치를 바꾸므로 4, 5단계는 실제로 배포할 산출물을 대상으로 한다. 원본 모델의 평가 결과를 양자화 모델에 물려주지 않는다(해석).
- **스캔 결과의 한계:** 아티팩트 스캐너가 모델 자체에 CVE 결과를 내지 않는다는 점과 검사 범위의 차이는 [[Supply-Chain-Security#AI 모델과 컨테이너의 검사 범위|AI 모델과 컨테이너의 검사 범위]]를 따른다.
- **모델과 판마다 반복된다:** 직접 구축하면 이 단계를 모델과 판마다 돌려야 하므로 자동화된 게이트로 묶는다.

## 서명, 패키징과 자재명세서

2026-11-23 각 공식 저장소와 문서 기준이다.

| 요소 | 공개 규격과 도구 | 하는 일 |
|---|---|---|
| 패키징 | CNCF ModelPack | OCI 이미지 규격과 아티팩트 지침에 맞춰 모델을 패키징한다. 모델 파일은 불투명한 바이너리로 다루고 메타데이터는 일부만 담으며, Kubernetes에서는 OCI 볼륨 소스로 쓸 수 있다 |
| 자재명세서 | SPDX 3.0.1 AI 프로필과 Dataset 프로필 | AI 패키지(시스템)와 모델, 데이터셋 정보를 표준 형식으로 기록한다 |
| 모델 서명 | OpenSSF 모델 서명(sigstore/model-transparency) | 모델 파일 경로와 digest 목록을 in-toto statement로 만들어 DSSE envelope로 서명한다. 검증은 서명을 확인한 뒤 파일 해시를 다시 계산해 비교한다. Sigstore 외에 공개키, 인증서와 PKCS #11 장치로도 서명한다 |
| 투명성 로그 | Sigstore Rekor | 공급망 메타데이터를 변경 불가하고 변조에 강한 장부에 남긴다. 서명자는 자기 신원이 예상치 않게 쓰였는지 로그를 감시한다 |
| 아티팩트 서명 | Notary Project | COSE와 JWS 서명 형식으로 아티팩트를 서명하고 검증한다 |

- **클러스터 입장 검증:** OpenShift의 `ClusterImagePolicy`는 클러스터 전체의 이미지 서명 검증 설정이다. 레지스트리 범위(scope) 목록과 sigstore 검증 정책을 짝짓는다. 여러 범위가 겹치면 가장 구체적인 범위의 정책만 적용하고, 같은 범위가 `ImagePolicy`에도 있거나 `ImagePolicy`의 범위가 `ClusterImagePolicy`의 범위 안에 들면 클러스터 정책만 적용하며, 한 객체에 범위는 256개까지다(2026-11-23 openshift/api 기준).
- **모델에도 같은 경로를 쓴다:** 모델을 OCI 아티팩트로 패키징하면 컨테이너 이미지와 같은 레지스트리, 미러링 도구와 서명 검증을 쓸 수 있다. 다만 입장 검증은 노드가 이미지로 끌어오는 경로에만 걸리므로, 모델 서버가 객체 저장소나 공유 볼륨에서 직접 읽는 모델은 별도로 해시를 검증한다(해석).
- **폐쇄망의 서명 검증:** Sigstore 번들은 검증에 필요한 자료를 함께 담지만, 그 자료를 믿을 신뢰 루트는 따로 있어야 한다. 키 없는 서명을 폐쇄망에서 검증하려면 신뢰 루트를 함께 반입하고, 그렇게 하지 않을 거면 내부 키나 인증서로 서명한다(해석).

## 점검 질문

- 반입 경로마다 검증, 서명과 승인 기록이 남는가?
- 클러스터가 서명 없는 이미지와 모델을 실제로 거부하는지 시험했는가?
- 양자화한 산출물로 정확도와 안전성을 다시 쟀는가?
- 긴급 CVE를 정기 주기와 따로 들이는 경로가 있는가?
- 미러 영역의 서명 키와 반출 매체를 누가 통제하는가?

## 출처

- [Sovereign AI 환경에서 완성하는 엔터프라이즈 Agentic AI 구축 및 운영 전략 — 삼성SDS REAL Summit 2026 발표 자료, 한국레드햇](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%206-6%20Sovereign%20AI%20%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C%20%EC%99%84%EC%84%B1%ED%95%98%EB%8A%94%20%EC%97%94%ED%84%B0%ED%94%84%EB%9D%BC%EC%9D%B4%EC%A6%88%20Agentic%20AI%20%EA%B5%AC%EC%B6%95%20%EB%B0%8F%20%EC%9A%B4%EC%98%81%20%EC%A0%84%EB%9E%B5_%ED%95%9C%EC%9E%AC%EA%B2%BD%20fn.pdf) — 2026년 9월 발표. 미러 영역 구성, 반입 주기, 모델 반입 파이프라인과 검증 8단계
- [oc-mirror — openshift](https://github.com/openshift/oc-mirror) — 2026-11-23 README의 ImageSetConfiguration, m2d와 d2m, 삭제 단계 대조
- [openshift/api, ClusterImagePolicy types](https://github.com/openshift/api/blob/master/config/v1/types_cluster_image_policy.go) — 2026-11-23 범위 규칙, ImagePolicy와의 우선순위와 범위 상한 대조
- [CNCF ModelPack Specification Standard — modelpack](https://github.com/modelpack/model-spec) — 2026-11-23 README의 OCI 기반 패키징 범위 대조
- [SPDX Specification 3.0.1, AI](https://spdx.github.io/spdx-spec/v3.0.1/model/AI/AI/) — 2026-11-23 AI 프로필 요약 대조
- [Model Transparency — sigstore](https://github.com/sigstore/model-transparency) — 2026-11-23 README의 서명 구조, 검증 절차와 서명 방식 대조
- [Sigstore, Rekor](https://docs.sigstore.dev/logging/overview/) — 2026-11-23 투명성 로그의 역할 대조
- [Notary Project](https://notaryproject.dev/) — 2026-11-23 서명 형식 대조

## 관련 문서

- [[Sovereign-AI-Platform|주권형 AI 플랫폼]] — 망분리 밖에 남는 통제 계층
- [[Supply-Chain-Security|공급망 보안]] — 사설 레지스트리, provenance와 모델 검사 범위
- [[Network-Separation|망분리]] — 망 사이 반입 승인 절차
- [[K8s-AI-Workloads|Kubernetes AI 워크로드]]
- [[Dependency-Patch-Cycle|의존성 패치 주기]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|트래픽 진입, Helm과 GitOps]]
