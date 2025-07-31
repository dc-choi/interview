/**
 * 토론 주제 정리
 */

// api response 중 어떤 데이터가 더 나은지, 실무에서는 어떻게 쓰시는지

interface Response1 {
    data: {
        itemId: number;
        itemName: string;
        itemPrice: number;
        itemVat: number;
        userId: number;
        userName: string;
        userEmail: string;
        userPhone: string;
        userAddress: string;
    }[];
    page: number;
    size: number;
    totalCount: number;
}

interface Response2 {
    success: boolean;
    data: {
        item: {
            id: number;
            name: string;
            price: number;
            vat: number;
        },
        user: {
            id: number;
            name: string;
            email: string;
            phone: string;
            address: string;
        }
    }[];
    pagination: {
        page: number;
        size: number;
        totalCount: number;
    }
}

// REST API && CodeGen VS GraphQL

// 날짜타입의 응답값은 String으로 내리는게 나은가, Date 객체로 내리는게 나은가
interface I {
    releaseDate: Date; // date
}

interface I2 {
    releaseDate: string; // iso string
}