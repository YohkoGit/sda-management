using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SdaManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleFlagsIsCriticalIsPredicateur : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_critical",
                table: "template_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_predicateur",
                table: "template_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_critical",
                table: "activity_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_predicateur",
                table: "activity_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Data migration: set flags on existing records based on role name patterns
            migrationBuilder.Sql("""
                UPDATE activity_roles SET is_critical = true
                WHERE lower(role_name) = 'ancien'
                   OR lower(role_name) LIKE 'ancien %'
                   OR lower(role_name) LIKE '%predicateur%'
                   OR lower(role_name) LIKE '%prédicateur%';

                UPDATE activity_roles SET is_predicateur = true
                WHERE lower(role_name) LIKE '%predicateur%'
                   OR lower(role_name) LIKE '%prédicateur%';

                UPDATE template_roles SET is_critical = true
                WHERE lower(role_name) = 'ancien'
                   OR lower(role_name) LIKE 'ancien %'
                   OR lower(role_name) LIKE '%predicateur%'
                   OR lower(role_name) LIKE '%prédicateur%';

                UPDATE template_roles SET is_predicateur = true
                WHERE lower(role_name) LIKE '%predicateur%'
                   OR lower(role_name) LIKE '%prédicateur%';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_critical",
                table: "template_roles");

            migrationBuilder.DropColumn(
                name: "is_predicateur",
                table: "template_roles");

            migrationBuilder.DropColumn(
                name: "is_critical",
                table: "activity_roles");

            migrationBuilder.DropColumn(
                name: "is_predicateur",
                table: "activity_roles");
        }
    }
}
