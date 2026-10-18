---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 실행, 용량과 관측 범위

2026년1월 릴리스 당시 변경의 설계 함의다. 현재 지원/배포 조건은 기능별 문서와 실제 환경에서 다시 확인한다.

## 처리 방식과 격리

ANN join은 Spark ML의 근사 이웃으로 exact KNN보다 속도/재현율 tradeoff를 선택한다. 발표의 작은 precision 감소라는 표현을 업무별 정확도 보장으로 사용하지 않는다. Faster output의 snapshot replace/only-new/replace-and-remove,append-only-new/always-append는 중복/삭제 의미가 달라 입력 계약에 맞춘다.

Snowflake external pipeline은 Foundry에서 orchestrate하고 Snowpark Connect로 Snowflake에서 실행한다. Connector PAT는 인증 방식의 추가이며 실행 위치와 별개다. Foundry connector는 direct/agent worker,batch/incremental/streaming과 복수 인증을 연결하되 상대 enrollment 권한을 우회하지 않는다.

Model sidecar는 lightweight Python transform에도 환경/compute 분리를 제공하며 당시 palantir_models0.2010.0 이상을 요구했다. Compute Module time override는 요일/시작끝/timezone별 min/max replica를 정한다. History의 config change/run 기록을 배포 디버깅에 연결하고 예약 scale이 실제 할당 완료를 보장한다고 보지 않는다.

## 임시 media와 외부 ingress

1월 media upload는 OSDK generator2.6.0 이상에서 temporary upload를 제공하고 미영속 media는1시간 뒤 삭제한다고 안내했다. 이후 media property commit으로 영속화하는 생명주기와 구분한다. Side-effect free라는 소개를 외부 API와 모든 file 작업까지 확대하지 않는다.

Listeners beta는 OAuth/payload 형식을 맞추기 어려운 시스템을 위해 source별 message signing/verification URL endpoint를 제공한다. Generic 무인증 공개 입력으로 간주하지 않는다. 별도 subdomain ingress와 endpoint rotation의 만료 유예/즉시 삭제를 구성해 전환하고 만료 후에는 event를 처리하지 않는다. 지원 provider 목록의 이름보다 해당 listener의 실제 검증 방식과 payload 계약을 확인한다.

## 실행 이력, metrics와 비용

1월 function/action metrics retention은7일에서30일로 확대됐지만 run history의 조회 창은7일이다. Run-history status/time/user/duration/version(function만)/caller/failure-type filter는 AND로 결합한다. P95/count,Action Rule histogram,color mode와 Quiver resource node는 조사 단서이며 업무 품질의 완전한 판정은 아니다.

Build compute usage는 완료 build의 모든 job 소비를 Resource Management 단위로 합산한다. User Activity Metrics의 view/edit,app,resource/group 분석과 실제 compute 비용도 구분한다. Active Python preview는 save마다 갱신하고 filter/resource/dependency cache를 재사용하므로 production 전체 입력 테스트와 같지 않다.

Ontology Manager monitor tab은 object/link/function/action의 rule 상태/이력을 연결한다. Rule이 없다는 표시와 정상/미평가를 구분한다. Multiple evaluation target은 서로 다른 signature/evaluator로 비교할 수 있고 historical Logic run을 test case로 가져올 수 있지만 기대값과 대표성을 검토해야 한다.

## LLM capacity와 연동

Reserved capacity는 project별TPM/RPM을 제공하고 소진 뒤 standard shared limit으로 돌아간다. 당시 추가 비용 없이 제공된다는 안내라도 현재 계약/가용성을 다시 확인한다. Reserved tab 부재는 환경 미가용일 수 있으며 end-to-end 무중단 보장은 아니다. Rate-limit hits는 사용자/project/app의 제한 도달을 보여 주는 진단이고 throughput 증가 자체가 아니다.

1월 Azure GPT4.1mini AU/CA/JP/UK,Vertex IL2와 Gemini3 non-georestricted commercial 등 model/지역 조합이 확대됐다. Provider preview와 AIP내 GA 취급이 달랐던 Gemini3 경계를 보존한다. Model family enable과 실제 모델 가용성을 확인한다.

Ontology MCP는 Developer Console application에 노출한 resource를 external agent의 tool로 제공하는 beta 경로였다. MCP 설정만으로 backend role/marking/Action submission 검사가 대체되지 않는다. In-platform agent와 external framework 연결의 목적을 구분한다.

Automate 문서의 scope/dependency/backfill 설명 보강과 Pipeline Builder model diff 표시 수정은 새로운 runtime 보장으로 확대하지 않는다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-January-Platform-Evolution]]
