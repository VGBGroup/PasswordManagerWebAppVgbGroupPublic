using Backend.Api.Models;
using Backend.Api.Models.Categories;
using Backend.Api.Models.Credentials;
using Backend.Api.Models.Profiles;
using Backend.Api.Models.RecoveryCodes;
using Backend.Api.Models.Subscriptions;
using Backend.Api.Models.Users;

using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Credential> Credentials => Set<Credential>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<RecoveryCode> RecoveryCodes => Set<RecoveryCode>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // "DB Table"
        modelBuilder.Entity<User>().ToTable("User");
        modelBuilder.Entity<UserSettings>().ToTable("UserSettings");
        modelBuilder.Entity<Credential>().ToTable("Credentials");
        modelBuilder.Entity<Category>().ToTable("Categories");
        modelBuilder.Entity<RecoveryCode>().ToTable("RecoveryCodes");
        modelBuilder.Entity<Profile>().ToTable("Profiles");
        modelBuilder.Entity<Subscription>().ToTable("Subscriptions");
    }
}