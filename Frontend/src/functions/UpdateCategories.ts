import client from "@/api/client";
import { decryptCredential } from "./DecryptCredentials";
import type { CategoriesInDto } from "@/interfaces/category";

export const getCategories = async (dataKey: CryptoKey, setCategories: React.Dispatch<React.SetStateAction<CategoriesInDto[]>>) => {
    try {
        if (!dataKey) {
            console.error('No encryption key in memory — is the user logged in?');
            return;
        }

        const response = await client.get('categories');

        if (!response?.data) return;

        // Decrypt all credentials in parallel
        const decrypted = await Promise.all(
            response.data.map((item: any) =>
                decryptCredential(item.name, item.iv, dataKey!)
                    .then(result => result ? {
                        ...result,
                        recordId: item.recordId
                    } : null)
            )
        );

        // Filter out any that failed to decrypt
        const valid = decrypted.filter(Boolean) as CategoriesInDto[];

        setCategories(valid); // store in state — all search/filter happens from here

    } catch (er) {
        console.error("Failed to fetch settings:", er);
    }
};