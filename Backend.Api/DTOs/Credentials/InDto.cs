namespace Backend.Api.DTOs.Credentials;

// Frontend sends this when registering
public record CredentialCreateInDto(
    string ciphertext,
    string iv,
    long categoryRecordId,
    bool favourite,
    string color,
    bool hideUsername
);

public record FavouriteInDto(
    long recordId,
    bool favourite
);

public record UpdateCredentialInDto(
    string ciphertext,
    string iv,
    bool favourite,
    long categoryRecordId
);

public record CredentialImportItemInDto(
    string ciphertext,
    string iv,
    bool favourite,
    string color,
    bool hideUsername
);

public record CredentialImportRequestInDto(
    long categoryRecordId,
    List<CredentialImportItemInDto> credentials
);