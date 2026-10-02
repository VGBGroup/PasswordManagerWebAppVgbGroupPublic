using System.ComponentModel.DataAnnotations;

namespace Backend.Api.Models.RecoveryCodes;

public class RecoveryCode
{
    [Key]
    public Guid RecordId { get; set; }
    public Guid UserRecordId { get; set; }
    public string CodeHash { get; set; } = null!;
    public bool Used { get; set; }
    public DateTime CreatedAt { get; set; }
}