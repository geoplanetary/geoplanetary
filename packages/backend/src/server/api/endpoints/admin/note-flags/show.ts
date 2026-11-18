/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { NoteFlagsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { NoteFlagEntityService } from '@/core/entities/NoteFlagEntityService.js';

export const meta = {
	tags: ['admin', 'note-flag'],
	description: 'Get a note flag.',

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:note-flags',

	errors: {
		noSuchFlag: {
			message: 'No such flag.',
			code: 'NO_SUCH_FLAG',
			id: '421abc62-b0c9-519e-93f2-2110f413a998', // UUIDv5: 'ns:api.geoplanetary.net/errors/NO_SUCH_FLAG'
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'NoteFlag',
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		flagId: { type: 'string', format: 'misskey:id' },
	},
	required: [
		'flagId',
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.noteFlagsRepository)
		private noteFlagsRepository: NoteFlagsRepository,

		private noteFlagEntityService: NoteFlagEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const flag = await this.noteFlagsRepository.findOneBy({ id: ps.flagId });
			if (flag == null) {
				throw new ApiError(meta.errors.noSuchFlag);
			}
			return await this.noteFlagEntityService.pack(flag, me);
		});
	}
}
