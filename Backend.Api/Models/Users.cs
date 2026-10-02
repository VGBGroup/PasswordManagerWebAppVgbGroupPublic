using System.ComponentModel.DataAnnotations;
using Backend.Api.Models.RecoveryCodes;
using Backend.Api.Models.Subscriptions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Models.Users;

public class User
{
    [Key]
    public Guid RecordId { get; set; } = Guid.NewGuid();
    public string email { get; set; } = string.Empty;
    public string KdfAlgorithm { get; set; } = string.Empty;
    public string KdfSalt { get; set; } = string.Empty;
    public int KdfMemoryKib { get; set; }
    public int KdfIterations { get; set; }
    public int KdfParallelism { get; set; }
    public string AuthVerifier { get; set; } = string.Empty;
    public string? AuthChallenge { get; set; } = string.Empty;
    public DateTime? AuthChallengeExpiresAt { get; set; }
    public string WrappedDataKey { get; set; } = string.Empty;
    public string WrappedDataKeyIv { get; set; } = string.Empty;
    public DateTime LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime LockoutUntil { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationExpiresAt { get; set; }

    // User.cs additions
    public string? TotpSecretProtected { get; set; }   // encrypted via IDataProtector, NOT the same key as vault crypto
    public DateTime? TotpEnabledAt { get; set; }
    public ICollection<RecoveryCode> RecoveryCodes { get; set; } = new List<RecoveryCode>();

    public virtual UserSettings? Settings { get; set; }
    public virtual Subscription? Subscription { get; set; }

    // Referals
    public string ReferralCode {get; set;} = string.Empty;
    public Guid? ReferredBy {get; set;} = Guid.Empty;

}