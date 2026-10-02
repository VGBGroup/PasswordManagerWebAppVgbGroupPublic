using Backend.Api.Data;
using Backend.Api.DTOs.RecoveryCodes;
using Backend.Api.DTOs.Users;
using Backend.Api.Services.Emails;
using Microsoft.AspNetCore.DataProtection;

using Microsoft.IdentityModel.Tokens;
using Backend.Api.Models.Users;
using Backend.Api.Models;
using Backend.Api.Models.Profiles;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Backend.Api.Models.RecoveryCodes;
using System.Security.Cryptography;
using System.Text;
using OtpNet;
using Backend.Api.Models.Subscriptions;

namespace Backend.Api.Services.Auth;

public interface IAuthService
{
    Task<AuthResponseOutDto> RegisterAsync(RegisterUserInDto dto);
    Task<ChallengeResponseOutDto> ChallengeUserAsync(ChallengeRequestInDto dto);
    Task<VerifyResponseOutDto> VerifyAsync(VerifyRequestInDto dto);
    Task<VerifyEmailOutDto> VerifyEmailAsync(string token);
    Task ResendVerificationAsync(string email);

    // 2FA
    Task<TwoFactorSetupOutDto> SetupTwoFactorAsync(Guid userRecordId);
    Task<TwoFactorEnableOutDto> EnableTwoFactorAsync(Guid userRecordId, TwoFactorEnableInDto dto);
    Task<VerifyResponseOutDto> VerifyTwoFactorAsync(TwoFactorVerifyInDto dto);
    Task<bool> DisableTwoFactorAsync(Guid userRecordId, string code);
    Task<bool> VerifyTwoFactorForUserAsync(Guid userRecordId, string code);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDataProtector _protector;
    private readonly IEmailService _emailService;

    public AuthService(AppDbContext context, IConfiguration config, IDataProtectionProvider dp, IEmailService emailService)
    {
        _db = context;
        _config = config;
        _protector = dp.CreateProtector("TotpSecrets.v1");
        _emailService = emailService;
    }

    private string CreateVerificationToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    public async Task<AuthResponseOutDto> RegisterAsync(RegisterUserInDto dto)
    {
        try
        {
            // turn the email into lower letts
            string emailLower = dto.email.ToLowerInvariant();

            if (await _db.Users.AnyAsync(UserTable => UserTable.email == emailLower))
                throw new InvalidOperationException("Registration failed.");

            var verificationToken = CreateVerificationToken();

            var user = new User
            {
                email = emailLower,
                KdfAlgorithm = dto.KdfAlgorithm,
                KdfSalt = dto.KdfSalt,
                KdfMemoryKib = dto.KdfMemoryKib,
                KdfIterations = dto.KdfIterations,
                KdfParallelism = dto.KdfParallelism,
                AuthVerifier = dto.AuthVerifier,
                WrappedDataKey = dto.WrappedDataKey,
                WrappedDataKeyIv = dto.WrappedDataKeyIv,
                FailedLoginAttempts = 0,
                EmailVerified = false,
                EmailVerificationToken = verificationToken,
                EmailVerificationExpiresAt = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ReferralCode = Guid.NewGuid().ToString("N").Substring(0, 8),
                ReferredBy = Guid.Empty
            };

            _db.Users.Add(user);

            _db.UserSettings.Add(new UserSettings
            {
                UserRecordId = user.RecordId,
                dark_mode = false,
                hide_credentials_default = true,
                clipboard_clean = true,
                twofa = false,
                security_alerts = false,
                auto_lock_number = AutoLockDuration.FiveMinutes,
                auto_lock = true,
                name = "Your Name"
            });

            _db.Subscriptions.Add(new Subscription
            {
                UserRecordId = user.RecordId,
                StripeCustomerId = null,
                StripeSubscriptionId = null,
                SubscriptionStatus = null,
                CurrentPeriodEnd = null,
                TrialEndsAt = DateTime.UtcNow.AddDays(14)
            });

            var profile = new Profile
            {
                User = user,
                displayName = user.email,
                Color = "#b91c1c"
            };

            _db.Profiles.Add(profile);

            if (!string.IsNullOrEmpty(dto.referralCode))
            {
                var referrer = await _db.Users
                    .FirstOrDefaultAsync(u => u.ReferralCode == dto.referralCode);

                if (referrer != null)
                {
                    user.ReferredBy = referrer.RecordId;
                }
            }

            await _db.SaveChangesAsync();

            await _emailService.SendVerificationEmailAsync(user.email, verificationToken);

            return new AuthResponseOutDto(success: true);
        }
        catch (Exception ex)
        {
            // Log the exception (ex) here if needed
            throw new InvalidOperationException("Error: ", ex);
        }
    }

    public async Task<VerifyEmailOutDto> VerifyEmailAsync(string token)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);

        if (user is null)
            return new VerifyEmailOutDto(false, "Invalid or expired verification link.");

        if (user.EmailVerificationExpiresAt is null || user.EmailVerificationExpiresAt < DateTime.UtcNow)
            return new VerifyEmailOutDto(false, "This verification link has expired. Please request a new one.");

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return new VerifyEmailOutDto(true, "Email verified successfully.");
    }

    public async Task ResendVerificationAsync(string email)
    {
        string emailLower = email.ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.email == emailLower);

        // Don't reveal whether the email exists — same response either way
        if (user is null || user.EmailVerified) return;

        var verificationToken = CreateVerificationToken();

        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationExpiresAt = DateTime.UtcNow.AddHours(24);
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _emailService.SendVerificationEmailAsync(user.email, verificationToken);
    }

    public async Task<ChallengeResponseOutDto> ChallengeUserAsync(ChallengeRequestInDto dto)
    {
        string emailLower = dto.email.ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(User => User.email == emailLower);

        if (user is null) throw new UnauthorizedAccessException("Invalid credentials");

        if (!user.EmailVerified)
            throw new UnauthorizedAccessException("Please verify your email before logging in.");

        DateTime lockoutUtc = user.LockoutUntil.Kind switch
        {
            DateTimeKind.Utc => user.LockoutUntil,
            DateTimeKind.Local => user.LockoutUntil.ToUniversalTime(),
            _ => DateTime.SpecifyKind(user.LockoutUntil, DateTimeKind.Local).ToUniversalTime()
        };

        // Check if locked out
        if (lockoutUtc > DateTime.UtcNow)
        {
            var remainingTime = lockoutUtc.Subtract(DateTime.UtcNow);

            // Format the time dynamically
            string timeMessage;
            if (remainingTime.TotalHours >= 1)
            {
                timeMessage = $"{(int)remainingTime.TotalHours} hour{(remainingTime.TotalHours >= 2 ? "s" : "")}";
                if (remainingTime.Minutes > 0)
                {
                    timeMessage += $" and {remainingTime.Minutes} minute{(remainingTime.Minutes > 1 ? "s" : "")}";
                }
            }
            else
            {
                timeMessage = $"{Math.Max(1, remainingTime.Minutes)} minute{(remainingTime.Minutes > 1 ? "s" : "")}";
            }

            throw new UnauthorizedAccessException($"Account locked. Try again in {timeMessage}.");
        }

        // Generate a cryptographically random 32-byte nonce
        var challengeBytes = RandomNumberGenerator.GetBytes(32);
        var challenge = Convert.ToBase64String(challengeBytes);

        user.AuthChallenge = challenge;
        user.AuthChallengeExpiresAt = DateTime.UtcNow.AddSeconds(60);
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Get Data to send back
        return new ChallengeResponseOutDto(
            Challenge: challenge,
            KdfAlgorithm: user.KdfAlgorithm,
            KdfSalt: user.KdfSalt,
            KdfMemoryKib: user.KdfMemoryKib,
            KdfIterations: user.KdfIterations,
            KdfParallelism: user.KdfParallelism
        );
    }

    public async Task<VerifyResponseOutDto> VerifyAsync(VerifyRequestInDto dto)
    {
        string emailLower = dto.email.ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(User => User.email == emailLower);

        if (user is null) throw new UnauthorizedAccessException("Error validating credentials");

        // Check challenge exists and hasn't expired
        if (user.AuthChallenge is null || user.AuthChallengeExpiresAt is null || user.AuthChallengeExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Error validating credentials");

        // Check the challenge matches what we issued
        if (user.AuthChallenge != dto.Challenge)
            throw new UnauthorizedAccessException("Error validating credentials");

        // Verify the HMAC signature
        // Client signed the challenge with authKey — we verify using the stored AuthVerifier
        var verifierBytes = Convert.FromBase64String(user.AuthVerifier!);
        var signatureBytes = Convert.FromBase64String(dto.Signature);
        var challengeBytes = Convert.FromBase64String(dto.Challenge);

        var expectedSignature = HMACSHA256.HashData(verifierBytes, challengeBytes);

        // Constant-time comparison — prevents timing attacks
        if (!CryptographicOperations.FixedTimeEquals(expectedSignature, signatureBytes))
        {
            user.FailedLoginAttempts++;
            user.UpdatedAt = DateTime.UtcNow;

            // Auto Increment depending on failed attempts
            if (user.FailedLoginAttempts >= 3)
            {
                double minutes = 15 * Math.Pow(2, user.FailedLoginAttempts - 3);
                double capped = Math.Min(minutes, 60 * 24); // cap at 24 hours
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(capped);
            }

            await _db.SaveChangesAsync();
            throw new UnauthorizedAccessException("Error validating credentials.");
        }

        // Signature valid — clear the challenge so it can't be reused
        user.AuthChallenge = null;
        user.AuthChallengeExpiresAt = null;
        user.FailedLoginAttempts = 0;
        user.UpdatedAt = DateTime.UtcNow;

        if (user.TotpEnabledAt is not null)
        {
            await _db.SaveChangesAsync();
            return VerifyResponseOutDto.TwoFactorRequired(GeneratePreAuthToken(user));
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return VerifyResponseOutDto.Success(
            GenerateToken(user), user.WrappedDataKey!, user.WrappedDataKeyIv!);
    }

    public async Task<VerifyResponseOutDto> VerifyTwoFactorAsync(TwoFactorVerifyInDto dto)
    {
        var userId = ValidatePreAuthToken(dto.PreAuthToken);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.RecordId == userId)
            ?? throw new UnauthorizedAccessException("Invalid session.");

        var valid = false;

        if (user.TotpSecretProtected is not null)
        {
            var secret = _protector.Unprotect(user.TotpSecretProtected);
            var totp = new Totp(Base32Encoding.ToBytes(secret));
            valid = totp.VerifyTotp(dto.Code, out _, new VerificationWindow(previous: 1, future: 1));
        }

        if (!valid)
        {
            var codeHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(dto.Code)));
            var recoveryCode = await _db.RecoveryCodes.FirstOrDefaultAsync(
                rc => rc.UserRecordId == user.RecordId && rc.CodeHash == codeHash && !rc.Used);

            if (recoveryCode is not null) { recoveryCode.Used = true; valid = true; }
        }

        if (!valid) throw new UnauthorizedAccessException("Invalid code.");

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return VerifyResponseOutDto.Success(
            GenerateToken(user), user.WrappedDataKey!, user.WrappedDataKeyIv!);
    }

    private Guid ValidatePreAuthToken(string token)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!)),
            ValidateLifetime = true
        };

        ClaimsPrincipal principal;
        try { principal = new JwtSecurityTokenHandler().ValidateToken(token, parameters, out _); }
        catch { throw new UnauthorizedAccessException("Session expired, please log in again."); }

        if (principal.FindFirst("purpose")?.Value != "2fa_pending")
            throw new UnauthorizedAccessException("Invalid session.");

        return Guid.Parse(principal.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    }

    private string GeneratePreAuthToken(User user)
    {
        var secret = _config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
        new Claim(ClaimTypes.NameIdentifier, user.RecordId.ToString()),
        new Claim("purpose", "2fa_pending") // narrow scope — can't be used as a real access token
    };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateToken(User user)
    {
        var secret = _config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.RecordId.ToString()),
            new Claim(ClaimTypes.Email, user.email)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(
                double.Parse(_config["Jwt:ExpiryHours"]!)),
            // expires: DateTime.UtcNow.AddSeconds(
            //     double.Parse(_config["Jwt:ExpiryTest"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<TwoFactorSetupOutDto> SetupTwoFactorAsync(Guid userRecordId)
    {
        var user = await _db.Users.FirstAsync(u => u.RecordId == userRecordId);

        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);

        // Stored but not yet "enabled" — TotpEnabledAt stays null until confirmed
        user.TotpSecretProtected = _protector.Protect(base32Secret);
        user.TotpEnabledAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        string emailLower = user.email.ToLowerInvariant();

        var otpauthUrl = $"otpauth://totp/VGBGroup:{Uri.EscapeDataString(emailLower)}" +
                          $"?secret={base32Secret}&issuer=V2Vault&algorithm=SHA1&digits=6&period=30";

        return new TwoFactorSetupOutDto(base32Secret, otpauthUrl);
    }

    public async Task<TwoFactorEnableOutDto> EnableTwoFactorAsync(Guid userRecordId, TwoFactorEnableInDto dto)
    {
        var user = await _db.Users.Include(u => u.Settings).FirstAsync(u => u.RecordId == userRecordId);

        if (user.TotpSecretProtected is null)
            throw new InvalidOperationException("Call setup before enable.");

        var secret = _protector.Unprotect(user.TotpSecretProtected);
        var totp = new Totp(Base32Encoding.ToBytes(secret));

        if (!totp.VerifyTotp(dto.Code, out _, new VerificationWindow(previous: 1, future: 1)))
            throw new UnauthorizedAccessException("Invalid code.");

        user.TotpEnabledAt = DateTime.UtcNow;
        if (user.Settings is not null) user.Settings.twofa = true;

        var plainCodes = Enumerable.Range(0, 10)
            .Select(_ => Convert.ToHexString(RandomNumberGenerator.GetBytes(5)))
            .ToList();

        foreach (var code in plainCodes)
        {
            _db.RecoveryCodes.Add(new RecoveryCode
            {
                RecordId = Guid.NewGuid(),
                UserRecordId = user.RecordId,
                CodeHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code))),
                Used = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return new TwoFactorEnableOutDto(plainCodes); // shown once, then discarded server-side
    }

    public async Task<bool> VerifyTwoFactorForUserAsync(Guid userRecordId, string code)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null)
            throw new KeyNotFoundException("Error fetching account.");

        var valid = false;

        if (user.TotpSecretProtected is not null)
        {
            var secret = _protector.Unprotect(user.TotpSecretProtected);
            var totp = new Totp(Base32Encoding.ToBytes(secret));
            valid = totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1));
        }

        if (!valid)
        {
            var codeHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
            var recoveryCode = await _db.RecoveryCodes.FirstOrDefaultAsync(
                rc => rc.UserRecordId == user.RecordId && rc.CodeHash == codeHash && !rc.Used);

            if (recoveryCode is not null)
            {
                recoveryCode.Used = true;
                await _db.SaveChangesAsync();
                valid = true;
            }
        }

        return valid;
    }

    public async Task<bool> DisableTwoFactorAsync(Guid userRecordId, string code)
    {
        var user = await _db.Users.Include(u => u.Settings).FirstAsync(u => u.RecordId == userRecordId);

        if (string.IsNullOrWhiteSpace(user.TotpSecretProtected))
        {
            return false;
        }

        bool isValidCode = await VerifyTwoFactorForUserAsync(userRecordId, code);

        // Optional: check if code matches an unused recovery code if TOTP check fails
        if (!isValidCode)
        {
            return false;
        }

        user.TotpSecretProtected = null;
        user.TotpEnabledAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        if (user.Settings is not null) user.Settings.twofa = false;

        var unusedCodes = _db.RecoveryCodes.Where(rc => rc.UserRecordId == userRecordId && !rc.Used);
        _db.RecoveryCodes.RemoveRange(unusedCodes);

        await _db.SaveChangesAsync();

        return true;
    }

}