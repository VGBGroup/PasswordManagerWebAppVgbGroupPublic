using Backend.Api.Data;
using Microsoft.EntityFrameworkCore;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Backend.Api.Services.Emails;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string token);
    Task SendTrialReminderEmailAsync(string toEmail, string displayName, DateTime trialEndsAt);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string token)
    {
        var frontendUrl = _config["App:FrontendUrl"]!;
        var verifyUrl = $"{frontendUrl}/verify-email?token={Uri.EscapeDataString(token)}";

        var message = new MimeMessage();
        var fromName = _config["Zoho:FromName"] ?? string.Empty;
        var fromAddress = _config["Zoho:Username"] ?? throw new InvalidOperationException("Zoho:Username is not configured.");
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Verify your V2 Vault account";

        message.Body = new TextPart("html")
        {
            Text = $@"
                <div style=""font-family: sans-serif; max-width: 480px; margin: 0 auto;"">
                    <h2>Verify your email</h2>
                    <p>Click the link below to verify your account. This link expires in 24 hours.</p>
                    <p><a href=""{verifyUrl}"" style=""background:#22c55e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;"">Verify Email</a></p>
                    <p style=""color:#888;font-size:12px;"">If you didn't create this account, you can ignore this email.</p>
                </div>"
        };

        var smtpHost = _config["Zoho:SmtpHost"] ?? throw new InvalidOperationException("Zoho:SmtpHost is not configured.");
        var smtpPort = int.Parse(_config["Zoho:SmtpPort"] ?? throw new InvalidOperationException("Zoho:SmtpPort is not configured."));

        using var client = new SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
        var username = _config["Zoho:Username"] ?? throw new InvalidOperationException("Zoho:Username is not configured.");
        var password = _config["Zoho:Password"] ?? throw new InvalidOperationException("Zoho:Password is not configured.");
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    public async Task SendTrialReminderEmailAsync(string toEmail, string displayName, DateTime trialEndsAt)
    {
        var frontendUrl = _config["App:FrontendUrl"]!;
        var upgradeUrl = $"{frontendUrl}/settings";
        var daysLeft = (trialEndsAt - DateTime.UtcNow).Days;

        var message = new MimeMessage();
        var fromName = _config["Zoho:FromName"] ?? "V2 Vault";
        var fromAddress = _config["Zoho:Username"] ?? throw new InvalidOperationException("Zoho:Username is not configured.");
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = daysLeft <= 1 ? "⚠️ Your V2 Vault Pro trial ends TODAY!" : $"⏳ Your V2 Vault Pro trial ends in {daysLeft} days";

        message.Body = new TextPart("html")
        {
            Text = $@"
        <div style=""font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #fafafa; border-radius: 12px; padding: 24px;"">
            <div style=""text-align: center; margin-bottom: 20px;"">
                <div style=""display: inline-block; background: #22C55E; color: #fff; font-weight: 700; font-size: 20px; padding: 8px 16px; border-radius: 8px;"">V2 Vault</div>
            </div>

            <h2 style=""color: #111827; margin-bottom: 8px;"">Your free trial is ending soon</h2>
            
            <p style=""color: #4B5563; line-height: 1.6;"">Hi {(string.IsNullOrEmpty(displayName) ? "there" : displayName)},</p>
            
            <p style=""color: #4B5563; line-height: 1.6;"">
                Your <strong>14-day Pro trial</strong> of V2 Vault ends in <strong style=""color: #DC2626;"">{daysLeft} day{(daysLeft != 1 ? "s" : "")}</strong>.
            </p>

            <div style=""background: #F3F4F6; border-radius: 8px; padding: 16px; margin: 16px 0;"">
                <p style=""margin: 0; color: #374151;"">
                    🔒 <strong>What you'll lose after the trial:</strong>
                </p>
                <ul style=""color: #6B7280; margin: 8px 0 0 0; padding-left: 20px;"">
                    <li>Mobile app access</li>
                    <li>Unlimited credential storage</li>
                    <li>Breach monitoring & security alerts</li>
                </ul>
            </div>

            <p style=""color: #4B5563; line-height: 1.6;"">
                <a href=""{upgradeUrl}"" style=""display: inline-block; background: #22C55E; color: #fff; font-weight: 600; padding: 12px 24px; text-decoration: none; border-radius: 8px;"">Upgrade to Pro Now</a>
            </p>

            <p style=""color: #9CA3AF; font-size: 12px; margin-top: 24px; text-align: center;"">
                You're receiving this because you signed up for V2 Vault. 
                <br>If you don't want to upgrade, simply ignore this email – your vault stays accessible (with limited features).
            </p>
        </div>"
        };

        var smtpHost = _config["Zoho:SmtpHost"] ?? throw new InvalidOperationException("Zoho:SmtpHost is not configured.");
        var smtpPort = int.Parse(_config["Zoho:SmtpPort"] ?? throw new InvalidOperationException("Zoho:SmtpPort is not configured."));

        using var client = new SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
        var username = _config["Zoho:Username"] ?? throw new InvalidOperationException("Zoho:Username is not configured.");
        var password = _config["Zoho:Password"] ?? throw new InvalidOperationException("Zoho:Password is not configured.");
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}