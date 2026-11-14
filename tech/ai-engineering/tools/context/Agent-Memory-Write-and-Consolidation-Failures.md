---
tags: [ai, agent-memory, consolidation, context-collapse, hallucination]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Memory Write and Consolidation Failures", "에이전트 기억의 쓰기와 정리 실패", "Context Collapse", "맥락 붕괴"]
---

# 에이전트 기억의 쓰기와 정리에서 생기는 실패

에이전트 기억은 꺼낼 때만 틀리는 것이 아니다. LLM이 대화에서 사실을 뽑아 저장하고, 쌓인 기록을 요약하거나 교훈으로 다시 쓰는 순간에도 지어내기, 누락과 정보 손실이 생긴다. 이 문서는 쓰기, 정리와 정정 단계의 실패와 그 대응 설계를 다룬다. 기억의 역할 분류와 검색 및 종합 연산은 [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]에 있다.

## 쓰기는 추출과 갱신 두 단계다

2025년 Mem0 논문(ECAI 2025 게재) 기준 설계는 쓰기를 두 단계로 나눈다.

| 단계 | 입력 | 결과 |
|---|---|---|
| 추출 | 대화 요약과 최근 메시지(논문 설정은 10개) | 기억할 후보 사실 |
| 갱신 | 후보 사실마다 의미가 비슷한 기존 기억(논문 설정은 상위 10개) | LLM이 고른 `ADD`, `UPDATE`, `DELETE`, `NOOP` 중 하나 |

`DELETE`는 새 정보와 모순되는 기억을 지운다. 같은 논문의 그래프 변형(Mem0g)은 낡은 관계를 물리적으로 지우지 않고 무효로 표시해 시간 추론에 쓴다. 같은 시스템 안에서도 모순 처리가 삭제와 무효 표시로 갈린다는 뜻이므로, 연산 이름만 보고 옛 값이 남는지 판단하지 않고 구현을 확인한다. 2026년 4월 공개된 Mem0 Platform v3는 추출을 한 번의 LLM 호출로 `ADD`만 하는 방식으로 바꿔 추출 단계에서 기존 기억을 덮어쓰거나 지우지 않는다(2026-11-14 공식 마이그레이션 문서 확인). 낡은 기억의 제거는 여전히 삭제 API나 만료일 기능으로 한다. 논문의 네 연산을 현재 제품 동작으로 단정하지 않는다.

LOCOMO 장기 대화 평가에서 Mem0는 대화 전체를 넣는 방식보다 p95 지연을 91% 낮추고 토큰 비용을 90% 넘게 줄였다고 보고했다. 정확도는 대화 전체를 넣는 방식이 더 높았다. 기억 계층은 비용과 지연을 정확도와 맞바꾸는 선택이며, 저자들이 그 제품을 만든 회사 소속이라는 점을 함께 읽는다.

## 환각은 쓰는 단계에서 생겨 답변까지 번진다

최종 답만 채점하면 오류가 추출, 갱신, 답변 중 어디서 생겼는지 알 수 없다. HaluMem은 기억 시스템의 지어내기, 오류, 충돌과 누락을 기억 환각으로 묶고 세 단계를 따로 채점한다. 각각 약 1만 5천 개의 기억 지점과 약 3,500개의 질문이 있는 두 데이터셋을 쓰며, 사용자당 대화 길이는 Medium이 약 16만 토큰, 무관한 대화를 끼운 Long이 약 100만 토큰이다.

Mem0(일반과 그래프 변형), Memobase, MemOS, Supermemory와 Zep을 평가한 결과는 다음과 같다(Zep은 대화별 기억을 꺼내는 API가 없어 추출 지표만 빠졌다).

- 추출 정확도는 모든 시스템이 62% 미만이었다.
- 갱신 단계에서 대부분의 시스템이 누락률 50%를 넘었다.
- 질의응답 정확도는 모든 시스템이 70% 미만이었다.

저자들은 환각이 추출과 갱신 단계에서 쌓여 질의응답으로 번진다고 결론짓는다. 저자 일부가 평가 대상 MemOS를 만든 MemTensor 소속이다. 저자 저장소는 2026년 8월 EMNLP 2026 본회의 채택을 공지했고, 본문은 arXiv v3로 대조했다. 운영에서는 기억 품질을 답변 정확도 하나로 재지 말고 저장된 항목 자체를 원본과 대조하는 단계 지표를 따로 둔다.

## 반복 정리는 쓸모 있던 기억을 망가뜨린다

정리(consolidation)는 쌓인 기록을 짧은 교훈이나 요약으로 다시 쓰는 일이다. 2026년 공개된 Useful Memories 연구(arXiv, NeurIPS 2026 워크숍 포스터)는 쓸모가 확인된 경험에서 출발해 LLM이 기억을 계속 정리하게 했다.

- WebShop에서 AWM의 성공률(보류한 50개 에피소드 중 해결 비율, 그림 1 설명 기준)은 예시 8개일 때 0.64였다가 128개에서 기억 없는 기준선과 같은 0.20으로 떨어졌다.
- GPT-5.4가 기억 없이 모두 풀던 ARC-AGI 19문제에서 문제마다 기억을 갱신하자 10라운드 뒤 정확도가 52.6%로 떨어졌고, 한 번에 정리한 쪽은 만점을 유지했다. 이 수치는 그림 2 설명 기준이며 4.1절은 정확도 54%, 초록은 54% 실패(정확도 46%)로 적어 엇갈린다.
- LangMem, Mem0, ProPlay, ACE, AWM, Letta, Dynamic Cheatsheet 일곱 프레임워크 모두 적어도 한 설정에서 정점 뒤 성능이 떨어졌다.
- 원본 경로를 그대로 보관하는 대조군은 정리 방식들과 견줄 만했다.

저자들은 실패 원인을 경험이 아닌 정리 단계에 두고, 원본 기록을 1급 증거로 다루며 정리는 상호작용마다 자동으로 돌리지 말고 명시적인 관문을 두라고 권한다. 같은 기록도 갱신 순서와 묶음에 따라 다른 기억이 될 수 있다. 세션이 끝난 뒤 따로 돌리는 정리([[Agent-Memory-Retain-Recall-Reflect#기억의 층과 세션 사이의 정리|기억의 층과 세션 밖 정리]])도 원본 기록과 대조하는 관문을 두어야 같은 하락을 피할 수 있다.

## 통째로 다시 쓰면 맥락이 붕괴한다

ACE(Agentic Context Engineering, 저자 표기 ICLR 2026)는 반복 재작성의 위험을 맥락 붕괴(context collapse)라 부른다. AppWorld에서 Dynamic Cheatsheet로 적응하던 맥락은 60단계에서 18,282토큰, 정확도 66.7이었지만 다음 단계에서 122토큰으로 줄었고 정확도는 적응하지 않은 기준 63.7보다 낮은 57.1이 됐다. 저자들은 이를 특정 방법이 아닌 전체 재작성 방식의 위험으로 본다. 최적화가 짧고 일반적인 지시로 수렴하는 경향은 brevity bias로 따로 부른다.

ACE는 맥락을 항목이 쌓이는 플레이북으로 다룬다. Generator가 풀이를 만들고, Reflector가 성공과 실패에서 교훈을 뽑고, Curator가 이를 작은 항목 단위 변경(delta)으로 만든다. Delta는 LLM이 아닌 결정적 코드가 기존 맥락에 합치며, 중복 제거만 임베딩 비교를 쓴다. 저자 보고 평균 향상은 에이전트 과제 10.6%, 금융 과제 8.6%다. 다만 ACE도 위 연구에서 정점 뒤 하락한 일곱 프레임워크에 포함되므로 항목 단위 수정이 반복 정리의 위험을 없앤다고 보지 않는다.

## 덮어쓰지 않고 대체한다

Useful Memories의 원본 보존과 정리 관문, ACE의 항목 단위 갱신 권고에 기대어 아래 출처의 강의가 제시한 대체 기반 설계다. 대체 표시, 변경 목록의 네 분류와 줄별 인용은 두 논문이 아닌 강의의 설계이며 특정 제품의 구현 계약도 아니다.

- **원본은 추가만 한다:** 대화와 문서 원본은 고치지 않는 기록으로 두고, 기억 항목마다 근거가 된 원본 위치를 남긴다. 기억이 틀렸을 때 돌아갈 기준이 된다.
- **바뀐 항목만 대체한다:** 바뀐 사실은 새 항목으로 만들고 옛 항목은 지우지 않고 대체됨(superseded)으로 표시한 뒤 새 항목이 옛 항목을 가리키게 한다. 기본 조회는 현재 값만, 이력 조회는 옛 값과 바뀐 순서를 보여준다. 기록 시각과 사실이 유효했던 시각은 다른 축이다.
- **전체 재작성을 받지 않는다:** LLM에 요약 파일이나 지침 파일을 다시 쓰게 하지 말고 추가, 대체, 유지, 근거 없음으로 표시한 변경 목록만 받는다. 줄마다 원본 문장을 인용하게 하고, 근거를 찾지 못한 기존 줄은 지우지 않고 근거 없음으로 표시해 사람이 판단하게 한다.
- **정리에 관문을 둔다:** 정리는 정한 시점에 돌리고, 정리 결과와 원본만 넣은 경우를 같은 질문으로 비교한다. 나빠졌으면 정리 결과 대신 원본에서 다시 만든다.

Git으로 관리하는 메모리 파일이나 지침 파일은 예전 버전과 현재 버전을 비교해 덮어써서 사라진 사실을 변경 이력으로 되살릴 수 있다. 이때도 모델에 현재 파일을 고치게 하지 않고 이력 초안만 받아 사람이 반영한다.

## 적용 점검

- 저장된 기억 항목을 원본과 표본 대조해 지어낸 내용과 누락을 따로 센다.
- 모순 처리 연산이 옛 값을 지우는지, 무효로 표시하는지 구현에서 확인한다.
- 정리 주기를 바꿀 때 정리 전후와 원본만 넣은 조건의 답변 정확도를 같은 질문으로 비교한다.
- 요약 결과의 길이가 갑자기 크게 줄면 맥락 붕괴를 의심하고 이전 판과 비교한다.

## 출처

- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory — ECAI 2025, Prateek Chhikara et al.](https://arxiv.org/abs/2504.19413) — ECAI 2025 게재는 DOI 10.3233/FAIA251160, arXiv v1의 2.1절 추출과 갱신, 2.2절 Mem0g 무효 표시, 초록의 지연과 토큰 비용, 2026-11-14 대조
- [Mem0, Platform v2 to v3 migration](https://docs.mem0.ai/migration/platform-v2-to-v3) — 2026-11-14 ADD 전용 1회 추출 확인
- [Mem0: The Token-Efficient Memory Algorithm — Mem0](https://mem0.ai/blog/mem0-the-token-efficient-memory-algorithm) — 2026-04-16 게시, v3 추출 방식 변경 시점
- [HaluMem: Evaluating Hallucinations in Memory Systems of Agents — arXiv, Ding Chen et al.](https://arxiv.org/abs/2511.03506) — v3, 초록과 6.2.1절 단계별 결과, 2026-11-14 대조
- [HaluMem — GitHub, MemTensor](https://github.com/MemTensor/HaluMem) — EMNLP 2026 채택 공지
- [Useful Memories Become Faulty When Continuously Updated by LLMs — arXiv, Dylan Zhang et al.](https://arxiv.org/abs/2605.12978) — v2, 초록, 4.1절과 4.3절, 그림 1과 2 설명, 2026-11-14 대조
- [Useful Memories Become Faulty When Continuously Updated by LLMs — NeurIPS 2026 워크숍 포스터](https://neurips.cc/virtual/2026/174843)
- [Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models — arXiv, Qizheng Zhang et al.](https://arxiv.org/abs/2510.04618) — v3, 2.2절 맥락 붕괴와 brevity bias, 3절 delta 갱신, 2026-11-14 대조
- [YouTube, 커리어해커 알렉스, 에이전트 메모리 1부 에이전트에게 기억을 만들어 주는 법](https://www.youtube.com/watch?v=W0Cch7LpmWo) — 4강의 연구 소개와 대체 기반 기억 설계 실습

## 관련 문서

- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Long-Context-Evaluation|긴 문맥 평가]]
- [[Context-Development-Lifecycle|컨텍스트 개발 수명주기]]
