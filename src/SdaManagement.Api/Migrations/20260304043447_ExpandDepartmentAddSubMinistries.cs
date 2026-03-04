using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SdaManagement.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExpandDepartmentAddSubMinistries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "departments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "abbreviation",
                table: "departments",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "color",
                table: "departments",
                type: "character varying(9)",
                maxLength: 9,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "departments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "departments",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()");

            migrationBuilder.CreateTable(
                name: "sub_ministries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    department_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sub_ministries", x => x.id);
                    table.ForeignKey(
                        name: "fk_sub_ministries_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_departments_abbreviation",
                table: "departments",
                column: "abbreviation",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_departments_color",
                table: "departments",
                column: "color",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_sub_ministries_department_id_name",
                table: "sub_ministries",
                columns: new[] { "department_id", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sub_ministries");

            migrationBuilder.DropIndex(
                name: "ix_departments_abbreviation",
                table: "departments");

            migrationBuilder.DropIndex(
                name: "ix_departments_color",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "abbreviation",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "color",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "description",
                table: "departments");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "departments");

            migrationBuilder.AlterColumn<string>(
                name: "name",
                table: "departments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }
    }
}
