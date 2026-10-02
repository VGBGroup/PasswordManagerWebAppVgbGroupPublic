using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/breach")]
[Authorize]
public class BreachController : ControllerBase
{
    private readonly AppDbContext _db;

    public BreachController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : Guid.Parse(claim);
    }

    [HttpPost("scan")]
    public async Task<IActionResult> RecordScan()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userId);
        if (subscription is null) return Unauthorized();

        const int FREE_LIMIT = 5;
        // Check free tier limits
        bool isOnTrial = subscription.TrialEndsAt > DateTime.UtcNow;
        bool isActiveSubscriber = subscription.SubscriptionStatus == "active" || isOnTrial;

        // If free user and already used 5 scans, deny
        if (!isActiveSubscriber && subscription.BreachScansUsed >= FREE_LIMIT)
        {
            return StatusCode(402, new
            {
                needsUpgrade = true,
                message = "Free tier limit reached. Upgrade to Pro for unlimited scans."
            });
        }

        // Increment scan count (only for free users)
        if (!isActiveSubscriber)
        {
            subscription.BreachScansUsed++;
            await _db.SaveChangesAsync();
        }

        var remaining = isActiveSubscriber ? "Unlimited" : (FREE_LIMIT - subscription.BreachScansUsed).ToString();
        return Ok(new { remaining, isActiveSubscriber });
    }
}