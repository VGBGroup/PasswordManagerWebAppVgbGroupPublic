using Backend.Api.Data;
using Backend.Api.Services.Emails;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Subscriptions;

public class SubscriptionSyncBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionSyncBackgroundService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(6);

    public SubscriptionSyncBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<SubscriptionSyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Create a new scope for each iteration
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                var subscriptionService = scope.ServiceProvider.GetRequiredService<ISubscriptionService>();

                // 1. Send trial reminders
                await SendTrialRemindersAsync(dbContext, emailService, stoppingToken);

                // 2. Sync active subscriptions with Stripe
                _logger.LogInformation("Starting Stripe subscription sync...");
                await subscriptionService.SyncActiveSubscriptionsWithStripeAsync(stoppingToken);
                _logger.LogInformation("Stripe subscription sync completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during background sync.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task SendTrialRemindersAsync(
        AppDbContext dbContext,
        IEmailService emailService,
        CancellationToken stoppingToken)
    {
        // Users whose trial ends in exactly 3 days, and we haven't emailed them yet
        var reminderStart = DateTime.UtcNow.AddDays(3);
        var reminderEnd = reminderStart.AddDays(1);

        var usersToRemind = await dbContext.Subscriptions
            .Where(s => s.TrialEndsAt != null &&
                        s.TrialReminderSent != true &&
                        s.SubscriptionStatus == "trialing" &&
                        s.TrialEndsAt.Value >= reminderStart &&
                        s.TrialEndsAt.Value < reminderEnd)
            .Include(s => s.User)
            .ToListAsync(stoppingToken);

        foreach (var sub in usersToRemind)
        {
            if (sub.TrialEndsAt == null || sub.User == null) continue;

            var displayName = ""; // You can add Profile display name later
            await emailService.SendTrialReminderEmailAsync(sub.User.email, displayName, sub.TrialEndsAt.Value);

            sub.TrialReminderSent = true;
            await dbContext.SaveChangesAsync(stoppingToken);
        }
    }
}