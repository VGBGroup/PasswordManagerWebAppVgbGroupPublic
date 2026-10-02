export interface DecryptedInCredential {
    recordId: number;
    name: string;
    username: string;
    password: string;
    cardNumber: string;
    cardExpiry: string;
    website: string;
    type: string;
    notes: string;
    tags: string[];
    categoryRecordId: number;
    favourite: boolean;
    strength: string;
    color: string,
    hideUsername: boolean,

    updatedAt: string;
    createdAt: string;

    phoneNumber: string;
    address: string;
}

export interface DecryptedOutCredential {
    name: string;
    username: string;
    password: string;
    cardNumber: string;
    cardExpiry: string;
    type: string;
    website: string;
    notes: string;
    tags: string[];
    categoryRecordId: number;
    favourite: boolean;
    updatedAt: string;
    strength: string;
    color: string,
    hideUsername: boolean,

    phoneNumber: string;
    address: string;
}