import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictUserRolesAndPreserveLegacyAccounts1761562000000 implements MigrationInterface {
  name = 'RestrictUserRolesAndPreserveLegacyAccounts1761562000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "users" IN ACCESS EXCLUSIVE MODE');
    await queryRunner.query(`
      CREATE TABLE "user_role_migration_backup_1761562000000" (
        "user_id" uuid PRIMARY KEY,
        "was_active" boolean NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "user_role_migration_backup_1761562000000" ("user_id", "was_active")
      SELECT "id", "is_active"
      FROM "users"
      WHERE "role"::text = 'MANAGER'
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'TECHNICIAN', "is_active" = false
      WHERE "role"::text = 'MANAGER'
    `);
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TYPE "user_role_enum" RENAME TO "user_role_enum_legacy_1761562000000"',
    );
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'TECHNICIAN')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "user_role_enum"
      USING "role"::text::"user_role_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TECHNICIAN'`,
    );
    await queryRunner.query('DROP TYPE "user_role_enum_legacy_1761562000000"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE "users" IN ACCESS EXCLUSIVE MODE');
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TYPE "user_role_enum" RENAME TO "user_role_enum_technician_only_1761562000000"',
    );
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'TECHNICIAN', 'MANAGER')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "user_role_enum"
      USING "role"::text::"user_role_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TECHNICIAN'`,
    );
    await queryRunner.query(`
      UPDATE "users" AS users
      SET "role" = 'MANAGER', "is_active" = backup."was_active"
      FROM "user_role_migration_backup_1761562000000" AS backup
      WHERE users."id" = backup."user_id"
    `);
    await queryRunner.query(
      'DROP TYPE "user_role_enum_technician_only_1761562000000"',
    );
    await queryRunner.query(
      'DROP TABLE "user_role_migration_backup_1761562000000"',
    );
  }
}
