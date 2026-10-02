export interface CategoriesInDto {
    recordId: number;
    userRecordId: string;
    name: string;
}

export interface CateogiesOutDto {
    recordId?: number;
    name: string;
}