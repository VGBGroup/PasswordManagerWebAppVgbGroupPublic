namespace Backend.Api.DTOs.RecoveryCodes;

public record TwoFactorSetupOutDto(string secret, string otpAuthUrl);

public record TwoFactorEnableOutDto(List<string> recoveryCodes);