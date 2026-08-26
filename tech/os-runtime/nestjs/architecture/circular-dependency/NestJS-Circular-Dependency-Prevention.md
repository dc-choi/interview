---
tags: [nestjs, circular-dependency, di, architecture]
status: done
verified_at: 2026-08-26
category: "OS & Runtime - NestJS"
aliases: ["순환 의존성 자동화 방어", "import no-cycle 아키텍처 테스트"]
---

# NestJS 순환 의존성 — 자동화 방어와 실수 대응

## Best Practices — 자동화로 막기

### 의존성 그래프 분석

`Reflect.getMetadata('design:paramtypes', class)`로 정적 그래프 추출 → DFS로 사이클 탐지. 부팅 시 자체 점검 루틴으로 돌리거나 CI에 통합.

### ESLint `import/no-cycle`

```js
// .eslintrc.js
rules: {
  'import/no-cycle': ['error', { maxDepth: 3 }],
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: ['../../../*'], message: 'Too deep relative imports' }] },
  ],
}
```

소스 레벨 import 사이클을 PR 단계에서 차단. DI 사이클과는 별개지만 강한 상관.

### 아키텍처 테스트

```ts
it('domain layer must not depend on infrastructure', () => {
  const domainServices = getAllDomainServices();
  domainServices.forEach(s => {
    expect(getDependencies(s).filter(d => /Repository|External/.test(d))).toHaveLength(0);
  });
});
```

레이어 의존 방향을 테스트로 강제. ArchUnit-TS 같은 라이브러리도 옵션.

## 성능, 메모리

- `forwardRef`의 성능 비용보다 순환으로 인한 의존 방향과 테스트 복잡도를 먼저 점검한다. 성능 영향은 애플리케이션 그래프와 초기화 작업에 따라 측정한다.
- **REQUEST 스코프 + forwardRef 조합** — 요청마다 재해결 → 비용 큼. 비용 문제를 넘어 순환 관계가 `Scope.REQUEST` 프로바이더에 걸리면 **의존성이 undefined로 들어올 수 있다** (공식 경고). 가능하면 DEFAULT 스코프로 유지.
- `ModuleRef.get()`을 핫패스에서 반복 호출하지 말고, 필요성과 측정 결과에 따라 초기화 시점에 참조를 보관한다.

## 흔한 실수

| 함정 | 증상 | 대응 |
|------|------|------|
| 생성자 순서에 의존 | 상대 초기화가 끝나지 않은 상태에서 부작용 발생 | 생성자에서 상호 호출과 순서 가정 제거, REQUEST 스코프 순환은 피함 |
| 모듈 레벨 forwardRef 누락 | "circular dependency" 부팅 실패 | 양쪽 모듈 모두 forwardRef |
| ModuleRef로 모든 의존 회피 | 정적 분석, 테스트 약화 | 마지막 수단 |
| Event로 트랜잭션 통보 | in-process event만으로 원자성이 보장되지 않음 | 같은 트랜잭션이 필요하면 facade 또는 명시적 트랜잭션, outbox 설계 |
| Facade가 Goddess 클래스로 비대 | 책임 경계 흐려짐 | use-case 단위로 분리 |

## 면접 체크포인트

- 부팅 실패의 이유 — DAG 위상 정렬 불가
- 5가지 전략과 우선순위 — Domain/Facade > Event > ModuleRef > forwardRef
- forwardRef 동작 — `() => Class` 지연 평가, 생성자 순서 비결정과 REQUEST 스코프 위험
- ModuleRef Lazy의 대가 — 정적 분석, 테스트 약화
- Event 기반의 한계 — 트랜잭션 경계 깨짐, 결과적 일관성
- 자동화 방어 — `import/no-cycle`, 의존성 그래프 분석, 아키텍처 테스트
- "처음 forwardRef → 가독성 저하 → CQRS 리팩토링" 같은 진화 스토리

## 출처
- [NestJS — Circular dependency](https://docs.nestjs.com/fundamentals/circular-dependency)
