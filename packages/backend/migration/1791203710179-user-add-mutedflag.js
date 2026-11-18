/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class UserAddMutedFlag1791203710179 {
    name = 'UserAddMutedFlag1791203710179'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "mutedFlagIds" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`COMMENT ON COLUMN "user_profile"."mutedFlagIds" IS 'List of note flags muted by the user.'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`COMMENT ON COLUMN "user_profile"."mutedFlagIds" IS 'List of note flags muted by the user.'`);
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "mutedFlagIds"`);
    }
}
