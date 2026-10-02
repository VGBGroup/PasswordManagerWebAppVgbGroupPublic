using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Api.Models.Categories;

public class Category
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long RecordId { get; set; }

    [ForeignKey("User")]
    public Guid UserRecordId { get; set; }

    public string name {get; set; } = string.Empty;
    public string iv {get; set;} = string.Empty;
    public long SortOrder { get; set; }
}