using Backend.Api.Data;
using Backend.Api.DTOs.Users;
using Backend.Api.DTOs.UserSettings;
using Backend.Api.Services.Emails;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Users;

public interface IUserService
{
    Task<UserSettingOutDto> GetSettingsAsync(Guid userRecordId);
    Task UpdateSettingsAsync(Guid userRecordId, UserSettingInDto dto);
    Task UpdateProfileAsync(Guid userRecordId, UpdateProfileInDto dto);
    Task<ProfileOutDto> GetProfileAsync(Guid userRecordId);
    Task<GeneralUserDataOutDto> GetGeneralUserDataAsync(Guid userRecordId);
    Task DeleteAccountAsync(Guid userRecordId);
}

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IDataProtector _protector;
    private readonly IEmailService _emailService;

    public UserService(AppDbContext context, IConfiguration config, IDataProtectionProvider dp, IEmailService emailService)
    {
        _db = context;
        _config = config;
        _protector = dp.CreateProtector("TotpSecrets.v1");
        _emailService = emailService;
    }

    public async Task<UserSettingOutDto> GetSettingsAsync(Guid userRecordId)
    {
        var user = await _db.Users
            .Include(u => u.Settings)
            .FirstAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        if (user.Settings is null) throw new Exception("Error fetching account.");

        return new UserSettingOutDto(
            dark_mode: user.Settings.dark_mode,
            auto_lock_number: user.Settings.auto_lock_number,
            auto_lock: user.Settings.auto_lock,
            hide_credentials_default: user.Settings.hide_credentials_default,
            clipboard_clean: user.Settings.clipboard_clean,
            twofa: user.TotpEnabledAt is not null,
            security_alerts: user.Settings.security_alerts
        );
    }

    public async Task UpdateSettingsAsync(Guid userRecordId, UserSettingInDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Settings)
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null || user.Settings is null)
            throw new Exception("Error fetching account.");

        // Update user Settings
        user.Settings.dark_mode = dto.dark_mode ?? user.Settings.dark_mode;
        user.Settings.auto_lock = dto.auto_lock ?? user.Settings.auto_lock;
        user.Settings.auto_lock_number = dto.auto_lock_number ?? user.Settings.auto_lock_number;
        user.Settings.clipboard_clean = dto.clipboard_clean ?? user.Settings.clipboard_clean;
        user.Settings.hide_credentials_default = dto.hide_credentials_default ?? user.Settings.hide_credentials_default;
        user.Settings.twofa = dto.twofa ?? user.Settings.twofa;
        user.Settings.security_alerts = dto.security_alerts ?? user.Settings.security_alerts;

        await _db.SaveChangesAsync();
    }

    public async Task UpdateProfileAsync(Guid userRecordId, UpdateProfileInDto dto)
    {
        var user = await _db.Users
            .Include(u => u.Settings)
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null || user.Settings is null)
            throw new Exception("Error fetching account.");

        // Find profile
        var profile = await _db.Profiles
            .FirstOrDefaultAsync(p => p.UserRecordId == user.RecordId);

        if (profile is null)
            throw new Exception("Error fetching account.");

        profile.displayName = dto.displayName;
        profile.Color = dto.color;

        await _db.SaveChangesAsync();
    }

    public async Task<ProfileOutDto> GetProfileAsync(Guid userRecordId)
    {
        var user = await _db.Users
            .Include(u => u.Settings)
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null || user.Settings is null)
            throw new Exception("Error fetching account.");

        // Find profile
        var profile = await _db.Profiles
            .FirstOrDefaultAsync(p => p.UserRecordId == user.RecordId);

        if (profile is null)
            throw new Exception("Error fetching account.");


        return new ProfileOutDto(
            displayName: profile.displayName,
            color: profile.Color
        );
    }

    public async Task DeleteAccountAsync(Guid userRecordId)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            // 1. Delete dependent leaf entities first
            await _db.Credentials.Where(c => c.UserRecordId == userRecordId).ExecuteDeleteAsync();
            await _db.Categories.Where(c => c.UserRecordId == userRecordId).ExecuteDeleteAsync();
            await _db.RecoveryCodes.Where(rc => rc.UserRecordId == userRecordId).ExecuteDeleteAsync();
            await _db.Profiles.Where(p => p.UserRecordId == userRecordId).ExecuteDeleteAsync();
            await _db.Subscriptions.Where(s => s.UserRecordId == userRecordId).ExecuteDeleteAsync();
            await _db.UserSettings.Where(s => s.UserRecordId == userRecordId).ExecuteDeleteAsync();

            // 2. Delete the main User entity
            int rowsAffected = await _db.Users.Where(u => u.RecordId == userRecordId).ExecuteDeleteAsync();

            if (rowsAffected == 0)
                throw new KeyNotFoundException("Error fetching account.");

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<GeneralUserDataOutDto> GetGeneralUserDataAsync(Guid userRecordId)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null)
            throw new Exception("Error fetching account.");

        return new GeneralUserDataOutDto(
            referralCode: user.ReferralCode
        );
    }
}