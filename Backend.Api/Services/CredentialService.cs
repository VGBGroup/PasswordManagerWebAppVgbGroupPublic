using Backend.Api.Data;
using Backend.Api.DTOs.Credentials;
using Backend.Api.Models.Credentials;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Credentials;

public interface ICredentialService
{
    Task<List<CredentialsOutDto>> GetUserCredentials(Guid userRecordId);
    Task<CredentialCreateOutDto> CreateCredentialAsync(Guid userRecordId, CredentialCreateInDto dto);
    Task UpdateFavourite(Guid userRecordId, FavouriteInDto dto);
    Task DeleteCredential(Guid userRecordId, long credentialRecordId);
    Task UpdateCredential(Guid userRecordId, long credentialRecordId, UpdateCredentialInDto dto);
    Task<CredentialImportResultOutDto> ImportCredentialsAsync(Guid userRecordId, CredentialImportRequestInDto dto);
}

public class CredentialService : ICredentialService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public CredentialService(AppDbContext context, IConfiguration config)
    {
        _db = context;
        _config = config;
    }

    public async Task<List<CredentialsOutDto>> GetUserCredentials(Guid userRecordId)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        // Get user credentials as a list
        return await _db.Credentials
            .Where(c => c.UserRecordId == userRecordId)
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new CredentialsOutDto(
                c.RecordId,
                c.Ciphertext,
                c.Iv,
                c.CategoryRecordId,
                c.hideUsername,
                c.favourite,
                c.UpdatedAt,
                c.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CredentialCreateOutDto> CreateCredentialAsync(Guid userRecordId, CredentialCreateInDto dto)
    {
        var user = await _db.Users
            .FirstAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        // Get user subscription
        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);

        // Check free tier limits
        bool isOnTrial = subscription?.TrialEndsAt > DateTime.UtcNow;
        bool isActiveSubscriber = subscription?.SubscriptionStatus == "active" || isOnTrial;

        if (!isActiveSubscriber)
        {
            var currentCount = await _db.Credentials.CountAsync(c => c.UserRecordId == userRecordId);
            if (currentCount >= 5)
            {
                throw new SubscriptionLimitExceededException(
                    message: "Free tier limit reached. Upgrade to Pro to create more credentials.",
                    currentLimit: 5,
                    upgradeUrl: "/settings"
                );
            }
        }

        // Find category
        var category = await _db.Categories
            .FirstOrDefaultAsync(c => c.UserRecordId == user.RecordId && c.RecordId == dto.categoryRecordId);

        if (category is null) throw new Exception("No category selected for credential");

        // Create new credential
        var credential = new Credential
        {
            UserRecordId = userRecordId,
            Ciphertext = dto.ciphertext,
            Iv = dto.iv,
            CategoryRecordId = dto.categoryRecordId,
            hideUsername = dto.hideUsername,
            favourite = dto.favourite,
            UpdatedAt = DateTime.UtcNow,
            Color = dto.color
        };

        _db.Credentials.Add(credential);
        await _db.SaveChangesAsync();

        return new CredentialCreateOutDto(
            recordId: credential.RecordId,
            categoryRecordId: credential.CategoryRecordId,
            favourite: credential.favourite,
            hideUsername: credential.hideUsername,
            updatedAt: credential.UpdatedAt,
            color: credential.Color
        );
    }

    public async Task UpdateFavourite(Guid userRecordId, FavouriteInDto dto)
    {
        var user = await _db.Users
            .FirstAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        // Find credential
        var credential = await _db.Credentials
            .FirstAsync(c => c.RecordId == dto.recordId && c.UserRecordId == user.RecordId);

        if (credential is null) throw new Exception("Error getting credential");

        // Create new credential
        credential.favourite = dto.favourite;
        credential.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task DeleteCredential(Guid userRecordId, long credentialRecordId)
    {
        // Check if user actually owns the credential
        var user = await _db.Users
           .FirstAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        // Find credential
        var credential = await _db.Credentials
            .FirstAsync(c => c.RecordId == credentialRecordId && c.UserRecordId == user.RecordId);

        if (credential is null) throw new Exception("Credential not found or unauthorized.");

        _db.Credentials.Remove(credential);

        await _db.SaveChangesAsync();
    }

    public async Task UpdateCredential(Guid userRecordId, long credentialRecordId, UpdateCredentialInDto dto)
    {
        // Check if user actually owns the credential
        var user = await _db.Users
           .FirstAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        // Find credential
        var credential = await _db.Credentials
            .FirstOrDefaultAsync(c => c.RecordId == credentialRecordId && c.UserRecordId == user.RecordId);

        if (credential is null) throw new Exception("Credential not found or unauthorized.");

        credential.Ciphertext = dto.ciphertext;
        credential.Iv = dto.iv;
        credential.favourite = dto.favourite;
        credential.CategoryRecordId = dto.categoryRecordId;
        credential.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    #region Imports
    public async Task<CredentialImportResultOutDto> ImportCredentialsAsync(Guid userRecordId, CredentialImportRequestInDto dto)
    {
        var category = await _db.Categories
            .FirstOrDefaultAsync(c => c.UserRecordId == userRecordId && c.RecordId == dto.categoryRecordId);

        if (category is null) throw new Exception("Selected category not found.");

        if (dto.credentials.Count == 0) return new CredentialImportResultOutDto(0);
        if (dto.credentials.Count > 1000) throw new Exception("Too many credentials in a single import.");

        // Get user subscription
        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);

        // Check free tier limits
        bool isActiveSubscriber = subscription?.SubscriptionStatus == "active";

        if (!isActiveSubscriber)
        {
            var currentCount = await _db.Credentials.CountAsync(c => c.UserRecordId == userRecordId);
            if ((currentCount + dto.credentials.Count) >= 5)
            {
                throw new SubscriptionLimitExceededException(
                    message: "Free tier limit reached. Upgrade to Pro to create more credentials.",
                    currentLimit: 5,
                    upgradeUrl: "/settings"
                );
            }
        }

        var now = DateTime.UtcNow;
        var newCredentials = dto.credentials.Select(item => new Credential
        {
            UserRecordId = userRecordId,
            Ciphertext = item.ciphertext,
            Iv = item.iv,
            CategoryRecordId = dto.categoryRecordId,
            hideUsername = item.hideUsername,
            favourite = item.favourite,
            Color = item.color,
            UpdatedAt = now,
        }).ToList();

        _db.Credentials.AddRange(newCredentials);
        await _db.SaveChangesAsync();

        return new CredentialImportResultOutDto(newCredentials.Count);
    }
    #endregion
}