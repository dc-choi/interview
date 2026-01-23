interface Coordinate {
    x: number;
    y: number;
}

interface BoundingBox {
    x: [number, number];
    y: [number, number];
}

// 다각형 인터페이스
interface Polygon {
    exterior: Coordinate[];
    holes: Coordinate[];
    bbox?: BoundingBox; // 최적화 속성이라 optional
}

const isPolygonInPolygon = (polygon: Polygon, pt: Coordinate) => {
    const { bbox } = polygon;

    if (bbox) {
        const { x: ptX, y: ptY } = pt;
        const { x: boxX, y: boxY } = bbox;

        if (ptX < boxX[0] || ptX > boxX[1] || ptY < boxY[0] || ptY > boxY[1]) {
            return false;
        }
    }

    return true;
};
