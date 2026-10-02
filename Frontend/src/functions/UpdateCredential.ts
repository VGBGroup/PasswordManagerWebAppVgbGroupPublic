import client from "@/api/client";
import type { DecryptedInCredential } from "@/interfaces/decryptedCredential";
import { decryptCredential } from "./DecryptCredentials";
import { calculateStrength } from "./CalculateStrength";

export const getCredentials = async (dataKey: CryptoKey, setCredentials: React.Dispatch<React.SetStateAction<DecryptedInCredential[]>>) => {
        try {
            if (!dataKey) {
                console.error('No encryption key in memory — is the user logged in?');
                return;
            }

            const response = await client.get('credentials');

            if (!response?.data) return;

            // Decrypt all credentials in parallel
            const decrypted = await Promise.all(
                response.data.map((item: any) =>
                    decryptCredential(item.ciphertext, item.iv, dataKey!)
                        .then(result => result ? {
                            ...result,
                            type: result.type,
                            tags: result.tags,
                            recordId: item.recordId,
                            categoryRecordId: item.categoryRecordId,
                            favourite: item.favourite,
                            updatedAt: item.updatedAt,
                            createdAt: item.createdAt,
                            strength: result.type != 'card' ? calculateStrength(result.password) : 'very-strong',
                            color: result.color
                        } : null)
                )
            );

            // Filter out any that failed to decrypt
            const valid = decrypted.filter(Boolean) as DecryptedInCredential[];

            setCredentials(valid); // store in state — all search/filter happens from here

        } catch (er) {
            console.error("Failed to fetch settings:", er);
        }
    };

export const handleToggleFavourite = async (
    recordId: number,
    currentStatus: boolean,
    setCredentials: React.Dispatch<React.SetStateAction<DecryptedInCredential[]>>,
) => {
    const nextStatus = !currentStatus;

    // Optimistic Update: Instantly update UI for snappy user experience
    setCredentials(prev =>
        prev.map(item =>
            item.recordId === recordId ? { ...item, favourite: nextStatus } : item
        )
    );

    try {
        // Match this endpoint syntax with your backend implementation
        await client.patch('credentials/favourite', {
            recordId,
            favourite: nextStatus,
        });
    } catch (error) {
        console.error("Failed to update favorite status in DB:", error);
        
        // Revert state back if backend database call fails
        setCredentials(prev =>
            prev.map(item =>
                item.recordId === recordId ? { ...item, favourite: currentStatus } : item
            )
        );
    }
};