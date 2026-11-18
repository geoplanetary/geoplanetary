/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteFlag1789895354867 {
    name = 'NoteFlag1789895354867'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "note_flag" ("id" character varying(32) NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "name" character varying(256) NOT NULL, "description" character varying(1024) NOT NULL, "color" character varying(256), "iconUrl" character varying(512), "isPublic" boolean NOT NULL DEFAULT false, "asBadge" boolean NOT NULL DEFAULT false, "canAssignByUser" boolean NOT NULL DEFAULT false, "displayOrder" integer NOT NULL DEFAULT '0', "target" character varying(16) NOT NULL DEFAULT 'manual', "condFormula" character varying(1024) NOT NULL DEFAULT '', "policies" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_7b2e5a0eca897fefe819a7110bc" PRIMARY KEY ("id")); COMMENT ON COLUMN "note_flag"."updatedAt" IS 'The updated date of the Flag.'`);
        await queryRunner.query(`CREATE TABLE "note_flag_assignment" ("id" character varying(32) NOT NULL, "noteId" character varying(32) NOT NULL, "flagId" character varying(32) NOT NULL, CONSTRAINT "PK_d57f1a4d06536818828d8b62ac7" PRIMARY KEY ("id")); COMMENT ON COLUMN "note_flag_assignment"."noteId" IS 'The note ID.'; COMMENT ON COLUMN "note_flag_assignment"."flagId" IS 'The flag ID.'`);
        await queryRunner.query(`CREATE INDEX "IDX_c79c6f001719cf1aae39a16a0e" ON "note_flag_assignment"  ("noteId") `);
        await queryRunner.query(`CREATE INDEX "IDX_44ef4a84ebe5c5be01d355f9c5" ON "note_flag_assignment"  ("flagId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0ab5632056bc8f91df8b442f21" ON "note_flag_assignment"  ("noteId", "flagId") `);
        await queryRunner.query(`ALTER TABLE "meta" ADD "notePolicies" jsonb NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "note_flag_assignment" ADD CONSTRAINT "FK_c79c6f001719cf1aae39a16a0ea" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_flag_assignment" ADD CONSTRAINT "FK_44ef4a84ebe5c5be01d355f9c59" FOREIGN KEY ("flagId") REFERENCES "note_flag"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_flag_assignment" DROP CONSTRAINT "FK_44ef4a84ebe5c5be01d355f9c59"`);
        await queryRunner.query(`ALTER TABLE "note_flag_assignment" DROP CONSTRAINT "FK_c79c6f001719cf1aae39a16a0ea"`);
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "notePolicies"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ab5632056bc8f91df8b442f21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44ef4a84ebe5c5be01d355f9c5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c79c6f001719cf1aae39a16a0e"`);
        await queryRunner.query(`DROP TABLE "note_flag_assignment"`);
        await queryRunner.query(`DROP TABLE "note_flag"`);
    }
}
