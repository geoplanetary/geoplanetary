/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { RoleService } from '@/core/RoleService.js';
import { isRenotePacked, isQuotePacked } from '@/misc/is-renote.js';
import { DI } from '@/di-symbols.js';
import type { RolesRepository } from '@/models/_.js';
import type { GlobalEvents } from '@/core/GlobalEventService.js';
import type { JsonObject } from '@/misc/json-value.js';
import { NoteModerationService } from '@/core/NoteModerationService.js';
import Channel, { type ChannelRequest } from '../channel.js';
import { NoteStreamingHidingService } from '../NoteStreamingHidingService.js';

@Injectable({ scope: Scope.TRANSIENT })
export class RoleTimelineChannel extends Channel {
	public readonly chName = 'roleTimeline';
	public static shouldShare = false;
	public static requireCredential = false as const;
	private roleId: string;

	constructor(
		@Inject(REQUEST)
		request: ChannelRequest,

		@Inject(DI.rolesRepository)
		private rolesRepository: RolesRepository,

		private noteEntityService: NoteEntityService,
		private roleservice: RoleService,
		private noteModerationService: NoteModerationService,
		private noteStreamingHidingService: NoteStreamingHidingService,
	) {
		super(request);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: JsonObject) {
		if (typeof params.roleId !== 'string') return false;
		this.roleId = params.roleId;

		if (!await this.isAvailable()) return false;

		this.subscriber.on(`roleTimelineStream:${this.roleId}`, this.onEvent);
		return true;
	}

	@bindThis
	private async isAvailable() {
		return await this.rolesRepository.exists({
			where: { id: this.roleId, isPublic: true, isExplorable: true },
		});
	}

	@bindThis
	private async onEvent(data: GlobalEvents['roleTimeline']['payload']) {
		if (!await this.isAvailable()) return;

		if (data.type === 'note') {
			let note = data.body;

			if (note.visibility !== 'public') return;
			const [noteUserPolicies, renoteUserPolicies, replyUserPolicies, notePolicies] = await Promise.all([
				await this.roleservice.getUserPolicies(note.userId),
				note.renote ? await this.roleservice.getUserPolicies(note.renote.userId) : undefined,
				note.reply ? await this.roleservice.getUserPolicies(note.reply.userId) : undefined,
				await this.noteModerationService.getNotePolicies(note.id),
			]);
			const iMMod = this.user != null && this.roleservice.isModerator(this.user);
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
		} else {
			this.send(data.type, data.body);
		}
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off(`roleTimelineStream:${this.roleId}`, this.onEvent);
	}
}
