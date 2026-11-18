/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { NoteFlagsRepository } from '@/models/_.js';
import { awaitAll } from '@/misc/prelude/await-all.js';
import { DEFAULT_POLICIES } from '@/models/NoteFlag.js';
import type { MiNoteFlag, MiNotePolicies } from '@/models/NoteFlag.js';
import type { MiUser } from '@/models/User.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';
import { PackedNoteFlag } from '@/models/json-schema/note-flag.js';

@Injectable()
export class NoteFlagEntityService {
	constructor(
		@Inject(DI.noteFlagsRepository)
		private noteFlagsRepository: NoteFlagsRepository,

		private idService: IdService,
	) {
	}

	@bindThis
	public async pack(
		src: MiNoteFlag['id'] | MiNoteFlag,
		_me?: { id: MiUser['id'] } | null | undefined,
	): Promise<PackedNoteFlag> {
		const flag = typeof src === 'object' ? src : await this.noteFlagsRepository.findOneByOrFail({ id: src });
		const policies = flag.policies;
		for (const k of Object.keys(DEFAULT_POLICIES) as [keyof MiNotePolicies]) {
			policies[k] ??= { useDefault: true };
		}

		return await awaitAll({
			id: flag.id,
			createdAt: this.idService.parse(flag.id).date.toISOString(),
			updatedAt: flag.updatedAt.toISOString(),
			name: flag.name,
			description: flag.description,
			color: flag.color,
			iconUrl: flag.iconUrl,
			isPublic: flag.isPublic,
			asBadge: flag.asBadge,
			canAssignByUser: flag.canAssignByUser,
			displayOrder: flag.displayOrder,
			target: flag.target,
			condFormula: flag.condFormula,
			policies: policies,
		} as PackedNoteFlag);
	}

	@bindThis
	public packMany(
		src: (MiNoteFlag['id'] | MiNoteFlag)[],
		me?: { id: MiUser['id'] } | null | undefined,
	) {
		return Promise.all(src.map(x => this.pack(x, me)));
	}
}

