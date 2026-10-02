namespace Backend.Api.DTOs.Categories;

// Frontend sends this when registering
public record CategoryOutDto(
    long recordId,
    string name,
    string iv,
    long sortOrder
);