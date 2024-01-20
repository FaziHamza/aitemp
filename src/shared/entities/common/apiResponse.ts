export class ApiResponse<T> {
    isSuccess: boolean;
    message: string;
    data?: T;
    count?:number;
    
    constructor(success: boolean, msg: string, data?: T,count?:number) {
        this.isSuccess = success;
        this.message = msg;
        this.data = data;
        this.count = count
    }
}
