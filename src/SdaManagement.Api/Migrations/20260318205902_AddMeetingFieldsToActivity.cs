using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SdaManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingFieldsToActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_meeting",
                table: "activities",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "location_address",
                table: "activities",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location_name",
                table: "activities",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "meeting_type",
                table: "activities",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "zoom_link",
                table: "activities",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_meeting",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "location_address",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "location_name",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "meeting_type",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "zoom_link",
                table: "activities");
        }
    }
}
