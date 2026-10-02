namespace Backend.Api.DTOs.Categories;

// Frontend sends this when registering
public record CategoryInDto(
    string name,
    string iv
);

public record CategoryEditInDto(
    long recordId,
    string name,
    string iv
);

public record ReorderCategoriesDto(List<long> orderedRecordIds);