import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialFleetCoreSchema1761560000000 implements MigrationInterface {
  name = 'InitialFleetCoreSchema1761560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'TECHNICIAN', 'MANAGER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "vehicle_status_enum" AS ENUM ('AVAILABLE', 'IN_MAINTENANCE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "maintenance_type_enum" AS ENUM ('PREVENTIVE', 'CORRECTIVE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "maintenance_status_enum" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(160) NOT NULL,
        "email" varchar(320) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'TECHNICIAN',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_users_email_normalized" CHECK ("email" = lower(btrim("email")))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email_normalized" ON "users" (lower(btrim("email")))`,
    );
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "plate" varchar(32) NOT NULL,
        "brand" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "year" integer NOT NULL,
        "mileage" integer NOT NULL DEFAULT 0,
        "status" "vehicle_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_vehicles_plate_normalized" CHECK ("plate" = upper(btrim("plate"))),
        CONSTRAINT "ck_vehicles_year" CHECK ("year" BETWEEN 1886 AND 2100),
        CONSTRAINT "ck_vehicles_mileage" CHECK ("mileage" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_vehicles_plate_normalized" ON "vehicles" (upper(btrim("plate")))`,
    );
    await queryRunner.query(`
      CREATE TABLE "mechanics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid UNIQUE,
        "name" varchar(160) NOT NULL,
        "email" varchar(320) NOT NULL,
        "specialty" varchar(160) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_mechanics_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workshops" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(160) NOT NULL,
        "address" varchar(500) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "maintenances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicle_id" uuid NOT NULL,
        "mechanic_id" uuid NOT NULL,
        "workshop_id" uuid NOT NULL,
        "type" "maintenance_type_enum" NOT NULL,
        "description" text NOT NULL,
        "mileage" integer NOT NULL,
        "scheduled_at" timestamptz NOT NULL,
        "scheduled_end_at" timestamptz NOT NULL,
        "status" "maintenance_status_enum" NOT NULL DEFAULT 'SCHEDULED',
        "work_performed" text,
        "cost" numeric(12,2),
        "finished_at" timestamptz,
        "final_mileage" integer,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_maintenances_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_maintenances_mechanic" FOREIGN KEY ("mechanic_id") REFERENCES "mechanics"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_maintenances_workshop" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_maintenances_schedule" CHECK ("scheduled_end_at" > "scheduled_at"),
        CONSTRAINT "ck_maintenances_mileage" CHECK ("mileage" >= 0),
        CONSTRAINT "ck_maintenances_cost" CHECK ("cost" IS NULL OR "cost" >= 0),
        CONSTRAINT "ck_maintenances_final_mileage" CHECK ("final_mileage" IS NULL OR "final_mileage" >= "mileage"),
        CONSTRAINT "ck_maintenances_completed_fields" CHECK (
          "status" <> 'COMPLETED' OR (
            nullif(btrim("work_performed"), '') IS NOT NULL AND
            "cost" IS NOT NULL AND "finished_at" IS NOT NULL AND "final_mileage" IS NOT NULL
          )
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_maintenances_vehicle_date" ON "maintenances" ("vehicle_id", "scheduled_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_maintenances_mechanic_status_date" ON "maintenances" ("mechanic_id", "status", "scheduled_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_maintenances_workshop" ON "maintenances" ("workshop_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_maintenances_status_date" ON "maintenances" ("status", "scheduled_at")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_maintenances_active_vehicle"
      ON "maintenances" ("vehicle_id")
      WHERE "status" IN ('SCHEDULED', 'IN_PROGRESS')
    `);
    await queryRunner.query(`
      ALTER TABLE "maintenances"
      ADD CONSTRAINT "ex_maintenances_mechanic_schedule"
      EXCLUDE USING gist (
        "mechanic_id" WITH =,
        tstzrange("scheduled_at", "scheduled_end_at", '[)') WITH &&
      )
      WHERE ("status" IN ('SCHEDULED', 'IN_PROGRESS'))
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "action" varchar(80) NOT NULL,
        "entity" varchar(80) NOT NULL,
        "entity_id" uuid,
        "details" jsonb,
        "ip" inet,
        "user_agent" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_created_at" ON "audit_logs" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_audit_logs_user_action_date" ON "audit_logs" ("user_id", "action", "created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "audit_logs"');
    await queryRunner.query('DROP TABLE "maintenances"');
    await queryRunner.query('DROP TABLE "workshops"');
    await queryRunner.query('DROP TABLE "mechanics"');
    await queryRunner.query('DROP TABLE "vehicles"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "maintenance_status_enum"');
    await queryRunner.query('DROP TYPE "maintenance_type_enum"');
    await queryRunner.query('DROP TYPE "vehicle_status_enum"');
    await queryRunner.query('DROP TYPE "user_role_enum"');
  }
}
