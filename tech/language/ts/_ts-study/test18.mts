/**
 * 한 값의 null 여부가 다른 값의 null 여부에 암시적으로 관련되도록 설계하면 안됨.
 */

/**
 * 최대값, 최소값을 구하는 함수.
 *
 * 이 코드는 min의 null 체크로 인해 max의 타입 오류가 발생함.
 */
const extent = (nums: number[]) => {
    let min, max;

    for (const num of nums) {
        if (!min) {
            min = num;
            max = num;
        } else {
            min = Math.min(min, num);
            // TS2345: Argument of type number | undefined is not assignable to parameter of type number
            // max = Math.max(max, num);
        }
    }

    return [min, max];
};

/**
 * 최대값, 최소값을 구하는 함수.
 *
 * number 튜플을 선언하여 null 여부에 따라 같이 영향을 받도록 함.
 */
const extent2 = (nums: number[]) => {
    let result: [number, number] | null = null;

    for (const num of nums) {
        if (!result) {
            result = [num, num];
        } else {
            result = [
                Math.min(result[0], num),
                Math.max(result[1], num)
            ];
        }
    }

    return result;
};
