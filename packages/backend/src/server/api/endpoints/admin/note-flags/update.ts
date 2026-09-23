/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { NoteFlagsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';

export const meta = {
	tags: ['admin', 'note-flag'],
	description: 'Update a existing note flag.',

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:note-flags',

	errors: {
		noSuchFlag: {
			message: 'No such flag.',
			code: 'NO_SUCH_FLAG',
			id: '421abc62-b0c9-519e-93f2-2110f413a998', // UUIDv5: 'ns:api.geoplanetary.net/errors/NO_SUCH_FLAG'
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		flagId: { type: 'string', format: 'misskey:id' },
		name: { type: 'string' },
		description: { type: 'string' },
		color: { type: 'string', nullable: true },
		iconUrl: { type: 'string', nullable: true },
		isPublic: { type: 'boolean' },
		canAssignByUser: { type: 'boolean' },
		displayOrder: { type: 'number' },
		target: { type: 'string', enum: ['manual', 'conditional'] },
		condFormula: { type: 'string' },
		policies: {
			type: 'object',
		},
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

		private noteModerationService: NoteModerationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const flag = await this.noteFlagsRepository.findOneBy({ id: ps.flagId });
			if (flag == null) {
				throw new ApiError(meta.errors.noSuchFlag);
			}

			await this.noteModerationService.updateFlag(flag, {
				name: ps.name,
				description: ps.description,
				color: ps.color,
				iconUrl: ps.iconUrl,
				isPublic: ps.isPublic,
				canAssignByUser: ps.canAssignByUser,
				displayOrder: ps.displayOrder,
				target: ps.target,
				condFormula: ps.condFormula,
				policies: ps.policies,
			}, me);
		});
	}
}
