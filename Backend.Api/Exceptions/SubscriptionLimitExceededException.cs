public class SubscriptionLimitExceededException : Exception
{
    public int CurrentLimit { get; }
    public string UpgradeUrl { get; }

    public SubscriptionLimitExceededException(string message, int currentLimit, string upgradeUrl)
        : base(message)
    {
        CurrentLimit = currentLimit;
        UpgradeUrl = upgradeUrl;
    }
}