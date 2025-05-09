function solution(array) {
    const newArray = array.sort((a, b) => a - b);

    return newArray[(newArray.length - 1) / 2];
}