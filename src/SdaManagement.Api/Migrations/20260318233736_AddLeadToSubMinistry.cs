using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SdaManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadToSubMinistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "lead_user_id",
                table: "sub_ministries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_sub_ministries_lead_user_id",
                table: "sub_ministries",
                column: "lead_user_id");

            migrationBuilder.AddForeignKey(
                name: "fk_sub_ministries_users_lead_user_id",
                table: "sub_ministries",
                column: "lead_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_sub_ministries_users_lead_user_id",
                table: "sub_ministries");

            migrationBuilder.DropIndex(
                name: "ix_sub_ministries_lead_user_id",
                table: "sub_ministries");

            migrationBuilder.DropColumn(
                name: "lead_user_id",
                table: "sub_ministries");
        }
    }
}
