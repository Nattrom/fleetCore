import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationalIndexes1761561000000 implements MigrationInterface {
  name = 'AddOperationalIndexes1761561000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "ix_vehicles_status" ON "vehicles" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_mechanics_is_active" ON "mechanics" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_workshops_is_active" ON "workshops" ("is_active")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_workshops_is_active"`);
    await queryRunner.query(`DROP INDEX "ix_mechanics_is_active"`);
    await queryRunner.query(`DROP INDEX "ix_vehicles_status"`);
  }
}
