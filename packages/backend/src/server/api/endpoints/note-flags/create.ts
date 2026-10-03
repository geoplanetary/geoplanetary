/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { NoteFlagsRepository, NotesRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';

export const meta = {
	tags: ['notes', 'note-flag'],
	description: 'Assign note flag to note.',

	requireCredential: true,
	kind: 'write:notes',

	limit: {
		key: 'note-flag:user',
		duration: 60000,
		max: 30,
	},

	errors: {
		noSuchFlag: {
			message: 'No such flag.',
			code: 'NO_SUCH_FLAG',
			id: '421abc62-b0c9-519e-93f2-2110f413a998', // UUIDv5: 'ns:api.geoplanetary.net/errors/NO_SUCH_FLAG'
		},

		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '1f8bfed3-1ff7-56c8-9f3a-78f16db474bf', // UUIDv5: 'ns:api.geoplanetary.net/errors/NO_SUCH_NOTE'
		},

		alreadyAssigned: {
			message: 'Already assigned.',
			code: 'ALREADY_ASSIGNED',
			id: '40169fec-e610-50ae-950e-b13d3524c60d', // UUIDv5: 'ns:api.geoplanetary.net/errors/ALREADY_ASSIGNED'
		},

		accessDenied: {
			message: 'Only moderators can edit flag of the note.',
			code: 'ACCESS_DENIED',
			id: '193cf399-6ef3-51fc-9b5f-dcb170c68b2e', // UUIDv5: 'ns:api.geoplanetary.net/errors/ACCESS_DENIED'
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		flagId: { type: 'string', format: 'misskey:id' },
		noteId: { type: 'string', format: 'misskey:id' },
	},
	required: [
		'flagId',
		'noteId',
	],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.noteFlagsRepository)
		private noteFlagsRepository: NoteFlagsRepository,

		private noteModerationService: NoteModerationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const flag = await this.noteFlagsRepository.findOneBy({ id: ps.flagId });
			if (flag == null || !flag.isPublic || flag.target !== 'manual') {
				throw new ApiError(meta.errors.noSuchFlag);
			}
			if (!flag.canAssignByUser) {
				throw new ApiError(meta.errors.accessDenied);
			}

			const note = await this.notesRepository.findOneBy({ id: ps.noteId });
			if (note == null) {
				throw new ApiError(meta.errors.noSuchNote);
			}
			if (note.userId !== me.id) {
				throw new ApiError(meta.errors.accessDenied);
			}

			try {
				await this.noteModerationService.assignFlagToNote(note.id, flag.id);
			} catch (err) {
				if (err instanceof NoteModerationService.FlagAlreadyAssignedError) {
					throw new ApiError(meta.errors.alreadyAssigned);
				} else {
					throw err;
				}
			}
		});
	}
}
