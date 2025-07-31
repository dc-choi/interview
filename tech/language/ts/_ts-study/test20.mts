/**
 * 인터페이스 안에서 유니온으로 처리하기보단 여러 상태의 인터페이스를 만들고 유니온으로 적용하는게 좋다.
 *
 * 아이템 28번의 유효한 상태만 표현하는 타입 지향과 비슷함.
 *
 * 관련된 데이터의 경우 하나의 객체로 묶는게 좋다.
 * 실제로는 관련된 데이터지만 타입 정보로는 어떤 관계도 표현되지 않는건 지양해야 함.
 */

// 이 설계보다
interface FillLayOut {}
interface LineLayOut {}
interface PointLayOut {}

interface FillPaint {}
interface LinePaint {}
interface PointPaint {}

// 이 코드에서는 실수가 많이 나올 수 있음.
interface Layer {
    layout: FillLayOut | LineLayOut | PointLayOut;
    paint: FillPaint | LinePaint | PointPaint;
}

// 이 설계가 나음.
interface FillLayer {
    type: 'fill';
    layout: FillLayOut;
    paint: FillPaint;
}
interface LineLayer {
    type: 'line';
    layout: LineLayOut;
    paint: LinePaint;
}
interface PointLayer {
    type: 'point';
    layout: PointLayOut;
    paint: PointPaint;
}

type LayerType = FillLayer | LineLayer | PointLayer;

const drawLayer = (layer: LayerType) => {
    switch (layer.type) {
        case 'fill':
            // 타입이 FillLayer
            console.log('fill')
            break;
        case 'line':
            // 타입이 LineLayer
            console.log('line')
            break;
        case 'point':
            // 타입이 PointLayer
            console.log('point')
            break;
    }
}

const layer: LayerType = {
    type: 'fill',
    layout: {
        a: 1,
        b: 2
    },
    paint: {
        a: 1,
        b: 2
    }
}
drawLayer(layer);
