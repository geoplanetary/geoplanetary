/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Entity, Column, PrimaryColumn } from 'typeorm';
import { id } from './util/id.js';

export type MiNotePolicies = {
	/**
	 * ノートを本人とモデレーター以外から非表示にする
	 */
	masked: boolean;

	/**
	 * ノートへの返信を有効化する
	 */
	enableReply: boolean;

	/**
	 * ノートの引用/Renoteを有効化する
	 */
	enableQuote: boolean;
};

export const DEFAULT_POLICIES: MiNotePolicies = {
	masked: false,
	enableReply: true,
	enableQuote: true,
};

export type NotePolicyRecords = { [K in keyof MiNotePolicies]?: MiNotePolicies[K] };

export type NotePolicyDefaultValue = { useDefault: true };
export type NotePolicyOverrideValue<K extends keyof MiNotePolicies> = {
	useDefault: false;
	priority: number;
	value: MiNotePolicies[K];
};

export type NotePolicyOverrides = { [K in keyof MiNotePolicies]?: NotePolicyDefaultValue | NotePolicyOverrideValue<K> };

@Entity('note_flag')
export class MiNoteFlag {
	@PrimaryColumn(id())
	public id: string;

	@Column('timestamp with time zone', {
		comment: 'The updated date of the Flag.',
	})
	public updatedAt: Date;

	@Column('varchar', {
		length: 256,
	})
	public name: string;

	@Column('varchar', {
		length: 1024,
	})
	public description: string;

	@Column('varchar', {
		length: 256, nullable: true,
	})
	public color: string | null;

	@Column('varchar', {
		length: 512, nullable: true,
	})
	public iconUrl: string | null;

	@Column('boolean', {
		default: false,
	})
	public isPublic: boolean;

	@Column('boolean', {
		default: false,
	})
	public asBadge: boolean;

	@Column('boolean', {
		default: false,
	})
	public canAssignByUser: boolean;

	@Column('integer', {
		default: 0,
	})
	public displayOrder: number;

	@Column('varchar', {
		length: 16,
		default: 'manual',
	})
	public target: 'manual' | 'conditional';

	@Column('varchar', {
		length: 1024,
		default: '',
	})
	public condFormula: string;

	@Column('jsonb', {
		default: {},
	})
	public policies: NotePolicyOverrides;
}
