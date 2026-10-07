---
tags: [aws, amazon-quick, workflow, knowledge-graph, automation]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Amazon Quick Flows", "Amazon Quick 개인 지식 그래프"]
---

# Amazon Quick의 워크플로와 개인 지식 그래프

Amazon Quick Flows는 입력, 조사, AI 응답과 연결 앱의 동작을 순서 있는 작업으로 구성하는 기능이다. 개인 지식 그래프는 연결한 자료에서 개체와 관계를 추출해 질문에 필요한 맥락을 찾는다. 두 기능을 사용할 때는 자료 탐색, 결과 생성과 외부 시스템 변경을 구분한다.

## Flows의 입력과 실행

자연어 설명이나 채팅에서 flow를 만들거나 시각적 편집기로 직접 구성할 수 있다. 단계에는 웹 검색, 모델의 일반 지식, 연결된 데이터 조회, 사용자 입력과 앱의 읽기/쓰기 동작 등이 있다. 생성된 단계가 의도한 자료를 읽고 결과를 내는지 실행 전에 확인한다.

설계 예를 들면 업계 동향 보고서는 검색 범위와 기간을 입력받고, 웹 자료를 찾고, 근거를 붙인 초안을 만드는 흐름으로 구성할 수 있다. 모델의 일반 지식으로 만든 문장과 검색한 자료로 확인한 사실을 구별한다. 보고서 생성 성공을 시장 수요나 수익성 검증으로 해석하지 않는다.

## 예약 실행과 쓰기 권한

2026-10-07 공식 문서 기준으로 예약에는 반복 주기, 시작일, 선택적 종료일, 시간대와 기본 입력을 설정한다. 공유받은 flow도 예약할 수 있지만 예약 자체는 개인 소유이며 다른 사용자와 공유되지 않는다.

외부 앱을 변경하는 action 단계가 있으면 `Run with no confirmation` 설정을 확인한다. 문서는 쓰기 action의 자동 양식 제출이 기본 활성화된다고 설명한다. 사람이 확인해야 하는 작업은 이 설정을 끄고 각 action을 검토하도록 구성한다. 예약을 만들었다는 사실만으로 사람의 검토 단계가 생기지는 않는다.

- 커넥터 인증이 만료되면 실행에 필요한 재인증 알림을 받을 수 있다. 예약 전에 수동 실행으로 연결 상태를 확인한다.
- 공유 flow가 새 버전으로 바뀌면 기존 예약도 갱신된 버전으로 계속 실행된다. 변경된 입력과 action을 다시 확인한다.
- 실행 이력에서 성공과 실패를 확인한다. 결과 생성과 외부 앱 변경 완료 여부는 따로 확인한다.

## 개인 지식 그래프의 근거

Quick은 연결 앱과 폴더 자료에서 사람, 프로젝트, 문서, 일정 같은 개체와 관계를 추출하고 사용자별 계정에 보관한다. 연결 앱의 자동 수집과 폴더별 그래프 추출은 별도 설정이다. 폴더의 키워드/시맨틱 색인과 그래프 추출도 독립적이다.

개체 상세에는 AI 요약, 연결 개체와 추출에 사용한 파일 및 메시지가 표시된다. 그래프에서 관련 자료를 찾은 뒤 원문과 발생 시점을 확인하는 경로로 사용한다. 관계가 표시됐다는 사실만으로 인과관계나 사건의 책임까지 확정하지 않는다. 이는 추출된 맥락을 판단에 사용할 때의 검토 원칙이다.

그래프 초기화는 개체와 관계를 지우지만 원본 파일, 메모리와 연결 서비스는 지우지 않는다. 자동 수집과 폴더 추출을 켜 두면 그래프가 다시 만들어질 수 있다. 따라서 그래프 삭제를 원본 데이터 삭제나 연결 해제로 간주하지 않는다.

## 적용 전 확인

- 반복할 절차와 필요한 입력이 명확한가. 변하지 않는 단순 집계라면 기존 쿼리와 보고서로 충분한지도 검토한다.
- 자료 조회 권한과 앱 변경 권한을 구분했는가.
- 생성 결과를 검토할 사람이 누구이며, 무인 실행에 허용한 action은 무엇인가.
- 그래프가 가리키는 원문으로 되돌아가 사실과 추론을 구별할 수 있는가.

## 출처

- [Amazon Quick, Using Amazon Quick Flows](https://docs.aws.amazon.com/quick/latest/userguide/using-amazon-quick-flows.html)
- [Amazon Quick, Scheduling your Amazon Quick Flows](https://docs.aws.amazon.com/quick/latest/userguide/schedules-in-quick-flows.html)
- [Amazon Quick, Knowledge graph](https://docs.aws.amazon.com/quick/latest/userguide/knowledge-graph-desktop.html)

## 관련 문서

- [[QuickSight|Quick Sight의 BI와 대시보드]]
- [[LLM-Workflow-Patterns|LLM 워크플로 패턴과 실행 경계]]
- [[Agent-Data-Analysis-Workflow|에이전트 데이터 분석과 보고서]]
