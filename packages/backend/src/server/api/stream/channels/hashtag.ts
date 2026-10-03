/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { normalizeForSearch } from '@/misc/normalize-for-search.js';
import type { Packed } from '@/misc/json-schema.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { isRenotePacked, isQuotePacked } from '@/misc/is-renote.js';
import type { JsonObject } from '@/misc/json-value.js';
import { RoleService } from '@/core/RoleService.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { NoteStreamingHidingService } from '../NoteStreamingHidingService.js';
@Injectable({ scope: Scope.TRANSIENT })
export class HashtagChannel extends Channel {
	public readonly chName = 'hashtag';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private q: string[][];

	constructor(
		@Inject(REQUEST)
		request: ChannelRequest,

		private noteEntityService: NoteEntityService,
		private noteStreamingHidingService: NoteStreamingHidingService,
		private roleService: RoleService,
		private noteModerationService: NoteModerationService,
	) {
		super(request);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: JsonObject): Promise<boolean> {
		if (!Array.isArray(params.q)) return false;
		if (!params.q.every((x): x is string[] => (
			Array.isArray(x) &&
			x.length >= 1 &&
			x.every(y => typeof y === 'string')
		))) return false;
		this.q = params.q;

		// Subscribe stream
		this.subscriber.on('notesStream', this.onNote);

		return true;
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		const noteTags = note.tags ? note.tags.map((t: string) => t.toLowerCase()) : [];
		const matched = this.q.some(tags => tags.every(tag => noteTags.includes(normalizeForSearch(tag))));
		if (!matched) return;

		if (!this.isNoteVisibleForMe(note)) return;
		const [noteUserPolicies, renoteUserPolicies, replyUserPolicies, notePolicies] = await Promise.all([
			await this.roleService.getUserPolicies(note.userId),
			note.renote ? await this.roleService.getUserPolicies(note.renote.userId) : undefined,
			note.reply ? await this.roleService.getUserPolicies(note.reply.userId) : undefined,
			await this.noteModerationService.getNotePolicies(note.id),
		]);
		const iMMod = this.user != null && this.roleService.isModerator(this.user);
		if (noteUserPolicies.requireSigninToViewContents === 'force-enable' && this.user == null) return;
		if (renoteUserPolicies?.requireSigninToViewContents === 'force-enable' && this.user == null) return;
		if (replyUserPolicies?.requireSigninToViewContents === 'force-enable' && this.user == null) return;
		if (noteUserPolicies.requireSigninToViewContents === 'leave' && note.user.requireSigninToViewContents && this.user == null) return;
		if (renoteUserPolicies?.requireSigninToViewContents === 'leave' && note.renote && note.renote.user.requireSigninToViewContents && this.user == null) return;
		if (replyUserPolicies?.requireSigninToViewContents === 'leave' && note.reply && note.reply.user.requireSigninToViewContents && this.user == null) return;
		if (notePolicies.masked && (note.userId !== this.user?.id || !iMMod)) return;
		if (this.isNoteMutedOrBlocked(note)) return;

		const filtered = await this.noteStreamingHidingService.filter(note, this.user?.id ?? null);
		if (!filtered) return;
		// eslint-disable-next-line no-param-reassign -- これ以降元の Note オブジェクトは見てはいけないので、いっそ再代入した方が安全
		note = filtered;

		if (this.user) {
			if (isRenotePacked(note) && !isQuotePacked(note)) {
				if (note.renote && Object.keys(note.renote.reactions).length > 0) {
					const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
					note.renote.myReaction = myRenoteReaction;
				}
			}
		}

		this.send('note', note);
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
