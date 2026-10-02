using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Api.Models.Credentials;

public class Credential
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long RecordId { get; set; }

    [ForeignKey("User")]
    public Guid UserRecordId { get; set; }

    public string Ciphertext { get; set; } = string.Empty; // { username, password, website, notes } encrypted
    public string Iv { get; set; } = string.Empty;

    [ForeignKey("Category")]
    public long CategoryRecordId { get; set; }

    public string Color { get; set; } = string.Empty;

    public bool hideUsername { get; set; }

    public bool favourite { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}