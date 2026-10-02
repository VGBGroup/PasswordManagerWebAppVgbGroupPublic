namespace Backend.Api.DTOs.Subscriptions;

public record CheckoutSessionOutDto(string url);

public record SubscriptionStatusOutDto(
    bool isActive,
    string? status,
    DateTime? currentPeriodEnd
);