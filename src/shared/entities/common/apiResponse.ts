export class ApiResponse<T> {
    isSuccess: boolean;
    message: string;
    data?: T;
    count?: number;
    isPermission?: boolean;


    constructor(success: boolean, msg: string, data?: T, count?: number, isPermission?: boolean) {
        this.isSuccess = success;
        this.message = msg;
        this.data = data;
        this.count = count
        this.isPermission = isPermission
    }
}
