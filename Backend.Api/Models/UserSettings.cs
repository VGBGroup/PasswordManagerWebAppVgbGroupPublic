using Backend.Api.Models.Users;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Api.Models
{
    public enum AutoLockDuration
    {
        FiveMinutes = 5,
        TenMinutes = 10,
        FifteenMinutes = 15,
        ThirtyMinutes = 30,
        OneHour = 60
    }

    public class UserSettings
    {
        [Key]
        [ForeignKey("User")]
        public Guid UserRecordId { get; set; }
        
        public bool dark_mode { get; set; } = false;

        public AutoLockDuration auto_lock_number { get; set; } = AutoLockDuration.FiveMinutes;

        public bool auto_lock { get; set; } = true;

        public bool hide_credentials_default { get; set; } = true;

        public bool clipboard_clean { get; set; } = true;

        public bool twofa { get; set; } = false;

        public bool security_alerts { get; set; } = false;
        public string name { get; set; } = string.Empty;
    }
}