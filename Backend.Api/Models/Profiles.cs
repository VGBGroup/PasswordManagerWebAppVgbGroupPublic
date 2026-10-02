using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.Api.Models.Users;

namespace Backend.Api.Models.Profiles;

public class Profile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long RecordId { get; set; }

    public Guid UserRecordId { get; set; }

    [ForeignKey(nameof(UserRecordId))]
    public User User { get; set; } = null!;

    public string displayName { get; set; } = string.Empty;
    public string Color {get; set;} = string.Empty;
}