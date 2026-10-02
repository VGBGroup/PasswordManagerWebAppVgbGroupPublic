using Backend.Api.Services.Subscriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Api.Controllers.Subscriptions;

[ApiController]
[Route("api/subscription")]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : Guid.Parse(claim);
    }

    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> CreateCheckout()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        var result = await _subscriptionService.CreateCheckoutSessionAsync(userRecordId.Value);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        var result = await _subscriptionService.GetStatusAsync(userRecordId.Value);
        return Ok(result);
    }

    // No [Authorize] - Stripe calls this directly, authenticated by
    // signature verification inside HandleWebhookAsync instead of a JWT.
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        // Deliberately not using a [FromBody] model here - that would let
        // ASP.NET's JSON binder consume the request stream before we can
        // read the raw bytes Stripe's signature was computed over.
        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync();

        try
        {
            await _subscriptionService.HandleWebhookAsync(json, Request.Headers["Stripe-Signature"]!);
            return Ok();
        }
        catch (Stripe.StripeException)
        {
            return BadRequest(); // bad/missing signature
        }
    }

    [Authorize]
    [HttpPost("portal")]
    public async Task<IActionResult> CreatePortalSession()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        var portalUrl = await _subscriptionService.CreateCustomerPortalSessionAsync(userRecordId.Value);
        return Ok(new { url = portalUrl });
    }
}