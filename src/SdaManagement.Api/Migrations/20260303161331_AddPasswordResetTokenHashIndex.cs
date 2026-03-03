using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SdaManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetTokenHashIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_password_reset_tokens_token_hash",
                table: "password_reset_tokens",
                column: "token_hash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_password_reset_tokens_token_hash",
                table: "password_reset_tokens");
        }
    }
}
