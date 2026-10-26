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

lifecycle은 analyze, detect, restore, build, export 단계로 이미지를 만든다. detect 단계는 builder에 든 buildpack 가운데 이번 빌드에 참여할 순서 있는 그룹을 고르고, build 단계는 통과한 buildpack이 산출물과 레이어를 만들며, export 단계는 run image 위에 그 레이어를 얹는다.

실행 권한은 단계마다 다르다. buildpack을 감지하고 실행하는 detect와 build 단계에서는 lifecycle과 buildpack이 non-root 사용자로 실행된다. 레지스트리 자격증명이나 Docker 데몬 접근이 필요한 analyze, restore, export는 buildpack 코드를 실행하지 않는다. 신뢰하지 않는 builder에서는 민감한 정보가 buildpack에 노출되지 않도록 이 세 단계를 별도 컨테이너에서 실행하고, 신뢰한 builder에서는 `creator`로 다섯 단계를 한 컨테이너에서 실행할 수 있다(아래 builder 허용 절). CNCF TAG Security의 평가를 돕기 위해 Buildpacks 프로젝트가 쓴 보안 자체 평가(작성일 표시 없음, 2020년과 2021년 로드맵 참조)는 플랫폼이 lifecycle로 빌드를 구현하는 이상적인 예로 이 세 단계를 플랫폼이 제공한 이미지에서 컨테이너 안 UID/GID 0으로 실행하는 구성을 들고, 이 단계에서는 사용자 코드가 실행되지 않는다고 적는다. 2026-10-26에 확인한 pack main(커밋 9b483c2)도 단계를 나눠 실행할 때 analyze, restore, export 컨테이너를 root 사용자로 시작하도록 지정한다(Linux 컨테이너 기준). 이는 시작 사용자이며, analyzer처럼 준비 뒤 권한을 내리는 단계도 있다. 따라서 lifecycle 전체가 non-root로 실행된다고 일반화하지 않는다.

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

## 허용한 builder와 실행 권한을 구분한다

2026-10-26 부분 검증: CNB의 lifecycle 문서, Trusted Builders 문서, `pack build` 문서와 소스(2026-10-21 커밋 9b483c2), Buildpacks 보안 자체 평가와 Spring Boot 4.1.2 Maven 플러그인 문서를 대조해 이 절을 쓰고 `## 동작 원리`의 단계별 실행 사용자 설명을 고쳤다. 기존 Spring Boot 설정과 hardened builder 절의 검증일은 유지한다.

플랫폼에서 임의 Dockerfile 대신 승인한 builder와 buildpack을 제공하면 빌드 입력의 선택 범위를 좁힐 수 있다(설계 제안). 다만 `pack build`는 빌드 때 buildpack을 더할 수 있고(`--buildpack`, project.toml) image extension은 Dockerfile을 build나 run base image에 적용하므로, 이 효과는 추가 입력도 플랫폼이 통제할 때만 성립한다. 승인 목록은 애플리케이션 코드의 무해함이나 최종 이미지의 안전성도 보증하지 않는다. Buildpacks 보안 자체 평가는 악성 buildpack이나 스택 이미지(build, run base image)가 들어오면 그것으로 빌드한 모든 애플리케이션이 침해될 수 있다고 본다. 빌드 인프라는 그 이미지를 권한을 주어 실행하지 않는 한 반드시 침해되지는 않는다고 보면서, 악성 buildpack, 스택 이미지나 애플리케이션 코드의 컨테이너 탈출로 빌드 인프라가 침해되는 경우도 위협으로 다룬다.

`pack`의 trusted builder 설정은 단순한 품질 표시가 아니라 실행 방식에 영향을 준다. 신뢰하는 builder에서는 `creator`가 lifecycle 단계를 한 컨테이너에서 실행할 수 있다. 다만 2026-10-26에 확인한 pack main(커밋 9b483c2) 기준으로 신뢰한 builder여도 빌드 때 `--extension`으로 builder 밖의 extension(레지스트리, 이미지, 아카이브)을 더하면 `--trust-extra-buildpacks`와 관계없이, builder 밖의 buildpack을 더하면 `--trust-extra-buildpacks`를 주지 않은 경우에 단계를 나눠 실행한다. project.toml의 inline buildpack은 이 판단에서 빠진다. 같은 소스의 `TrustBuilder` 주석은 모든 단계를 한 컨테이너에서 실행하는 이 최적화가 레지스트리 자격증명을 builder의 build image에 둔다고 적고, 최적화는 builder와 buildpack을 모두 신뢰할 때만 일어난다고 단서를 단다. 신뢰하지 않는 builder에서는 단계를 분리하고, 사용 가능한 공개 lifecycle 이미지로 더 높은 권한이 필요한 단계를 실행한다. `analyze`, `restore`, `export`가 필요로 하는 권한이나 레지스트리 자격증명이 `detect`, `build`에 불필요하게 노출되지 않게 하기 위한 구분이다. `pack builder suggest`가 제안하는 builder는 기본으로 신뢰한다. Spring Boot 4.1.2 Maven 플러그인의 `trustBuilder` 기본값도 기본 builder인 `paketobuildpacks/builder-noble-java-tiny`를 포함한 지정 builder에서는 `true`, 그 밖에서는 `false`다. 다른 builder로 바꾸면 이 값과 builder 출처를 함께 확인한다(운영 제안).

공개 lifecycle 이미지가 없는 오래된 lifecycle(0.7.5 미만, 0.6.1 제외)로 만든 builder는 신뢰하지 않으면 `pack build`가 실패한다. 이 실패를 없애려고 검토하지 않은 builder에 `--trust-builder`를 붙이지 않고, 새 lifecycle로 만든 builder로 바꾸는 방법을 먼저 검토한다(운영 제안). builder 공급자와 구성요소를 검토하고, 빌드 작업에 전달하는 자격증명과 호스트 접근 범위를 별도로 확인한다(운영 제안). builder를 허용하는 판단, 빌드 실행의 격리와 최종 산출물 검증을 각각 남긴다(운영 제안). 이 절은 특정 빌드 환경의 격리 효과를 시험한 결과가 아니다.

## Hardened builder와 산출물 검증

이 절의 제품 동작과 명령은 2026-10-14 공식 문서 기준이다. 기존 Spring Boot 설정 절의 검증 기준은 별도로 유지한다.

Hardened builder는 빌드 자동화에 보안 패치를 관리하는 run image를 결합한다. 예를 들어 BellSoft의 Paketo 기반 builder는 hardened run image를 사용하고 `bellsoft/buildpacks.builder:glibc`와 `bellsoft/buildpacks.builder:musl` 변형을 제공한다. libc 선택은 이미지 크기만으로 정하지 않고 애플리케이션과 네이티브 의존성의 호환성을 시험한다. 공급자가 패치 이미지를 제공해도 사용자는 갱신한 이미지로 다시 빌드하거나 호환 가능한 rebase를 수행하고 배포해야 한다.

SBOM, 서명과 취약점 검사는 서로 다른 질문에 답한다.

| 증거 | 확인할 내용 | 남는 확인 |
|---|---|---|
| SBOM | 어떤 구성요소와 버전이 들어 있는가 | 생성 도구의 수집 범위, 알려진 취약점과의 대조 |
| 이미지 서명 | 신뢰할 서명자가 해당 digest에 서명했는가 | 애플리케이션 동작과 취약점 유무 |
| 취약점 검사 | 검사 시점에 알려진 취약점과 일치하는가 | 새 취약점 공개 후 재검사와 패치 배포 |

Paketo의 SBOM은 buildpack이 직접 설치한 JVM 같은 런타임과 패키지 관리자로 설치한 언어 의존성을 구분한다. 지원 형식은 각 buildpack의 `buildpack.toml`에 있는 `buildpack.sbom-formats`에서 확인한다. SBOM이 있다는 사실만으로 모든 CNB 이미지의 수집 범위가 같다고 보지 않는다.

```bash
pack sbom download my-app:my-tag --output-dir ./sbom
```

이 명령으로 얻는 Paketo의 Syft, CycloneDX, SPDX SBOM은 **실행 시점 애플리케이션 의존성**을 담는다. 빌드 시점 의존성도 보존하려면 `pack build`의 `--sbom-output-dir` 옵션으로 빌드 중 SBOM을 추출한다. 따라서 다운로드한 SBOM 하나를 빌드 도구와 베이스 OS 전체의 목록으로 간주하지 말고, 베이스 이미지 공급자가 제공하는 SBOM과 최종 이미지 검사 결과의 범위를 함께 확인한다.

서명 확인에서는 신뢰하는 공개 키 또는 keyless 인증서의 identity와 OIDC issuer를 검증 기준으로 정한다. Cosign은 기본적으로 서명 payload의 digest와 대상 이미지의 digest가 일치하는지도 검사한다. 운영에서는 검증한 digest를 배포 대상과 대조하고, 재빌드나 rebase로 산출물이 바뀌면 해당 산출물의 증거를 다시 확인한다. Hardened라는 이름이나 서명 성공을 애플리케이션 전체에 취약점이 없다는 보증으로 사용하지 않는다.

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
- [Cloud Native Buildpacks, Trusted Builders](https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/concepts/trusted_builders/)
- [Cloud Native Buildpacks, pack build](https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/cli/pack_build/)
- [pkg/client/build.go — buildpacks/pack](https://github.com/buildpacks/pack/blob/9b483c2428d832957efc7fe3d96bbef1395ca001/pkg/client/build.go)
- [internal/build/lifecycle_execution.go — buildpacks/pack](https://github.com/buildpacks/pack/blob/9b483c2428d832957efc7fe3d96bbef1395ca001/internal/build/lifecycle_execution.go)
- [internal/build/phase_config_provider.go — buildpacks/pack](https://github.com/buildpacks/pack/blob/9b483c2428d832957efc7fe3d96bbef1395ca001/internal/build/phase_config_provider.go)
- [Cloud Native Buildpacks Security Assessment — CNCF TAG Security](https://tag-security.cncf.io/community/assessments/projects/buildpacks/self-assessment/)
- [Cloud Native Buildpacks, Run image](https://buildpacks.io/docs/for-app-developers/concepts/base-images/run/)
- [Cloud Native Buildpacks, What is the lifecycle?](https://buildpacks.io/docs/for-platform-operators/concepts/lifecycle/)
- [Cloud Native Buildpacks, What happens during rebase?](https://buildpacks.io/docs/for-app-developers/concepts/rebase/)
- [Cloud Native Buildpacks Specification, Platform Interface](https://github.com/buildpacks/spec/blob/main/platform.md)
- [Paketo Buildpacks, How to Build Java Apps with Paketo Buildpacks](https://paketo.io/docs/howto/java/)
- [Paketo Buildpacks, Java Buildpack Reference](https://paketo.io/docs/reference/java-reference/)
- [Paketo Buildpacks, How To Configure Paketo Buildpacks](https://paketo.io/docs/howto/configuration/)
- [Paketo Buildpacks, ubuntu-noble-base-images](https://github.com/paketo-buildpacks/ubuntu-noble-base-images)
- [Paketo Buildpacks, Stacks](https://paketo.io/docs/concepts/stacks/)
- [BellSoft Releases Hardened Builder for Paketo Buildpacks — BellSoft](https://bell-sw.com/blog/bellsoft-releases-hardened-builder-for-paketo-buildpacks/)
- [Paketo Buildpacks, Software Bill of Materials (SBOM)](https://paketo.io/docs/concepts/sbom/)
- [Paketo Buildpacks, How to Access the Software Bill of Materials](https://paketo.io/docs/howto/sbom/)
- [Sigstore, Verifying Signatures](https://docs.sigstore.dev/cosign/verifying/verify/)
- [One command gets you a production-ready Spring Boot image — Coffee + Software](https://www.youtube.com/watch?v=jhdDfrXLm1Q)
- [I'm not letting you bring your own Dockerfile — Coffee + Software](https://www.youtube.com/watch?v=e3D1FHlwfwc)

## 관련 문서

- [[Container-Image-Build|컨테이너 이미지 빌드와 베이스 이미지 선택]]
- [[Jib-Java-Container|Jib]]
- [[Multi-Stage-Build|멀티스테이지 빌드]]
- [[Image-Size-Optimization|Image Size Optimization]]
- [[JVM-Container-Memory|JVM 컨테이너 메모리]]
- [[Docker-Image-Pipeline|Docker Image Build Pipeline]]
