/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { NoteFlagEntityService } from '@/core/entities/NoteFlagEntityService.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';
import { DEFAULT_POLICIES, MiNotePolicies, NotePolicyOverrides } from '@/models/NoteFlag.js';

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

	errors: {
		invalidParams: {
			message: 'Invalid param.',
			code: 'INVALID_PARAM',
			id: '54a04a02-4a0f-51ca-9f8c-be39d60c01cb', // UUIDv5: 'ns:api.geoplanetary.net/errors/INVALID_PARAM#/admin/note-flags/create'
		},
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
		asBadge: { type: 'boolean' },
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
		'asBadge',
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
			const matchPolicyOverride = <K extends keyof MiNotePolicies>(o: unknown, key: K): o is NotePolicyOverrides => {
				if (o === undefined) return true;
				if (typeof o !== 'object' || o == null || typeof (o as { [K in string]: unknown })['useDefault'] !== 'boolean') return false;
				if ((o as { [K in string]: unknown })['useDefault'] === true) return true;
				if (typeof (o as { [K in string]: unknown })['priority'] !== 'number') return false;
				if (typeof (o as { [K in string]: unknown })['value'] !== typeof DEFAULT_POLICIES[key]) return false;
				return true;
			};
			if ((Object.keys(ps.policies) as (keyof MiNotePolicies)[]).some(k => !matchPolicyOverride(ps.policies[k], k))) {
				throw new ApiError(meta.errors.invalidParams);
			}

			const created = await this.noteModerationService.createFlag(ps, me);

			return await this.noteFlagEntityService.pack(created, me);
		});
	}
}
