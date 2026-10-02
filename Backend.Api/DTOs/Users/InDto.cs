namespace Backend.Api.DTOs.Users;

public record RegisterUserInDto(
    string email,
    string KdfAlgorithm,
    string KdfSalt,
    int KdfMemoryKib,
    int KdfIterations,
    int KdfParallelism,

    string AuthVerifier,
    string WrappedDataKey,
    string WrappedDataKeyIv,
    string? referralCode
);

public record ChallengeRequestInDto(string email);

public record VerifyRequestInDto(
    string email,
    string Challenge,
    string Signature //HMAC-SHA256(challenge, authKey)
);

public record UpdateProfileInDto(
    string displayName,
    string color
);

public record ResendVerificationInDto(string Email);