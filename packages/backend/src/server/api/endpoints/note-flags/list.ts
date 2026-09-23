/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';
import { Packed } from '@/misc/json-schema.js';

export const meta = {
	tags: ['note-flag'],
	description: 'Get a list of note flag.',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'NoteFlagLite',
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
		private noteModerationService: NoteModerationService,
	) {
		super(meta, paramDef, async (_ps, _me) => {
			const flags = (await this.noteModerationService.getAllFlags()).filter(v => v.isPublic).sort((l, r) => l.displayOrder - r.displayOrder);
			return flags.map((v): Packed<'NoteFlagLite'> => {
				return {
					id: v.id,
					name: v.name,
					description: v.description,
					color: v.color,
					iconUrl: v.iconUrl,
					canAssignByUser: v.canAssignByUser,
					displayOrder: v.displayOrder,
				};
			});
		});
	}
}
