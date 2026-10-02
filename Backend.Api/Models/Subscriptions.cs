using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Api.Models.RecoveryCodes;
using Backend.Api.Models.Users;

namespace Backend.Api.Models.Subscriptions;

public class Subscription
{
    [Key]
    [ForeignKey("User")]
    public Guid UserRecordId { get; set; }
    public virtual User User { get; set; } = null!;

    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? SubscriptionStatus { get; set; } // "active", "past_due", "canceled", or null
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? TrialEndsAt { get; set; }
    public bool TrialReminderSent { get; set; } = false;
    public int BreachScansUsed { get; set; } = 0;
    public int FreeMonthsCredits {get; set;} = 0;
}