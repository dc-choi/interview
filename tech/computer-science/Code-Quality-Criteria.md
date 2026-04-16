---
tags: [cs, code-quality, clean-code, refactoring, adapter-pattern]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Code Quality Criteria", "코드 품질 기준", "교과서적 코드"]
---

# 코드 품질의 기준 · 교과서적 코드

"코드 품질"은 기능이 돌아가는 것과 **독립된 코드 자체의 질**. 4인승이라는 기능은 같아도 티코와 링컨 컨티넨탈이 다르듯이. 현대 소프트웨어에서 품질은 **"전산학에서 정립된 개념을 얼마나 반영했는가"** 로 측정되며, 이는 단순 취향이 아니라 **유지보수·확장·안정성의 복리**를 결정한다.

## 핵심 명제

- **교과서적 = 품질 좋은** — 교과서는 개념을 가장 잘 드러내는 코드를 싣는다. 이걸 체화한 코드가 품질의 표준
- **좋은 것 만들기는 어렵지만, 쓰기는 쉽다** — 설계 비용과 사용 비용의 비대칭
- **품질은 복리**로 돌아온다 — 1회 작성 시간이 조금 더 들지만 변경·확장·버그 비용이 수십 배 절감
- **품질 ≠ 최적화·함수형·타입 강박** — 핵심은 **맥락에 맞는 추상화와 책임 분리**

## 품질의 4대 지표

### 1. 데이터 응집 (Cohesion)

관련된 필드는 **같이 묶인다** — Class·Struct·Record.

```js
// 나쁨: 병렬 배열로 관리. 동기화 버그 시한폭탄
class EasyMap {
  markerNames = [];
  markerIds = [];
  markerLatLngs = [];
}

// 좋음: 같이 다니는 데이터는 한 객체
class Marker {
  constructor(id, name, latLng) { this.id = id; this.name = name; this.latLng = latLng; }
}
class EasyMap { markers = []; }
```

- 관련 필드가 **이름 prefix로 반복**되면 묶일 후보
- `markerNames`와 `markerIds`가 순서 어긋나면 이름-ID 미스매칭 발생 → 응집으로 원천 차단

### 2. 추상화 (Abstraction)

**변하는 축을 식별**하고 그 축에 대해 다형성을 적용.

```js
// 나쁨: Switch가 여러 함수에 반복. 변화의 축이 코드 전체에 흩어짐
class EasyMap {
  markCurrentPosition() {
    switch (this.mapType) {
      case 'naver':  /* ... */ break;
      case 'google': /* ... */ break;
    }
  }
  createMarkers() {
    switch (this.mapType) { /* 같은 분기 반복 */ }
  }
  subscribeInfoWindow() {
    switch (this.mapType) { /* 또 반복 */ }
  }
}

// 좋음: Adapter 패턴. 변화의 축(mapType)을 1곳에 가둠
class NaverMap {
  markCurrentPosition() { /* Naver 구현 */ }
  createMarkers() { /* ... */ }
  subscribeInfoWindow() { /* ... */ }
}
class GoogleMap { /* 동일 인터페이스, Google 구현 */ }

class EasyMap {
  constructor(obj) {
    this.impl = this.createConcreteMap();
  }
  markCurrentPosition() { this.impl.markCurrentPosition(); }
  createMarkers() { this.impl.createMarkers(); }
  subscribeInfoWindow() { this.impl.subscribeInfoWindow(); }

  createConcreteMap() {
    const table = { naver: NaverMap, google: GoogleMap };
    const Ctor = table[this.mapType];
    if (!Ctor) throw new Error('Not supported');
    return new Ctor();
  }
}
```

- Switch가 한 조건으로 **여러 함수에 반복**되면 추상화 누락의 강한 신호
- 새 구현체(DaumMap) 추가 시 **변경 범위가 테이블 1줄 + 클래스 1개**로 끝나는지 확인
- 디자인 패턴 이름(Adapter·Strategy·Factory)은 라벨일 뿐, 핵심은 **변화의 축 분리**

### 3. 책임 분리 (SRP)

함수·클래스가 **한 가지 일**만.

- 한 함수가 100줄이 넘으면 **중간 추상화 누락** 신호
- 하위 단계 분리 후 50줄도 여전히 크면 또 쪼갠다
- 이름이 "…And…"이거나 "…Or…"면 분리 대상

### 4. 이름 (Naming)

의도를 드러내는 이름.

- `data1`, `tmp`, `fn` 같은 의미 없는 이름 금지
- 단위·역할·도메인 용어 포함 (`userIdList`, `retryBackoffMs`)
- prefix 중복(`markerName`, `markerId`)이 있으면 **묶일 후보**라는 신호

## 리팩토링 사례 분석

실제 코드 한 예를 놓고 품질을 올리는 과정.

### 진단: Advanced Beginner의 시그널

- 멤버 변수 **prefix 중복** + 묶이지 않은 병렬 구조
- `switch (this.mapType)`이 **7곳**에 반복
- 함수 길이: `markCurrentPosition()` 120줄, `createMarkers()` 140줄, `subscribeInfoWindow()` 100줄
- 함수 하나에 문제 해결 로직을 **주르륵** 나열 — 책임 분리 실패
- 표면상 Class로 감쌌지만 Class를 **교과서처럼 활용 못함**

### 처방: 5~10분 리팩토링

1. **병렬 배열 → Marker 클래스**: `markerNames`, `markerIds` 제거, `markers = [new Marker(id, name, ...)]`
2. **Switch → Adapter 클래스 분리**: `NaverMap`, `GoogleMap` 각각 3개 메서드만 가짐
3. **EasyMap은 Facade**: 내부에 `impl`을 두고 위임
4. **createConcreteMap에서 Switch도 제거**: 타입-생성자 매핑 테이블로 데이터화
5. **subscribeInfoWindow 100줄** → 클래스 분리로 50줄 → 더 쪼개기

### 효과

- 새 지도(DaumMap) 추가 → **1 클래스 + 1 테이블 행**으로 종료
- Google 패치가 Naver 동작에 영향 없음을 **구조로 보장**
- 전체 테스트 범위 축소 (각 Adapter만 테스트하면 됨)
- 코드 읽기 시간 ½ 이하

## 품질이 주는 장기 효과

### 비대칭: 만들기 vs 쓰기

- **만드는 비용**: Adapter 구조 설계 +10분
- **쓰는 비용**:
  - Advanced Beginner가 Switch 7곳을 다 찾아 수정 (+2시간, 실수 가능성 高) vs Adapter로 분리된 파일 1개만 수정 (+10분, 실수 거의 없음)
- 한 번의 설계 품질 투자가 **이후 모든 사용자의 시간 복리**

### 조직 관점

- 품 많이 드는 구현은 주로 Advanced Beginner가 수행
- Competent가 정리·체계화 → **사용성·안정성은 Competent 단독 작업 수준에 수렴**
- Advanced Beginner가 **Competent의 정리된 코드 위에서** 개발할 때 오류↓·속도↑
- 즉 "한 명의 Competent"가 **팀 전체를 끌어올린다**

### 학습 가속

- 좋은 코드를 **보기만** 해서는 "쟤가 잘하니까 되는 것"으로 인식
- 자기 코드가 **리팩토링되는 과정을 직접** 관찰하면 "나도 할 수 있다"로 내재화
- 따라서 코드 리뷰는 **배움의 가장 큰 레버**

## 품질의 체크리스트

- 관련 데이터가 **묶여** 있는가 (Class·Struct·Record)
- 변화의 축이 **1곳에** 있는가 (Switch 중복 없음)
- 함수가 **50줄 이하**·단일 책임인가
- 이름이 **의도**를 드러내는가
- 새 요구사항 추가 시 **변경 범위**가 작은가
- 실패 시 **영향 범위**가 국소화되는가
- 외부 기술 변경이 도메인에 영향 없는가 ([[Layered-Clean-Hexagonal]])

## 품질·속도의 오해와 실천

- **"품질 = 느린 개발"** — 단기만 그렇고 3개월+ 구간에서는 품질이 더 빠름
- **"최신 기술 = 품질"** — 최신 기술이 추상화·책임 분리를 자동 보장하지 않음
- **"커버리지 100% = 품질"** — 구조 없으면 테스트도 부채

실천: 교과서 체화 + 자기 코드 매주 리팩토링 + 디자인 패턴을 변화 축의 해법으로 학습 + 팀 코드 리뷰 필수화 + 스프린트 15~20% 기술 부채 해소 + 채용 시 [[Competence-Identification|1시간 코드 리뷰 과제]]

## 면접 체크포인트

- "교과서적 코드"의 의미 한 문장
- 응집·추상화·책임 분리·이름 4축 중 **각각의 판별 신호**
- Switch 중복이 무엇을 가리키는지(추상화 누락)
- 병렬 배열 vs Class 묶음의 **버그 비대칭**
- Adapter·Strategy·Factory가 **같은 원리**(변화 축 분리)임을 설명할 수 있는가
- "만들기는 어렵지만 쓰기는 쉽다"의 복리 효과 예시

## 출처
- 블로그 "really impressed with the quality" (능력있는 개발자와 코드 품질)

## 관련 문서
- [[Dreyfus-Skill-Model|드레퓌스 기술 습득 모형]]
- [[Competence-Identification|능력있는 개발자 판별법]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[tech/architecture-design/design-pattern/디자인패턴이란|디자인 패턴이란]]
- [[Readable-Code-Cognition|코드 가독성의 인지과학]]
- [[Avoid-Hard-Coding|하드코딩 · 매직 넘버 제거]]
- [[Code-Review-Culture|생산적 코드 리뷰 문화]]
