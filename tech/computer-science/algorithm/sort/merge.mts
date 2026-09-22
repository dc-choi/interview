const mergeSort = (arr: number[]) => {
    const mergedArr = new Array<number>(arr.length);

    const finalMerge = (left: number, mid: number, right: number) => {
        let leftIndex = left;
        let rightIndex = mid + 1;

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

    const sort = (left: number, right: number) => {
        if (left >= right) return;

        const mid = Math.floor((left + right) / 2);
        sort(left, mid);
        sort(mid + 1, right);
        finalMerge(left, mid, right);
    };

    sort(0, arr.length - 1);
};

let arr = [7, 2, 1, 6, 8, 5, 3, 4];
console.log(JSON.stringify(arr));
mergeSort(arr);
console.log(JSON.stringify(arr));
