/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { NoteFlagsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { NoteFlagEntityService } from '@/core/entities/NoteFlagEntityService.js';

export const meta = {
	tags: ['admin', 'note-flag'],
	description: 'Get a list of note flag.',

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:note-flags',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'NoteFlag',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
	},
	required: [
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.noteFlagsRepository)
		private noteFlagsRepository: NoteFlagsRepository,

		private noteFlagEntityService: NoteFlagEntityService,
	) {
		super(meta, paramDef, async (_ps, me) => {
			const flags = await this.noteFlagsRepository.find({
				order: { id: 'DESC' },
			});
			return await this.noteFlagEntityService.packMany(flags, me);
		});
	}
}
