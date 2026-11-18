/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface IIdentifiableError<I extends string> {
	readonly message: string;
	readonly id: I;
};

export interface IIdentifiableErrorConstructor<I extends string> {
	readonly id: I;
	new(message?: string): IIdentifiableError<I>;
};

/**
 * ID付きエラー
 */
export class IdentifiableError extends Error implements IIdentifiableError<string> {
	public readonly id: string;

	constructor(id: string, message?: string) {
		super(message);
		this.id = id;
	}

	public errorIs<E extends IIdentifiableErrorConstructor<string>>(e: E): this is E extends infer T ? T : never { return this.id === e.id; }
}
