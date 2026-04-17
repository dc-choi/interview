---
tags: [container, java, jib, spring-boot, docker, oci, gradle, maven]
status: done
category: "Infrastructure - Container"
aliases: ["Jib", "Java Container Build", "Dockerless Java Build"]
---

# Jib — Dockerfile·데몬 없이 Java 컨테이너 이미지 만들기

Google이 만든 Java 전용 컨테이너 이미지 빌드 도구(Gradle·Maven 플러그인). **Dockerfile이나 Docker 데몬 없이** 빌드 도구가 직접 OCI/Docker 이미지를 생성해 로컬 저장소나 레지스트리로 푸시한다. 빠른 증분 빌드와 캐시 친화적 레이어링이 핵심 장점.

## 왜 Java에 별도 도구인가

전통적인 Dockerfile 방식은 Java 애플리케이션에 비효율적이다.

- **단일 JAR로 패키징 → 단일 레이어**: 소스 한 줄만 바꿔도 JAR 전체가 새 레이어가 되어 캐시 무효화
- **Docker CLI 의존**: CI 러너에 Docker 데몬·sudo 권한 필요 (보안·운영 부담)
- **JVM 특화 최적화 부재**: 의존성 Jar·클래스·리소스를 구분해 다루지 않음

Jib은 JAR을 **압축하지 않고 분해**해 레이어로 나누므로, Java 빌드 특성에 맞게 캐시를 극대화한다.

## 레이어 구성

Jib은 이미지를 최소 5개 레이어로 분리한다.

| 레이어 | 내용 | 변경 빈도 |
|---|---|---|
| **Base Image** | distroless·adoptopenjdk 등 JVM 베이스 | 거의 없음 |
| **Dependencies** | `~/.m2`·Gradle 캐시의 라이브러리 JAR | 드묾 (버전 변경 시) |
| **Resources** | `src/main/resources`의 설정·템플릿 | 보통 |
| **Classes** | 컴파일된 `.class` 파일 | 매 커밋 |
| **JVM Args / Extra Files** | 기동 인자·추가 파일 | 드묾 |

변경 빈도 역순으로 쌓기 때문에 **소스만 바꾼 리빌드는 Classes 레이어만 다시 전송**한다. Dockerfile에서 Fat JAR를 통째로 `COPY`하는 방식과 질적으로 다른 캐시 효율.

## 데몬 없이 빌드·푸시

Jib의 동작 모드 3가지.

| 태스크 | 설명 | 용도 |
|---|---|---|
| `jib` | 레지스트리로 직접 푸시 | CI에서 가장 일반적. Docker 불필요 |
| `jibDockerBuild` | 로컬 Docker 데몬에 적재 | 개발자 로컬 테스트 |
| `jibBuildTar` | tar 파일로 저장 | 오프라인·커스텀 파이프라인 |

CI 환경에서 `jib`만 쓰면 Docker 데몬을 전혀 설치하지 않아도 된다. Kaniko·Buildah와 유사한 방향이지만 Java 생태계에 특화.

## Gradle 플러그인 예

```
plugins {
    id 'com.google.cloud.tools.jib' version '3.x'
}

jib {
    from {
        image = 'gcr.io/distroless/java17-debian12'
    }
    to {
        image = 'myrepo/my-service'
        tags = [version, 'latest']
        auth {
            username = providers.environmentVariable('REGISTRY_USER').get()
            password = providers.environmentVariable('REGISTRY_PASS').get()
        }
    }
    container {
        ports = ['8080']
        environment = ['SPRING_PROFILES_ACTIVE': 'prod']
        jvmFlags = ['-Xms512m', '-Xmx1024m', '-XX:+UseG1GC']
        creationTime = 'USE_CURRENT_TIMESTAMP'
    }
}
```

- `./gradlew jib`: 빌드 + 레지스트리 푸시
- `./gradlew jibDockerBuild`: 로컬 Docker에 이미지 생성

## 성능 특성

### 캐시 적중 시 증분 빌드
- 변경된 레이어만 다시 빌드·푸시
- 대표 벤치마크: 코드 한 줄 수정 후 리빌드 **10초대** (Dockerfile 방식 18~30초대 대비 30~50% 단축)
- CI에서 수천 번 빌드 시 누적 효과 큼

### 재현성(Reproducibility)
- 입력이 같으면 바이트 수준 동일 이미지 생성
- `creationTime`을 고정하면 이미지 digest까지 동일 — 같은 커밋에서 리빌드해도 digest가 변하지 않음
- 공급망 보안·이미지 검증에 유리

## Base Image 선택

Jib은 **distroless**(Google의 최소 이미지) 같은 가벼운 베이스와 잘 어울린다.

| Base | 특징 |
|---|---|
| `gcr.io/distroless/java17` | 셸·패키지 매니저 없음. 최소 공격 표면, 수십 MB |
| `eclipse-temurin:17-jre-alpine` | Alpine 기반 JRE, 작지만 glibc 이슈 주의 |
| `amazoncorretto:17` | AWS 공식 JDK, 일반 Linux 호환 |

distroless는 `kubectl exec` 디버깅이 어려우므로 디버그 태그(`:debug`)를 별도 준비하거나 Ephemeral Container로 대응.

## JVM 컨테이너 운영 포인트

Jib이 이미지를 만들어도 **JVM 자체의 컨테이너 대응**은 별도 고려 필요.

- **메모리 인식**: JDK 10+ 기본 `UseContainerSupport` 활성 — cgroup 메모리 한도 인식
- **`-XX:MaxRAMPercentage=75.0`**: 컨테이너 메모리의 비율로 힙 설정 (고정 `-Xmx`보다 유연)
- **GC 선택**: 단기 작업은 Serial/Parallel, 장기 서비스는 G1·ZGC
- **기동 속도**: CDS(Class Data Sharing)·AOT(GraalVM native image)로 콜드 스타트 단축

## Dockerfile 방식 vs Jib

| 축 | Dockerfile + Fat JAR | Jib |
|---|---|---|
| 레이어 분리 | 단일 JAR 레이어 | 5+ 자동 분리 |
| 증분 빌드 | JAR 전체 재전송 | 변경 레이어만 |
| Docker 데몬 | 필요 | 불필요 |
| 재현성 | 상대적으로 약함 | `creationTime` 고정으로 강함 |
| 이미지 커스터마이징 | 자유도 높음 | 플러그인 설정 범위로 제한 |
| 시스템 패키지 설치 | `RUN apt-get install` | 베이스 이미지 교체 또는 Extra Directory |
| 비 Java 스택과 혼합 | 가능 | 어려움 |

## 한계·트레이드오프

- **Dockerfile의 자유도 손실**: 시스템 패키지·외부 바이너리·컴파일러 설치 같은 작업은 베이스 이미지 교체로만 해결
- **비 Java 워크로드 혼합 어려움**: Sidecar·Nginx·Python 스크립트가 같이 들어가면 Jib만으로 부족
- **플러그인 의존성**: Gradle·Maven 버전과 맞물리므로 빌드 도구 업그레이드 시 호환 확인 필요
- **커스텀 레이어링이 필요한 경우 제약**: Jib이 만드는 5계층 외 세분화는 어려움

## 흔한 실수

- **Fat JAR를 만든 후 Jib로 다시 감싸기** — Boot Jar의 자동 레이어링과 충돌. `bootJar` 비활성 또는 `spring-boot.jib` 대신 기본 Jib 사용
- **`creationTime` 기본값(`EPOCH`)** — 매번 이미지 digest가 동일해 재푸시 없이 캐시가 먹히지 않는 것처럼 보일 수 있음. `USE_CURRENT_TIMESTAMP` 또는 커밋 타임스탬프 사용
- **레지스트리 인증 누락** — CI에서 환경변수로 자격 주입. Docker Hub·ECR·GCR 각각 토큰 형식 상이
- **distroless에서 `ps`·`bash` 의존** — 헬스체크·entrypoint 스크립트를 셸로 짜면 실행 불가 → Kubernetes `httpGet` 프로브·exec probe 직접 사용

## 면접 체크포인트

- Java 애플리케이션에서 Jib이 Dockerfile 방식보다 나은 **구조적 이유**(레이어 분리·재현성·데몬 불필요)
- 5개 레이어 분리와 증분 빌드가 **CI 시간**에 주는 효과
- distroless 같은 최소 베이스 이미지가 보안·크기 측면에서 갖는 이점과 디버깅 한계
- JVM 컨테이너 운영 시 **`MaxRAMPercentage`·`UseContainerSupport`** 같은 옵션의 의미
- Jib이 **적합하지 않은 상황**(시스템 패키지 설치·멀티 스택 컨테이너·커스텀 레이어링)

## 출처
- [Jib 기반의 Java 애플리케이션 컨테이너 이미지 — jh-labs](https://jh-labs.tistory.com/509)

## 관련 문서
- [[Docker|Docker 기본]]
- [[Multi-Stage-Build|Multi-stage Build (Node.js 등)]]
- [[Image-Size-Optimization|Image Size Optimization]]
- [[Docker-Image-Pipeline|Docker Image Build Pipeline]]
- [[Container-Entrypoint-Signals|Entrypoint와 시그널 (PID 1·Graceful Shutdown)]]
- [[GitHub-Actions|GitHub Actions CI/CD]]
