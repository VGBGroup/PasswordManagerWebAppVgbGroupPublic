public record TwoFactorEnableInDto(string Code);

public record TwoFactorVerifyInDto(string PreAuthToken, string Code);

public record AuthenticatedTwoFactorVerifyInDto(string Code);

public record TwoFactorDisableInDto(string Code);