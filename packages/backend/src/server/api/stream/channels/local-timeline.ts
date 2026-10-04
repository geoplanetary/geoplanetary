/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Packed } from '@/misc/json-schema.js';
import { MetaService } from '@/core/MetaService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { RoleService } from '@/core/RoleService.js';
import { isQuotePacked, isRenotePacked } from '@/misc/is-renote.js';
import type { JsonObject } from '@/misc/json-value.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { NoteStreamingHidingService } from '../NoteStreamingHidingService.js';

@Injectable({ scope: Scope.TRANSIENT })
export class LocalTimelineChannel extends Channel {
	public readonly chName = 'localTimeline';
	public static shouldShare = false as const;
	public static requireCredential = false as const;
	private withRenotes: boolean;
	private withReplies: boolean;
	private withFiles: boolean;

	constructor(
		@Inject(REQUEST)
		request: ChannelRequest,

		private metaService: MetaService,
		private roleService: RoleService,
		private noteModerationService: NoteModerationService,
		private noteEntityService: NoteEntityService,
		private noteStreamingHidingService: NoteStreamingHidingService,
	) {
		super(request);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: JsonObject) {
		const policies = await this.roleService.getUserPolicies(this.user ? this.user.id : null);
		if (!policies.ltlAvailable) return;

		this.withRenotes = !!(params.withRenotes ?? true);
		this.withReplies = !!(params.withReplies ?? false);
		this.withFiles = !!(params.withFiles ?? false);

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		if (this.withFiles && (note.fileIds == null || note.fileIds.length === 0)) return;

		if (note.user.host !== null) return;
		if (note.visibility !== 'public') return;
		if (note.channelId != null) return;
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

		// 関係ない返信は除外
		if (note.reply && this.user && !this.following[note.userId]?.withReplies && !this.withReplies) {
			const reply = note.reply;
			// 「チャンネル接続主への返信」でもなければ、「チャンネル接続主が行った返信」でもなければ、「投稿者の投稿者自身への返信」でもない場合
			if (reply.userId !== this.user.id && note.userId !== this.user.id && reply.userId !== note.userId) return;
		}

		if (isRenotePacked(note) && !isQuotePacked(note) && !this.withRenotes) return;

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
