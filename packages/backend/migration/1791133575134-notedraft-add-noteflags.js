/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteDraftAddNoteFlags1791133575134 {
    name = 'NoteDraftAddNoteFlags1791133575134'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_draft"  ADD "flagIds" varchar(32)[] NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`CREATE INDEX "IDX_4906d78e3e3b665ed17e77191588"  ON "note_draft" USING GIN ("flagIds")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."IDX_4906d78e3e3b665ed17e77191588"`);
        await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "flagIds"`);
    }
}
