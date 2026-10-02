using Backend.Api.Data;
using Backend.Api.DTOs.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

namespace Backend.Api.Services.Subscriptions;

public interface ISubscriptionService
{
    Task<CheckoutSessionOutDto> CreateCheckoutSessionAsync(Guid userRecordId);
    Task<SubscriptionStatusOutDto> GetStatusAsync(Guid userRecordId);
    Task HandleWebhookAsync(string json, string stripeSignature);
    Task<string> CreateCustomerPortalSessionAsync(Guid userRecordId);
    Task SyncActiveSubscriptionsWithStripeAsync(CancellationToken cancellationToken = default);
}

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public SubscriptionService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<CheckoutSessionOutDto> CreateCheckoutSessionAsync(Guid userRecordId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.RecordId == userRecordId)
            ?? throw new Exception("Error fetching account.");

        // find subscription from user record id
        var userSubscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);

        if (userSubscription is null)
        {
            throw new Exception("Subscription record not found for user.");
        }

        // Reuse an existing Stripe customer if we already made one, so
        // repeat subscribers (e.g. after a cancellation) don't accumulate
        // duplicate customer records.
        string customerId = userSubscription.StripeCustomerId ?? (await new CustomerService().CreateAsync(new CustomerCreateOptions
        {
            Email = user.email,
        })).Id;

        if (userSubscription.StripeCustomerId is null)
        {
            userSubscription.StripeCustomerId = customerId;
            await _db.SaveChangesAsync();
        }

        var session = await new SessionService().CreateAsync(new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = customerId,
            ClientReferenceId = user.RecordId.ToString(),
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = _config["App:Stripe:PriceId"], Quantity = 1 }
            },
            SuccessUrl = $"{_config["App:FrontendUrl"]}/thank-you",
            CancelUrl = $"{_config["App:FrontendUrl"]}/dashboard",
        });

        return new CheckoutSessionOutDto(session.Url);
    }

    public async Task<SubscriptionStatusOutDto> GetStatusAsync(Guid userRecordId)
    {
        var userSubscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId)
            ?? throw new Exception("Subscription record not found for user.");

        // ── 1. If user has credits and is NOT active, apply them to reactivate ──
        if (userSubscription.FreeMonthsCredits > 0 &&
            userSubscription.SubscriptionStatus != "active" &&
            userSubscription.SubscriptionStatus != "trialing")
        {
            await ApplyFreeMonthsCreditsAsync(userRecordId);
            // Re‑fetch to get updated values
            userSubscription = await _db.Subscriptions
                .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);
        }

        // ── 2. If active/trialing but expired, try to apply credits ──
        if ((userSubscription?.SubscriptionStatus == "active" || userSubscription?.SubscriptionStatus == "trialing") &&
            (userSubscription.CurrentPeriodEnd < DateTime.UtcNow || userSubscription.TrialEndsAt < DateTime.UtcNow))
        {
            await ApplyFreeMonthsCreditsAsync(userRecordId);
            // Re‑fetch to check if credits extended the period
            userSubscription = await _db.Subscriptions
                .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);
        }

        // ── 3. If still expired, mark as canceled ──
        if ((userSubscription?.SubscriptionStatus == "active" || userSubscription?.SubscriptionStatus == "trialing") &&
            (userSubscription.CurrentPeriodEnd < DateTime.UtcNow || userSubscription.TrialEndsAt < DateTime.UtcNow))
        {
            userSubscription.SubscriptionStatus = "canceled";
            await _db.SaveChangesAsync();
        }

        // ── 4. Determine final status ──
        bool isOnTrial = userSubscription?.TrialEndsAt > DateTime.UtcNow;
        bool isPaid = userSubscription?.SubscriptionStatus == "active";
        bool isActive = isPaid || isOnTrial;

        string? subscriptionStatus = isOnTrial ? "Trialing" : userSubscription?.SubscriptionStatus;
        DateTime? endDate = isOnTrial ? userSubscription?.TrialEndsAt : userSubscription?.CurrentPeriodEnd;

        Console.WriteLine($"GetStatusAsync: final status {subscriptionStatus}, isActive {isActive}, endDate {endDate}");

        return new SubscriptionStatusOutDto(isActive, subscriptionStatus, endDate);
    }

    public async Task HandleWebhookAsync(string json, string stripeSignature)
    {
        var stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, _config["App:Stripe:WebhookSecret"]);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                {
                    var session = (Stripe.Checkout.Session)stripeEvent.Data.Object;
                    if (Guid.TryParse(session.ClientReferenceId, out var userRecordId))
                    {
                        var user = await _db.Users.FirstOrDefaultAsync(u => u.RecordId == userRecordId);
                        if (user is not null)
                        {
                            // find subscription from user record id
                            var userSubscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);

                            if (userSubscription is null)
                            {
                                throw new Exception("Subscription record not found for user.");
                            }

                            userSubscription.StripeSubscriptionId = session.SubscriptionId;
                            userSubscription.StripeCustomerId ??= session.CustomerId;

                            // Fetch actual subscription details immediately to prevent race conditions
                            if (!string.IsNullOrEmpty(session.SubscriptionId))
                            {
                                var subService = new Stripe.SubscriptionService();
                                var subscription = await subService.GetAsync(session.SubscriptionId);

                                var periodEnd = subscription.Items.Data[0].CurrentPeriodEnd;

                                userSubscription.SubscriptionStatus = subscription.Status;
                                userSubscription.CurrentPeriodEnd = periodEnd;
                                userSubscription.TrialEndsAt = null;

                                // Add referal
                                var referredBy = await _db.Users
                                    .Where(u => u.RecordId == userRecordId)
                                    .Select(u => u.ReferredBy)
                                    .FirstOrDefaultAsync();

                                if (referredBy != Guid.Empty)
                                {
                                    // Find the referrer's subscription
                                    var referrerSubscription = await _db.Subscriptions
                                        .FirstOrDefaultAsync(s => s.UserRecordId == referredBy);

                                    if (referrerSubscription != null)
                                    {
                                        // Give them 1 free month (credit)
                                        referrerSubscription.FreeMonthsCredits = referrerSubscription.FreeMonthsCredits + 1;

                                        // Check if trialing or active
                                        if (referrerSubscription.SubscriptionStatus != "trialing" && referrerSubscription.SubscriptionStatus != "active")
                                        {
                                            // If not, set them to active and extend the current period by 1 month
                                            referrerSubscription.SubscriptionStatus = "trialing";
                                        }
                                        await _db.SaveChangesAsync();
                                    }
                                }
                            }

                            await _db.SaveChangesAsync();
                        }
                    }
                    break;
                }

            case "customer.subscription.updated":
            case "customer.subscription.created":
                {
                    var sub = (Stripe.Subscription)stripeEvent.Data.Object;

                    // Find user from subscription's customer ID
                    var userSubscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == sub.CustomerId);

                    if (userSubscription is null)
                    {
                        throw new Exception("Subscription record not found for customer.");
                    }

                    var periodEnd = sub.Items.Data[0].CurrentPeriodEnd;

                    userSubscription.SubscriptionStatus = sub.Status;
                    userSubscription.CurrentPeriodEnd = periodEnd;
                    await _db.SaveChangesAsync();
                    break;
                }

            case "customer.subscription.deleted":
                {
                    var sub = (Stripe.Subscription)stripeEvent.Data.Object;
                    // Find user from subscription's customer ID
                    var userSubscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == sub.CustomerId);
                    if (userSubscription is not null)
                    {
                        userSubscription.SubscriptionStatus = "canceled";
                        await _db.SaveChangesAsync();
                    }
                    break;
                }
        }
    }

    public async Task<string> CreateCustomerPortalSessionAsync(Guid userRecordId)
    {
        var user = await _db.Users
            .Include(u => u.Subscription)
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user?.Subscription?.StripeCustomerId is null)
        {
            throw new Exception("No active subscription or customer record found.");
        }

        var frontendUrl = _config["App:FrontendUrl"];
        if (string.IsNullOrEmpty(frontendUrl) || !Uri.IsWellFormedUriString(frontendUrl, UriKind.Absolute))
        {
            throw new Exception("FrontendUrl is missing or invalid in configuration.");
        }

        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = user.Subscription.StripeCustomerId,
            ReturnUrl = $"{frontendUrl}/settings",
        };

        var service = new Stripe.BillingPortal.SessionService();
        var session = await service.CreateAsync(options);

        return session.Url;
    }

    public async Task SyncActiveSubscriptionsWithStripeAsync(CancellationToken cancellationToken = default)
    {
        // Get all subscriptions that are supposed to be active
        var localSubs = await _db.Subscriptions
            .Where(s => s.SubscriptionStatus == "active" || s.SubscriptionStatus == "trialing")
            .ToListAsync(cancellationToken);

        if (!localSubs.Any())
            return;

        var stripeService = new Stripe.SubscriptionService();
        foreach (var local in localSubs)
        {
            if (string.IsNullOrEmpty(local.StripeSubscriptionId))
                continue; // Should not happen, but skip

            try
            {
                var stripeSub = await stripeService.GetAsync(local.StripeSubscriptionId, cancellationToken: cancellationToken);

                if (stripeSub.Status != "active" && stripeSub.Status != "trialing")
                {
                    // Check if the user has credits to extend
                    await ApplyFreeMonthsCreditsAsync(local.UserRecordId);

                    // Re-fetch and update status
                    var refreshed = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserRecordId == local.UserRecordId);
                    if (refreshed?.CurrentPeriodEnd > DateTime.UtcNow)
                    {
                        // Credits were applied, keep active
                        continue;
                    }
                }

                local.SubscriptionStatus = stripeSub.Status;
                local.CurrentPeriodEnd = stripeSub.Items.Data[0].CurrentPeriodEnd;

                // Update local with Stripe's latest data
                local.SubscriptionStatus = stripeSub.Status;
                local.CurrentPeriodEnd = stripeSub.Items.Data[0].CurrentPeriodEnd;
            }
            catch (StripeException ex)
            {
                Console.WriteLine($"Error syncing subscription {local.StripeSubscriptionId}: {ex.Message}");
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task ApplyFreeMonthsCreditsAsync(Guid userRecordId)
    {
        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);
        if (subscription is null || subscription.FreeMonthsCredits <= 0)
            return;

        int monthsToApply = Math.Min(subscription.FreeMonthsCredits, 12); // cap at 12

        // If the user has an active subscription, extend the current period
        if (subscription.SubscriptionStatus == "active" && subscription.CurrentPeriodEnd.HasValue)
        {
            subscription.CurrentPeriodEnd = subscription.CurrentPeriodEnd.Value.AddMonths(monthsToApply);
            subscription.FreeMonthsCredits -= monthsToApply;
            Console.WriteLine($"Applied {monthsToApply} free months to active user {userRecordId}");
        }
        // If the user is on trial, extend the trial end date
        else if (subscription.TrialEndsAt.HasValue && subscription.TrialEndsAt.Value > DateTime.UtcNow)
        {
            subscription.TrialEndsAt = subscription.TrialEndsAt.Value.AddMonths(monthsToApply);
            subscription.FreeMonthsCredits -= monthsToApply;
            Console.WriteLine($"Applied {monthsToApply} free months to trial for user {userRecordId}");
        }
        // If subscription is expired/canceled, reactivate with a new trial
        else
        {
            subscription.TrialEndsAt = DateTime.UtcNow.AddMonths(monthsToApply);
            subscription.SubscriptionStatus = "trialing";
            subscription.FreeMonthsCredits -= monthsToApply;
            Console.WriteLine($"Reactivated user {userRecordId} with {monthsToApply} free months");
        }

        await _db.SaveChangesAsync();
    }
}