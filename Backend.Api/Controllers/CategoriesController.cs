using Backend.Api.DTOs.Categories;
using Backend.Api.Services.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Api.Controllers.Categories;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly ICategoriesService _categoriesService;

    public CategoryController(ICategoriesService categoriesService)
    {
        _categoriesService = categoriesService;
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : Guid.Parse(claim);
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            List<CategoryOutDto> categories = await _categoriesService.GetCategoriesAsync(userRecordId.Value);
            return Ok(categories);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            CategoryOutDto category = await _categoriesService.CreateCategoryAsync(userRecordId.Value, dto);
            return Ok(category);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (SubscriptionLimitExceededException ex)
        {
            return StatusCode(402, new
            {
                needsUpgrade = true,
                message = ex.Message,
                currentLimit = ex.CurrentLimit,
                upgradeUrl = ex.UpgradeUrl
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{categoryRecordId}")]
    public async Task<IActionResult> EditCategory(long categoryRecordId, [FromBody] CategoryEditInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _categoriesService.UpdateCategoryAsync(userRecordId.Value, categoryRecordId, dto);
            return Ok(true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{categoryRecordId}")]
    public async Task<IActionResult> DeleteCategory(long categoryRecordId)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _categoriesService.DeleteCategoryAsync(userRecordId.Value, categoryRecordId);
            return Ok(true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> ReorderCategories([FromBody] ReorderCategoriesDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        await _categoriesService.ReorderCategoriesAsync(userRecordId.Value, dto.orderedRecordIds);

        return Ok();
    }
}