---
tags: [container, buildpacks, paketo, spring-boot, java, oci, image-build]
status: done
verified_at: 2026-10-11
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloud Native Buildpacks", "Buildpacks", "Paketo Buildpacks", "Spring Boot build-image", "bootBuildImage"]
---

# Cloud Native Buildpacks — Dockerfile 없이 이미지 만들기

## 정의와 mental model

Cloud Native Buildpacks(CNB)는 애플리케이션 코드나 빌드 산출물을 검사해 실행 가능한 OCI 이미지로 바꾸는 방식이다. Dockerfile에 베이스 이미지, 설치 명령과 레이어 순서를 직접 적는 대신 builder 이미지에 묶인 buildpack들이 프로젝트를 감지하고 필요한 런타임과 의존성을 레이어로 만든다. 사용자가 고르는 것은 명령의 순서가 아니라 builder와 설정값이다. 베이스 이미지 선택이 사라지는 것이 아니라 builder에 위임된다.

| 구성 요소 | 역할 |
|---|---|
| buildpack | 코드를 분석해 빌드 방법을 정하고 실행 가능한 산출물로 바꾼다 |
| builder | buildpack 묶음, 빌드 시점 베이스 이미지, lifecycle 바이너리와 실행 시점 베이스 이미지의 참조를 담은 OCI 이미지 |
| build image | 빌드 환경의 베이스 OS 이미지. JDK 같은 언어 도구는 보통 buildpack이 레이어로 설치한다 |
| run image | 앱 이미지의 실행 시점 베이스. 구성은 base image 변형(Paketo의 tiny, base 등)마다 다르다 |
| lifecycle | buildpack을 조율하고 결과를 OCI 이미지로 조립한다 |

## 동작 원리

lifecycle은 analyze, detect, restore, build, export 단계로 이미지를 만든다. detect 단계는 builder에 든 buildpack 가운데 이번 빌드에 참여할 순서 있는 그룹을 고르고, build 단계는 통과한 buildpack이 산출물과 레이어를 만들며, export 단계는 run image 위에 그 레이어를 얹는다. lifecycle과 buildpack은 non-root 사용자로 실행된다.

rebase는 run image가 바뀌었을 때 앱을 다시 빌드하지 않고 앱 레이어를 새 run image 위에 다시 얹는 작업이다(`pack rebase my-app:my-tag`). OS 레이어의 보안 패치를 빠르게 반영할 수 있지만, 이는 run image 제작자가 새 버전에서 이전 버전과의 ABI 호환을 지킨다는 계약에 기대는 동작이다. rebase는 run image 레이어만 바꾸므로 buildpack이 넣은 JRE 같은 레이어의 패치는 다시 빌드해야 반영되고, 실행은 `pack` 같은 CNB 플랫폼 도구로 한다.

## Spring Boot에서 쓰기

Spring Boot의 Maven과 Gradle 플러그인은 jar나 war를 CNB로 OCI 이미지로 만든다. 2026-10-11 Spring Boot 4.1 문서 기준이다.

```bash
./mvnw spring-boot:build-image   # Maven, package 단계를 먼저 실행한다
./gradlew bootBuildImage         # Gradle
```

- **Docker 데몬이 필요하다.** `build-image`와 `bootBuildImage`는 Docker 데몬 접근을 요구하며, 문서는 podman과 Colima 같은 호환 엔진의 연결 설정도 안내한다. 데몬 없이 레지스트리로 바로 올리는 [[Jib-Java-Container|Jib]]과 다른 점이다. 이는 Spring Boot 플러그인 경로의 조건이며, CNB lifecycle 자체는 OCI 레지스트리나 Docker 호환 데몬 중 하나에 접근하면 된다.
- **입력은 패키징한 산출물이다.** Maven `build-image`는 Maven lifecycle을 fork해 `package`를 먼저 실행하고, Maven lifecycle에 묶을 때는 fork하지 않는 `build-image-no-fork`를 쓴다. 플러그인 경로에서는 로컬 Maven이나 Gradle이 먼저 패키징하므로 JDK와 Docker 호환 엔진이 필요하다. 소스를 넘기는 `pack build`에서는 Paketo가 build 컨테이너 안에서 컴파일한다.
- **기본값을 확인한다.** builder 기본값은 `paketobuildpacks/builder-noble-java-tiny:latest`이고 run image는 builder 메타데이터를 따른다. 이 tiny run image는 README가 Linux 배포판을 포함하지 않는다고 밝힌 최소 이미지이므로(Paketo 스택 문서는 같은 계열인 Jammy Tiny의 run image를 distroless에 견준다), 셸 기반 진단과 health check가 된다고 가정하지 않는다([[Image-Size-Optimization|셸 없는 이미지 진단]]). 이미지 이름 기본값은 Maven `docker.io/library/${project.artifactId}:${project.version}`, Gradle `docker.io/library/${project.name}:${project.version}`이다. 두 플러그인 모두 `pullPolicy` 기본값은 `ALWAYS`다.
- **JVM 버전은 프로젝트를 따른다.** 기본 Paketo builder를 쓰면 플러그인이 프로젝트의 대상 Java 버전(Maven `maven.compiler.target`, Gradle `targetCompatibility`)을 buildpack에 넘긴다. 바꾸려면 `BP_JVM_VERSION`을 준다.
- **레이어는 `layers.idx`를 따른다.** 다시 패키징한 jar에는 dependencies, spring-boot-loader, snapshot-dependencies, application 순서의 `layers.idx`가 기본으로 들어가고 Paketo Spring Boot buildpack이 이를 이미지 레이어에 반영한다.

```xml
<plugin>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-maven-plugin</artifactId>
  <configuration>
    <image>
      <name>example.com/library/${project.artifactId}</name>
      <env>
        <BP_JVM_VERSION>21</BP_JVM_VERSION>
      </env>
    </image>
  </configuration>
</plugin>
```

Paketo Java buildpack은 빌드에 JDK를, 실행에 JRE를 쓰는 것이 기본이다(`BP_JVM_TYPE`). 실행 시점에는 메모리 계산기가 컨테이너 메모리에서 힙 밖 영역(direct memory, metaspace, code cache, thread stack)과 여유분을 뺀 값으로 힙을 정해 JVM 옵션을 `JAVA_TOOL_OPTIONS`에 붙인다. `BP_`로 시작하는 변수는 빌드 시점, `BPL_`로 시작하는 변수는 실행 시점 설정이다. 힙 비율을 직접 정하는 방식과 섞으면 의도한 값이 적용됐는지 실행 중 JVM 옵션으로 확인한다([[JVM-Container-Memory|JVM 컨테이너 메모리]]).

## Dockerfile, Jib과 비교

| 축 | Dockerfile | Jib | Buildpacks(Spring Boot 플러그인) |
|---|---|---|---|
| 정의 위치 | Dockerfile 명령 | 빌드 플러그인 설정 | builder 선택과 환경 변수 |
| 베이스 이미지 | 직접 선택 | `from.image`, 기본은 Java 버전에 맞춘 Temurin JRE | builder 메타데이터의 run image, 지정해 바꿀 수 있음 |
| Docker 데몬 | 일반적으로 필요 | 필요 없음 | 필요(호환 엔진 포함) |
| OS 패치 반영 | 다시 빌드 | 다시 빌드 | `pack rebase` 같은 CNB 도구로 rebase 가능(run image의 ABI 호환 전제, JRE 같은 buildpack 레이어 패치는 다시 빌드) |
| 자유도 | 가장 높음 | 플러그인 설정 범위 | buildpack이 지원하는 설정 범위 |

## 트레이드오프와 운영 점검

- `latest` 태그의 builder와 run image를 쓰면 같은 코드도 빌드 시점에 따라 다른 베이스가 들어간다. 재현이 필요하면 사용한 builder와 run image를 digest로 기록하고, 갱신은 의도한 시점에 한다([[Image-Size-Optimization|베이스 이미지 선택]]).
- 시스템 패키지 추가나 특수한 런타임 구성은 buildpack이 지원하는 범위에 묶인다. 범위를 벗어나면 별도 buildpack, 다른 builder 또는 Dockerfile을 검토한다.
- Spring Boot 플러그인 경로는 Docker 호환 엔진에 의존하므로 CI 러너의 데몬 접근 권한을 검토한다. 데몬 권한을 줄이는 것이 목표면 Jib이나 레지스트리로 직접 내보내는 CNB 플랫폼이 대안이다.
- 명령 하나로 이미지가 나온다는 것은 빌드 관례가 적용됐다는 뜻이다. 헬스체크, 리소스 한도, 취약점 대응과 배포 정책까지 끝났다는 뜻은 아니다([[Docker-Image-Pipeline|Docker 이미지 빌드 파이프라인]]).

## 면접 체크포인트

- builder, build image, run image와 lifecycle이 각각 무엇을 맡는지
- rebase가 앱 재빌드 없이 OS 패치를 반영할 수 있는 이유와 그 전제(ABI 호환)
- Buildpacks(Spring Boot 플러그인)와 Jib의 차이(데몬 필요 여부, 베이스 이미지 결정 방식, OS 패치 반영)
- Paketo 이미지의 JRE 실행과 메모리 계산기가 JVM 힙 설정에 주는 영향

## 출처

- [Spring Boot Maven Plugin, Packaging OCI Images](https://docs.spring.io/spring-boot/maven-plugin/build-image.html)
- [Spring Boot Gradle Plugin, Packaging OCI Images](https://docs.spring.io/spring-boot/gradle-plugin/packaging-oci-image.html)
- [Spring Boot Reference, Cloud Native Buildpacks](https://docs.spring.io/spring-boot/reference/packaging/container-images/cloud-native-buildpacks.html)
- [Spring Boot Reference, Efficient Container Images](https://docs.spring.io/spring-boot/reference/packaging/container-images/efficient-images.html)
- [Spring Boot Maven Plugin, Packaging Executable Archives](https://docs.spring.io/spring-boot/maven-plugin/packaging.html)
- [Cloud Native Buildpacks, What is a buildpack?](https://buildpacks.io/docs/for-app-developers/concepts/buildpack/)
- [Cloud Native Buildpacks, What is a builder?](https://buildpacks.io/docs/for-app-developers/concepts/builder/)
- [Cloud Native Buildpacks, Run image](https://buildpacks.io/docs/for-app-developers/concepts/base-images/run/)
- [Cloud Native Buildpacks, What is the lifecycle?](https://buildpacks.io/docs/for-platform-operators/concepts/lifecycle/)
- [Cloud Native Buildpacks, What happens during rebase?](https://buildpacks.io/docs/for-app-developers/concepts/rebase/)
- [Cloud Native Buildpacks Specification, Platform Interface](https://github.com/buildpacks/spec/blob/main/platform.md)
- [Paketo Buildpacks, How to Build Java Apps with Paketo Buildpacks](https://paketo.io/docs/howto/java/)
- [Paketo Buildpacks, Java Buildpack Reference](https://paketo.io/docs/reference/java-reference/)
- [Paketo Buildpacks, How To Configure Paketo Buildpacks](https://paketo.io/docs/howto/configuration/)
- [Paketo Buildpacks, ubuntu-noble-base-images](https://github.com/paketo-buildpacks/ubuntu-noble-base-images)
- [Paketo Buildpacks, Stacks](https://paketo.io/docs/concepts/stacks/)
- [One command gets you a production-ready Spring Boot image — Coffee + Software](https://www.youtube.com/watch?v=jhdDfrXLm1Q)

## 관련 문서

- [[Container-Image-Build|컨테이너 이미지 빌드와 베이스 이미지 선택]]
- [[Jib-Java-Container|Jib]]
- [[Multi-Stage-Build|멀티스테이지 빌드]]
- [[Image-Size-Optimization|Image Size Optimization]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리]]
- [[Docker-Image-Pipeline|Docker Image Build Pipeline]]
