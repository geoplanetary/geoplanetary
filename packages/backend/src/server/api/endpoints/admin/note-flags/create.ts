/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteFlagEntityService } from '@/core/entities/NoteFlagEntityService.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';

export const meta = {
	tags: ['admin', 'note-flag'],
	description: 'Create a new note flag.',

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:note-flags',

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'NoteFlag',
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
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
		'name',
		'description',
		'color',
		'iconUrl',
		'isPublic',
		'canAssignByUser',
		'displayOrder',
		'target',
		'condFormula',
		'policies',
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private noteFlagEntityService: NoteFlagEntityService,
		private noteModerationService: NoteModerationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const created = await this.noteModerationService.createFlag(ps, me);

			return await this.noteFlagEntityService.pack(created, me);
		});
	}
}
