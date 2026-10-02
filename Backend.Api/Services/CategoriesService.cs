using Backend.Api.Data;
using Backend.Api.DTOs.Categories;
using Backend.Api.Models.Categories;
using Backend.Api.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Services.Categories;

public interface ICategoriesService
{
    Task<CategoryOutDto> CreateCategoryAsync(Guid userRecordId, CategoryInDto dto);
    Task UpdateCategoryAsync(Guid userRecordId, long categoryRecordId, CategoryEditInDto dto);
    Task<List<CategoryOutDto>> GetCategoriesAsync(Guid userRecordId);
    Task DeleteCategoryAsync(Guid userRecordId, long categoryRecordId);
    Task ReorderCategoriesAsync(Guid userRecordId, List<long> orderedRecordIds);
}

public class CategoriesService : ICategoriesService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public CategoriesService(AppDbContext context, IConfiguration config)
    {
        _db = context;
        _config = config;
    }

    private async Task<User> CheckUser(Guid userRecordId)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.RecordId == userRecordId);

        if (user is null) throw new Exception("Error fetching account.");

        return user;
    }

    public async Task<CategoryOutDto> CreateCategoryAsync(Guid userRecordId, CategoryInDto dto)
    {
        await CheckUser(userRecordId);

        var maxSortOrder = await _db.Categories
            .Where(c => c.UserRecordId == userRecordId)
            .Select(c => (long?)c.SortOrder)
            .MaxAsync() ?? -1;

        // Get user subscription
        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.UserRecordId == userRecordId);

        bool isOnTrial = subscription?.TrialEndsAt > DateTime.UtcNow;
        bool isActiveSubscriber = subscription?.SubscriptionStatus == "active" || isOnTrial;

        if (!isActiveSubscriber)
        {
            var currentCount = await _db.Categories.CountAsync(c => c.UserRecordId == userRecordId);
            if (currentCount >= 3)
            {
                throw new SubscriptionLimitExceededException(
                    message: "You currently have 3 categories on the Free plan. Upgrade now to create unlimited categories and unlock additional features.",
                    currentLimit: 3,
                    upgradeUrl: "/settings"
                );
            }
        }

        // Create new credential
        var category = new Category
        {
            UserRecordId = userRecordId,
            name = dto.name,
            iv = dto.iv,
            SortOrder = maxSortOrder + 1,
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return new CategoryOutDto(
            recordId: category.RecordId,
            name: category.name,
            iv: category.iv,
            sortOrder: category.SortOrder
        );
    }

    public async Task UpdateCategoryAsync(Guid userRecordId, long categoryRecordId, CategoryEditInDto dto)
    {
        User user = await CheckUser(userRecordId);

        // Find existing category
        var category = await _db.Categories
            .FirstOrDefaultAsync(c => c.RecordId == categoryRecordId && c.UserRecordId == user.RecordId);

        if (category is null) throw new Exception("Error getting category");

        category.name = dto.name;
        category.iv = dto.iv;

        await _db.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(Guid userRecordId, long categoryRecordId)
    {
        User user = await CheckUser(userRecordId);

        // Find existing category
        var category = await _db.Categories
            .FirstOrDefaultAsync(c => c.RecordId == categoryRecordId && c.UserRecordId == user.RecordId);

        if (category is null) throw new Exception("Error getting category");

        // Check if any credentials are connected to the category
        var hasCredential = await _db.Credentials
            .Where(c => c.UserRecordId == userRecordId)
            .FirstOrDefaultAsync(c => c.CategoryRecordId == category.RecordId);

        if (hasCredential is not null) throw new Exception("Cannot delete category with credential(s)");


        _db.Categories.Remove(category);

        await _db.SaveChangesAsync();
    }

    public async Task<List<CategoryOutDto>> GetCategoriesAsync(Guid userRecordId)
    {
        User user = await CheckUser(userRecordId);

        // Get user credentials as a list
        return await _db.Categories
            .Where(c => c.UserRecordId == userRecordId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.RecordId)
            .Select(c => new CategoryOutDto(
                c.RecordId,
                c.name,
                c.iv,
                c.SortOrder
            ))
            .ToListAsync();
    }

    public async Task ReorderCategoriesAsync(Guid userRecordId, List<long> orderedRecordIds)
    {
        await CheckUser(userRecordId);

        var categories = await _db.Categories
            .Where(c => c.UserRecordId == userRecordId && orderedRecordIds.Contains(c.RecordId))
            .ToListAsync();

        if (categories.Count != orderedRecordIds.Count)
            throw new Exception("One or more categories were not found for this user.");

        var categoryLookup = categories.ToDictionary(c => c.RecordId);

        for (int i = 0; i < orderedRecordIds.Count; i++)
        {
            categoryLookup[orderedRecordIds[i]].SortOrder = i;
        }

        await _db.SaveChangesAsync();
    }
}