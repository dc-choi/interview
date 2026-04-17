---
tags: [database, rdbms, mysql, gis, spatial-index]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL Spatial Index", "GIS", "공간 데이터"]
---

# MySQL 공간 데이터 · 공간 색인

위·경도, 다각형 같은 **공간(spatial) 데이터**를 DB에서 직접 다루기 위한 기능. MySQL 8.0은 OGC 표준의 GIS 함수와 R-Tree 기반 공간 인덱스를 제공한다. "근처 가게 찾기", "배송 가능 지역 판별", "지오펜싱" 같은 위치 기반 기능의 기반.

## 기본 개념

- **Geometry**: 공간 데이터 추상 타입. 하위에 Point·LineString·Polygon·MultiPolygon·GeometryCollection
- **SRID(Spatial Reference System ID)**: 좌표계 식별자. 가장 많이 쓰는 게 **4326(WGS84, GPS)**
- **R-Tree 인덱스**: B-Tree가 1차원 정렬 기반이라면 R-Tree는 다차원 공간 영역 기반. 공간 검색에 최적

스키마 예:
```sql
CREATE TABLE stores (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100),
  location POINT NOT NULL SRID 4326,
  SPATIAL INDEX (location)
) ENGINE=InnoDB;
```

## 자주 쓰는 GIS 함수

### 일반 Geometry
| 함수 | 용도 |
|---|---|
| `ST_GeometryType(g)` | 타입 문자열 반환 (`'POINT'`, `'POLYGON'` 등) |
| `ST_IsValid(g)` | 형상이 유효한지 |
| `ST_Dimension(g)` | 차원 (Point=0, Line=1, Polygon=2) |
| `ST_Envelope(g)` | 최소 경계 사각형(MBR) |
| `ST_SRID(g)` / `ST_SRID(g, srid)` | SRID 조회/변경 |
| `ST_Area(g)` | 면적 (Polygon·MultiPolygon만, 그 외 NULL) |

### Point 전용
| 함수 | 용도 |
|---|---|
| `ST_X(p)` / `ST_X(p, x)` | X 좌표 조회/수정 (모든 좌표계) |
| `ST_Y(p)` / `ST_Y(p, y)` | Y 좌표 조회/수정 |
| `ST_Latitude(p)` / `ST_Latitude(p, lat)` | 위도 (지리 SRS만) |
| `ST_Longitude(p)` / `ST_Longitude(p, lon)` | 경도 (지리 SRS만) |

조회/수정이 **같은 함수 두 가지 호출 형태**라는 점이 특징. 두 인자를 주면 새 Point를 반환.

### 공간 관계
| 함수 | 용도 |
|---|---|
| `ST_Distance_Sphere(p1, p2)` | 두 점 사이의 구면 거리(미터) |
| `ST_Contains(g1, g2)` | g1이 g2를 포함하는가 |
| `ST_Within(g1, g2)` | g1이 g2 안에 있는가 |
| `ST_Intersects(g1, g2)` | 교차 여부 |

## 좌표계(SRID)와 위·경도 순서

가장 흔한 함정. SRID **4326의 표준은 (위도, 경도)** 순서지만, 일반적인 X/Y 직관은 **(경도, 위도)**. MySQL 8.0은 SRID에 따라 의미가 갈린다.

- **Cartesian SRS** (예: SRID 0): `POINT(x y)` → 그냥 평면 좌표
- **Geographic SRS** (예: 4326): `POINT(latitude longitude)` 또는 데이터에 따라 다름. **`ST_Latitude`/`ST_Longitude`로 명시적 접근 권장**

좌표 입력 시 의미를 잘못 잡으면 거리 계산이 수천 km 어긋난다. SRID를 명시하고 `ST_X` 대신 `ST_Latitude`를 쓰는 습관이 안전.

## 에러 케이스

| 조건 | 에러 |
|---|---|
| 잘못된 형식 | `ER_GIS_INVALID_DATA` |
| Point 아닌데 Point 함수 | `ER_UNEXPECTED_GEOMETRY_TYPE` |
| 지리 SRS 필요한데 Cartesian | `ER_SRS_NOT_GEOGRAPHIC` |
| 경도 범위 (−180, 180] 벗어남 | `ER_LONGITUDE_OUT_OF_RANGE` |
| 위도 범위 [−90, 90] 벗어남 | `ER_LATITUDE_OUT_OF_RANGE` |

## SPATIAL INDEX 동작

R-Tree 인덱스는 **MBR(Minimum Bounding Rectangle)** 단위로 후보를 빠르게 좁힌 뒤, 정확한 공간 함수로 최종 판정한다. `WHERE ST_Contains(area, ST_GeomFromText('POINT(...)'))` 같은 쿼리에서 풀스캔 없이 후보군부터 좁힘.

제약:
- **InnoDB SPATIAL INDEX는 NOT NULL 컬럼**에만 가능
- B-Tree와 함께 복합 인덱스로 쓸 수 없음
- 인덱스 생성·유지 비용은 일반 인덱스보다 큼

## 사례: 쿠팡 로켓배송 — H3 공간 색인

배송 영역을 우편번호 단위로 관리하면 경계가 모호하고 통계가 부정확. 쿠팡은 **Uber의 H3 지형공간 색인**을 도입해 영역을 육각형 격자로 표현한다.

핵심 설계:
- **H3 14레벨 육각형** 사용 (약 6.3m² 해상도) — 건물·도로 블록 단위 구분 가능
- 한국 전체를 약 217억 개 육각형으로 표현
- 사용자가 지도에 그린 다각형을 H3 polyfill로 변환 → "픽셀 아트 그리는 것과 비슷"
- 각 배송 영역이 **자신이 포함하는 육각형 ID 집합**을 보유 (H3 압축으로 메모리 효율화)
- 좌표 입력 → 14레벨 육각형 ID 변환 → 어느 영역에 속하는지 O(1) 가까이 판별

H3가 S2(구글) 대비 우위인 이유: 육각형은 인접 셀과의 거리가 균일해 왜곡이 적음. 사각형 격자는 대각선 인접 셀과 직각 인접 셀의 거리가 다름.

이 방식은 **MySQL의 SPATIAL INDEX 대신 격자 ID 기반 정수 인덱스**로 검색을 단순화한 사례. 공간 색인을 직접 쓰지 않고도 공간 검색의 본질(영역 분할 + 빠른 조회)을 달성.

## 면접 체크포인트

- SPATIAL INDEX는 어떤 자료구조인가 (R-Tree)
- SRID 4326의 의미와 (위도, 경도) 순서 함정
- `ST_Distance_Sphere`와 `ST_Distance`의 차이 (구면 vs 평면)
- 공간 검색에서 R-Tree와 격자 기반(H3·S2)의 트레이드오프
- "근처 N km 가게" 쿼리를 어떻게 작성할지

## 출처
- [MySQL 8.0 — Geometry Property Functions](https://dev.mysql.com/doc/refman/8.0/en/gis-property-functions.html)
- [MySQL 8.0 — Point Property Functions](https://dev.mysql.com/doc/refman/8.0/en/gis-point-property-functions.html)
- [Coupang Engineering — 로켓배송 공간 색인 기반 배송 영역 관리 시스템](https://medium.com/coupang-engineering/쿠팡-로켓배송-공간-색인-기반의-배송-영역-관리-시스템-a59006bc4b6e)

## 관련 문서
- [[Index|Index 기본]]
- [[Schema-Design|Schema design]]
