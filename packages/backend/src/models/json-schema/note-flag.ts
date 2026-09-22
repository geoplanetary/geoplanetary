/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { SchemaType } from '@/misc/json-schema.js';

export const packedNotePoliciesSchema = {
	type: 'object',
	properties: {
		masked: {
			type: 'boolean',
			nullable: false, optional: true,
		},
		enableReply: {
			type: 'boolean',
			nullable: false, optional: true,
		},
		enableQuote: {
			type: 'boolean',
			nullable: false, optional: true,
		},
	},
} as const;
export type PackedNotePolicies = SchemaType<typeof packedNotePoliciesSchema>;

export const packedNotePolicyOverrideBooleanValueSchema = {
	oneOf: [
		{
			type: 'object',
			properties: {
				useDefault: {
					type: 'boolean',
					nullable: false, optional: false,
				},
				priority: {
					type: 'boolean',
					nullable: false, optional: false,
				},
				value: {
					type: 'boolean',
					nullable: false, optional: false,
				},
			},
		},
		{
			type: 'object',
			properties: {
				useDefault: {
					type: 'boolean',
					nullable: false, optional: false,
				},
			},
		},
	],
} as const;

export const packedNotePolicyOverridesSchema = {
	type: 'object',
	properties: {
		masked: {
			type: 'object',
			ref: 'NotePolicyOverrideBooleanValue',
		},
		enableReply: {
			type: 'object',
			ref: 'NotePolicyOverrideBooleanValue',
		},
		enableQuote: {
			type: 'object',
			ref: 'NotePolicyOverrideBooleanValue',
		},
	},
} as const;
export type PackedNotePolicyOverrides = SchemaType<typeof packedNotePolicyOverridesSchema>;

export const packedNoteFlagLiteSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			nullable: false, optional: false,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		name: {
			type: 'string',
			nullable: false, optional: false,
			example: 'New Flag',
		},
		description: {
			type: 'string',
			optional: false, nullable: false,
		},
		color: {
			type: 'string',
			optional: false, nullable: true,
			example: '#000000',
		},
		iconUrl: {
			type: 'string',
			optional: false, nullable: true,
			example: 'https://example.com/',
		},
		canAssignByUser: {
			type: 'boolean',
			optional: false, nullable: false,
			example: false,
		},
		displayOrder: {
			type: 'integer',
			optional: false, nullable: false,
			example: 0,
		},
	},
} as const;
export type PackedNoteFlagLite = SchemaType<typeof packedNoteFlagLiteSchema>;

export const packedNoteFlagSchema = {
	type: 'object',
	allOf: [
		{
			type: 'object',
			ref: 'NoteFlagLite',
		},
		{
			type: 'object',
			properties: {
				createdAt: {
					type: 'string',
					optional: false, nullable: false,
					format: 'date-time',
				},
				updatedAt: {
					type: 'string',
					optional: false, nullable: false,
					format: 'date-time',
				},
				isPublic: {
					type: 'boolean',
					optional: false, nullable: false,
					example: false,
				},
				target: {
					type: 'string',
					optional: false, nullable: false,
					enum: ['manual', 'conditional'],
				},
				condFormula: {
					type: 'string',
					optional: false, nullable: false,
				},
				policies: {
					type: 'object',
					ref: 'NotePolicyOverrides',
				},
			},
		},
	],
} as const;
export type PackedNoteFlag = SchemaType<typeof packedNoteFlagSchema>;
