namespace Backend.Api.DTOs.Credentials;

// Frontend sends this when registering
public record CredentialsOutDto(
    long recordId,
    string ciphertext,
    string iv,
    long categoryRecordId,
    bool hideUsername,
    bool favourite,
    DateTime updatedAt,
    DateTime createdAt
);

public record CredentialCreateOutDto (
    long recordId,
    long categoryRecordId,
    bool favourite,
    bool hideUsername,
    DateTime updatedAt,
    string color
);

public record CredentialImportResultOutDto(int imported);