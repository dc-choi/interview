---
tags: [ai, mlops, evaluation, feedback-loop]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["Model Feedback Loop and Validation", "모델 피드백 루프", "Lab in the Loop"]
---

# 모델 피드백 루프와 검증

모델 피드백 루프는 예측이나 후보 생성에서 끝나지 않고, 실제 관측과 실험 결과를 다음 데이터 및 모델 개선에 연결하는 과정이다. 자동화된 반복 자체는 개선의 증거가 아니므로 검증과 배포 승인을 함께 설계한다.

## 예측과 관측을 연결한다

Lab-in-the-loop는 기존 실험 데이터로 후보를 제안하고, 실제 실험에서 얻은 결과를 다시 모델에 돌려주는 방식이다. Genentech의 공개 설명에서 확인되는 것은 데이터, 계산과 실험을 반복하는 구조다. 개별 후보의 효능이나 임상 성공을 이 구조만으로 보장할 수는 없다.

다음은 이를 다른 모델 개발에도 적용할 때의 설계 제안이다.

| 단계 | 남길 근거 |
|---|---|
| 후보 생성 | 입력 데이터, 모델 버전, 예측과 불확실한 조건 |
| 실험 또는 현장 관측 | 실제 측정값, 환경, 실패와 누락 |
| 데이터 갱신 | 원본과 라벨의 연결, 변경 이유, 학습에 쓸 범위 |
| 재학습과 비교 | 기준 모델 대비 품질, 지연, 오류와 비용 |
| 승격 | 사전에 정한 통과 기준과 복구할 버전 |

예측값을 관측값으로 덮어쓰지 않는다. 후보를 누가 어떤 기준으로 선택했는지도 남겨, 관측된 사례만으로 전체 환경을 대표한다고 판단하지 않게 한다.

## 계산 후보와 실험 결과의 상태를 구분한다

Amazon Bio Discovery는 생물학 모델로 후보를 생성하고 평가한 뒤, 선택한 후보를 연계 연구실에 합성과 시험 목적으로 전달하고 결과를 다음 모델 개선에 연결하는 lab-in-the-loop 구조를 제공한다. 2026-10-22 공개 서비스 설명 대조 기준이며 개별 실험의 성공이나 자동 재학습 완료를 뜻하지 않는다.

MSK의 공개 사례에서 수주 단위로 단축했다고 소개한 범위는 표적에서 출발해 100,000개 설계를 연구실로 보내기까지다. 이는 해당 기관의 초기 결과 보고이며, 모든 실험이 끝났거나 임상 효과가 확인됐다는 수치가 아니다.

이 구조를 다른 후보 생성 시스템에 적용할 때는 `후보 생성`, `검증 대상 선정`, `외부 검증 의뢰`, `결과 수신`, `모델 반영`을 각각 기록한다(설계 제안). 예측 점수와 관측 결과를 같은 필드에 덮어쓰지 않고 실험 ID로 연결한다. 재학습 뒤에는 기존 모델과 별도 평가를 거쳐 승격하며, 반복 횟수나 생성 후보 수를 품질 향상으로 세지 않는다.

## Shadow 비교와 실제 행동을 나눈다

Shadow 비교에서는 기존 모델과 새 모델의 결과를 같은 운영 입력에서 비교한다. 새 모델의 결과가 실제 응답이나 제어에 사용되는지는 별도 계약이다.

SageMaker AI의 관리형 shadow test는 같은 endpoint에서 추론 요청을 새 variant로 복사한다. 호출 애플리케이션에는 production variant의 응답만 반환하며 shadow 응답은 버리거나 기록해 비교할 수 있다. 모델뿐 아니라 컨테이너와 인스턴스 변경도 평가 대상이다. Serverless와 asynchronous inference 등 지원하지 않는 endpoint 구성이 있으므로 적용 전 호환성을 확인한다.

차량 내 병렬 실행과 클라우드 endpoint의 요청 복제는 구분한다. Storm Reply의 One Loop 공개 사례는 SageMaker를 통한 재학습, Greengrass를 통한 배포, 차량에서 기존 및 새 모델을 비교하는 shadow mode를 설명한다. 이 사례만으로 차량의 shadow mode가 SageMaker의 관리형 shadow test를 사용한다고 추론하지 않는다.

## 검증 경계

### 초안 생성과 최종 사용을 따로 평가한다

생성형 모델이 작성한 초안과 사람이 검토한 최종본은 서로 다른 산출물이다. 2026-10-22 AWS HealthScribe 공식 문서는 생성 결과가 확률적이고 부정확할 수 있으며, 환자 진료에 사용하기 전에 훈련된 의료 전문가가 정확성과 적절성을 검토해야 한다고 명시한다. 이는 특정 병원의 자체 모델이 HealthScribe를 사용한다는 뜻이 아니라 초안과 최종 사용의 경계를 확인하는 별도 서비스 사례다.

이를 다른 초안 작성 시스템에 적용할 때는 입력 자료, 생성 초안, 사람의 수정과 최종 승인 결과를 연결해 평가한다(설계 제안). 생성 시간뿐 아니라 검토와 수정에 걸린 시간, 사실 누락과 추가, 사용 목적에 맞는 품질을 함께 비교한다. 생성만 빨라졌거나 API 연결이 완료됐다는 사실을 전체 업무 시간 감소나 현장 효과로 계산하지 않는다.

### 비교 결과의 해석

- 같은 입력에서 출력이 달라졌다는 사실과 새 출력이 더 정확하다는 판단은 다르다. 정답 라벨이나 별도 실험 결과가 필요하다.
- Shadow 비교만으로 새 모델이 실제 행동을 바꿨을 때의 후속 결과까지 확인할 수는 없다. 제어에 투입하는 검증과 승격은 별도 단계로 둔다.
- 재학습 성공, 소프트웨어 배포 성공, 현장 품질 개선을 각각 기록한다. 이 문서는 공개 구조와 서비스 계약을 대조했으며 차량이나 연구실에서 실험을 수행하지 않았다.

## 출처

- [Amazon Bio Discovery — AWS](https://aws.amazon.com/biodiscovery/) — 2026-10-22 후보 생성, 연구실 검증과 결과 환류의 공개 구조 대조.
- [Executive Insights from the 2026 AWS Life Sciences Symposium — AWS for Industries](https://aws.amazon.com/blogs/industries/executive-insights-from-the-2026-aws-life-sciences-symposium/) — MSK 초기 사례의 완료 범위는 설계를 연구실로 보내는 단계.
- [AWS, AWS HealthScribe](https://docs.aws.amazon.com/transcribe/latest/dg/health-scribe.html) — 확률적 초안과 전문가 검토의 경계만 2026-10-22 대조
- [AI Fuels Genentech’s R&D Ecosystem — Genentech](https://www.gene.com/stories/ai-fuels-genentech-r-and-d-ecosystem?topic=behind-the-science) — 공개 검색 색인의 lab-in-the-loop 본문을 발표 전사와 대조했다. 직접 페이지 열기는 탐색 메뉴만 반환해 전체 본문은 재확인하지 못했다.
- [Storm Reply Accelerates Autonomous Driving Development with AWS — Amazon Web Services](https://www.youtube.com/watch?v=N6FtSBT-WZg) — 공식 영상 설명과 사람이 작성한 자막을 대조했다.
- [AWS, Amazon SageMaker AI Shadow tests](https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests.html)

## 관련 문서

- [[Synthetic-Vision-Data-Evaluation|합성 비전 데이터 평가]]
- [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]]
- [[IoT-Edge-Cloud-Pipeline|IoT 엣지와 클라우드 파이프라인]]
