namespace Backend.Api.DTOs.Users;

// Frontend sends this when registering
public record AuthResponseOutDto(bool success);

public record ChallengeResponseOutDto(
    string Challenge,        // random nonce, expires in 60s
    string KdfAlgorithm,
    string KdfSalt,
    int KdfMemoryKib,
    int KdfIterations,
    int KdfParallelism
);

public record VerifyResponseOutDto(
    bool RequiresTwoFactor,
    string? PreAuthToken,
    string? Token,
    string? WrappedDataKey,
    string? WrappedDataKeyIv)
{
    public static VerifyResponseOutDto TwoFactorRequired(string preAuthToken) =>
        new(true, preAuthToken, null, null, null);

    public static VerifyResponseOutDto Success(string token, string wrappedDataKey, string wrappedDataKeyIv) =>
        new(false, null, token, wrappedDataKey, wrappedDataKeyIv);
}

public record ProfileOutDto(
    string displayName,
    string color
);

public record VerifyEmailOutDto(bool Success, string Message);

public record GeneralUserDataOutDto(
    string referralCode
);