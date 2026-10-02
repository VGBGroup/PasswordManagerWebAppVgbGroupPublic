using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    RecordId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    iv = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.RecordId);
                });

            migrationBuilder.CreateTable(
                name: "Credentials",
                columns: table => new
                {
                    RecordId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ciphertext = table.Column<string>(type: "text", nullable: false),
                    Iv = table.Column<string>(type: "text", nullable: false),
                    CategoryRecordId = table.Column<long>(type: "bigint", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false),
                    hideUsername = table.Column<bool>(type: "boolean", nullable: false),
                    favourite = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Credentials", x => x.RecordId);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    RecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    KdfAlgorithm = table.Column<string>(type: "text", nullable: false),
                    KdfSalt = table.Column<string>(type: "text", nullable: false),
                    KdfMemoryKib = table.Column<int>(type: "integer", nullable: false),
                    KdfIterations = table.Column<int>(type: "integer", nullable: false),
                    KdfParallelism = table.Column<int>(type: "integer", nullable: false),
                    AuthVerifier = table.Column<string>(type: "text", nullable: false),
                    AuthChallenge = table.Column<string>(type: "text", nullable: true),
                    AuthChallengeExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WrappedDataKey = table.Column<string>(type: "text", nullable: false),
                    WrappedDataKeyIv = table.Column<string>(type: "text", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FailedLoginAttempts = table.Column<int>(type: "integer", nullable: false),
                    LockoutUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    EmailVerificationToken = table.Column<string>(type: "text", nullable: true),
                    EmailVerificationExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotpSecretProtected = table.Column<string>(type: "text", nullable: true),
                    TotpEnabledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.RecordId);
                });

            migrationBuilder.CreateTable(
                name: "Profiles",
                columns: table => new
                {
                    RecordId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    displayName = table.Column<string>(type: "text", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Profiles", x => x.RecordId);
                    table.ForeignKey(
                        name: "FK_Profiles_User_UserRecordId",
                        column: x => x.UserRecordId,
                        principalTable: "User",
                        principalColumn: "RecordId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecoveryCodes",
                columns: table => new
                {
                    RecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    CodeHash = table.Column<string>(type: "text", nullable: false),
                    Used = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryCodes", x => x.RecordId);
                    table.ForeignKey(
                        name: "FK_RecoveryCodes_User_UserRecordId",
                        column: x => x.UserRecordId,
                        principalTable: "User",
                        principalColumn: "RecordId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    StripeCustomerId = table.Column<string>(type: "text", nullable: true),
                    StripeSubscriptionId = table.Column<string>(type: "text", nullable: true),
                    SubscriptionStatus = table.Column<string>(type: "text", nullable: true),
                    CurrentPeriodEnd = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrialEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrialReminderSent = table.Column<bool>(type: "boolean", nullable: false),
                    BreachScansUsed = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.UserRecordId);
                    table.ForeignKey(
                        name: "FK_Subscriptions_User_UserRecordId",
                        column: x => x.UserRecordId,
                        principalTable: "User",
                        principalColumn: "RecordId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    UserRecordId = table.Column<Guid>(type: "uuid", nullable: false),
                    dark_mode = table.Column<bool>(type: "boolean", nullable: false),
                    auto_lock_number = table.Column<int>(type: "integer", nullable: false),
                    auto_lock = table.Column<bool>(type: "boolean", nullable: false),
                    hide_credentials_default = table.Column<bool>(type: "boolean", nullable: false),
                    clipboard_clean = table.Column<bool>(type: "boolean", nullable: false),
                    twofa = table.Column<bool>(type: "boolean", nullable: false),
                    security_alerts = table.Column<bool>(type: "boolean", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.UserRecordId);
                    table.ForeignKey(
                        name: "FK_UserSettings_User_UserRecordId",
                        column: x => x.UserRecordId,
                        principalTable: "User",
                        principalColumn: "RecordId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Profiles_UserRecordId",
                table: "Profiles",
                column: "UserRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryCodes_UserRecordId",
                table: "RecoveryCodes",
                column: "UserRecordId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Credentials");

            migrationBuilder.DropTable(
                name: "Profiles");

            migrationBuilder.DropTable(
                name: "RecoveryCodes");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropTable(
                name: "User");
        }
    }
}
