using Backend.Api.Models;

namespace Backend.Api.DTOs.UserSettings;

public record UserSettingOutDto(
    bool dark_mode,
    AutoLockDuration auto_lock_number,
    bool auto_lock,
    bool hide_credentials_default,
    bool clipboard_clean,
    bool twofa,
    bool security_alerts
);