// codecPOS_web/src/types/order.ts

export interface Order {
    id: string; // or number, depending on your ID type
    date: string; // Add this line
    deliveryStatus: string;
    amountPaid: string;
    changeGiven: string;
    paymentStatus: string;
    netAmountPaid: string;
}
