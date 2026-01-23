const finalMerge = (arr: number[], left: number, mid: number, right: number) => {
    let leftIndex = left;
    let rightIndex = mid + 1;

    let mergedArr = [];
    mergedArr.length = right + 1;
    // @ts-ignore
    mergedArr.fill(0, 0, right + 1);

    let tempIndex = left;
    while (leftIndex <= mid && rightIndex <= right) {
        if (arr[leftIndex] <= arr[rightIndex]) mergedArr[tempIndex] = arr[leftIndex++];
        else mergedArr[tempIndex] = arr[rightIndex++];
        tempIndex++;
    }

    if (leftIndex > mid) {
        for (let i = rightIndex; i <= right; i++) mergedArr[tempIndex++] = arr[i];
    } else {
        for (let i = leftIndex; i <= mid; i++) mergedArr[tempIndex++] = arr[i];
    }

    for (let i = left; i <= right; i++) {
        arr[i] = mergedArr[i];
    }
};

const mergeSort = (arr: number[], left: number, right: number) => {
    if (left < right) {
        let mid = Math.floor((left + right) / 2);
        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);
        finalMerge(arr, left, mid, right);
    }
};

let arr = [7, 2, 1, 6, 8, 5, 3, 4];
console.log(JSON.stringify(arr));
mergeSort(arr, 0, 7);
console.log(JSON.stringify(arr));
