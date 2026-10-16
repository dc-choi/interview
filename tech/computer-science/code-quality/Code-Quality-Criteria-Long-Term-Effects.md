---
tags: [cs, code-quality, clean-code, refactoring, code-review, technical-debt]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Code Quality Long-Term Effects", "코드 품질의 장기 효과", "품질과 속도의 오해"]
---

# 코드 품질의 장기 효과와 실천

품질에 들인 설계 비용이 이후의 사용과 변경에서 어떻게 돌아오는지, 그리고 품질과 속도를 둘러싼 오해와 실천을 다룬다. 품질의 4대 지표(응집, 추상화, 책임 분리, 이름)는 [[Code-Quality-Criteria|코드 품질의 기준]]에, 아래 비용 비교의 바탕인 Switch 7곳과 Adapter 분리는 [[Code-Quality-Criteria#리팩토링 사례 분석|EasyMap 리팩토링 사례]]에 있다.

## 품질이 주는 장기 효과

### 비대칭: 만들기 vs 쓰기

- **만드는 비용**: Adapter 구조 설계 +10분
- **쓰는 비용**:
  - Advanced Beginner가 Switch 7곳을 다 찾아 수정 (+2시간, 실수 가능성 高) vs Adapter로 분리된 파일 1개만 수정 (+10분, 실수 거의 없음)
- 한 번의 설계 품질 투자가 **이후 모든 사용자의 시간 복리**

### 조직 관점

- 품 많이 드는 구현은 주로 Advanced Beginner가 수행
- Competent가 정리, 체계화 → **사용성, 안정성은 Competent 단독 작업 수준에 수렴**
- Advanced Beginner가 **Competent의 정리된 코드 위에서** 개발할 때 오류↓, 속도↑
- 즉 한 명의 Competent가 **팀 전체를 끌어올린다**

### 학습 가속

- 좋은 코드를 **보기만** 해서는 "쟤가 잘하니까 되는 것"으로 인식
- 자기 코드가 **리팩토링되는 과정을 직접** 관찰하면 "나도 할 수 있다"로 내재화
- 따라서 코드 리뷰는 **배움의 가장 큰 레버**

## 품질, 속도의 오해와 실천

- **"품질 = 느린 개발"** — 단기만 그렇고 3개월+ 구간에서는 품질이 더 빠름
- **"최신 기술 = 품질"** — 최신 기술이 추상화, 책임 분리를 자동 보장하지 않음
- **"커버리지 100% = 품질"** — 구조 없으면 테스트도 부채

실천: 교과서 체화 + 자기 코드 매주 리팩토링 + 디자인 패턴을 변화 축의 해법으로 학습 + 팀 코드 리뷰 필수화 + 스프린트 15~20% 기술 부채 해소 + 채용 시 [[Competence-Identification|1시간 코드 리뷰 과제]]

## 출처
- 블로그 "really impressed with the quality" (능력있는 개발자와 코드 품질)

## 관련 문서
- [[Code-Quality-Criteria|코드 품질의 기준, 교과서적 코드]]
- [[Dreyfus-Skill-Model|드레퓌스 기술 습득 모형]]
- [[Competence-Identification|능력있는 개발자 판별법]]
- [[Code-Review-Culture|생산적 코드 리뷰 문화]]
- [[Code-Review-Sustainability|코드 리뷰 정착과 비즈니스 정당화]]
