/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiNote } from './Note.js';
import { MiNoteFlag } from './NoteFlag.js';

@Entity('note_flag_assignment')
@Index(['noteId', 'flagId'], { unique: true })
export class MiNoteFlagAssignment {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
		comment: 'The note ID.',
	})
	public noteId: MiNote['id'];

	@ManyToOne(() => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public note: MiNote | null;

	@Index()
	@Column({
		...id(),
		comment: 'The flag ID.',
	})
	public flagId: MiNoteFlag['id'];

	@ManyToOne(() => MiNoteFlag, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public flag: MiNoteFlag | null;
}
