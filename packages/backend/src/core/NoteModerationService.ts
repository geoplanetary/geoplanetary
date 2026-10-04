/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { decode } from 'blurhash';
import { LCFAST, LCFExpression, LCFExpressionRecordType, LCFExpressionValueType, LCFPredicateDefinitionList, defaultPredicateLib } from '@geoplanetary/lcf-expression';
import Redis from 'ioredis';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { bindThis } from '@/decorators.js';
import { DI } from '@/di-symbols.js';
import * as model from '@/models/_.js';
import { DEFAULT_POLICIES, MiNotePolicies, NotePolicyOverrideValue } from '@/models/NoteFlag.js';
import type { ProhibitedNoteFormulaValue } from '@/models/ProhibitedNoteFormula.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { MemoryKVCache, MemorySingleCache, RedisKVCache } from '@/misc/cache.js';
import { CacheService } from './CacheService.js';
import { GlobalEvents, GlobalEventService } from './GlobalEventService.js';
import { IdService } from './IdService.js';
import { ModerationLogService } from './ModerationLogService.js';
import { RoleService } from './RoleService.js';
import { UtilityService } from './UtilityService.js';

export type InspectionSubject = {
	userId: model.MiUser['id'];
	text: string | null;
	reply: model.MiNote | null;
	renote: model.MiNote | null;
	files: model.MiDriveFile[] | null;
	mentions: { username: string; host: string | null; }[];
	tags: string[];
	roles: model.MiRole[];
	flags: model.MiNoteFlag[];
};

@Injectable()
export class NoteModerationService implements OnApplicationShutdown {
	public static readonly FlagAlreadyAssignedError = class extends IdentifiableError {
		public static readonly id = '1860b6ea-a966-4224-a46c-0127447c200a';
		constructor(message?: string) { super(NoteModerationService.FlagAlreadyAssignedError.id, message ?? 'Flag is already assigned to note.'); }
	};
	public static readonly FlagNotAssignedError = class extends IdentifiableError {
		public static readonly id = '996635a6-899c-489a-ae9b-cccd87397f61';
		constructor(message?: string) { super(NoteModerationService.FlagNotAssignedError.id, message ?? 'Flag is not assigned to note yet.'); }
	};

	private noteUserCache: MemoryKVCache<model.MiNote['userId']>;
	private noteFlagsCache: MemorySingleCache<model.MiNoteFlag[]>;
	private noteFlagAssignmentsByNoteCache: RedisKVCache<model.MiNoteFlagAssignment[]>;
	private noteFlagIdsCache: MemoryKVCache<{ manual: Set<model.MiNoteFlag['id']>, conditional: Set<model.MiNoteFlag['id']> }>;
	private cacheMayExpireUsers: MemoryKVCache<true>;
	private prohibitedWords: string[];
	private prohibitedNoteExpr: LCFAST[];
	private sensitiveWords: string[];
	private sensitiveNoteExpr: LCFAST[];

	static readonly lcfPredicates: LCFPredicateDefinitionList = {
		...defaultPredicateLib,
		blurhashdiff(input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean) {
			const f = (input: LCFExpressionValueType, target: LCFExpressionValueType) => {
				if (!LCFExpression.isString(input) || !LCFExpression.isString(target)) return null;
				try {
					const bIn = decode(input, 5, 5);
					const bTgt = decode(target, 5, 5);
					let r = 0;
					for (let i = 0; i < 25; ++i) {
						r += bIn[i] > bTgt[i] ? bIn[i] - bTgt[i] : bTgt[i] - bIn[i];
					}
					return r;
				} catch (_) { return null; }
			};
			switch (args.length) {
				case 1: return f(input, args[0](input));
				case 2: return f(args[0](input), args[1](input));
				default: if (throwTypeError) { throw Error(`1 or 2 args expected, but ${args.length} args provided.`); } else { return null; }
			}
		},
		now(_input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean) {
			const f = () => {
				return Date.now();
			};
			switch (args.length) {
				case 0: return f();
				default: if (throwTypeError) { throw Error(`0 args expected, but ${args.length} args provided.`); } else { return null; }
			}
		},
		browsersafe(input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean) {
			const browsersafeTypes = new Set(FILE_TYPE_BROWSERSAFE);
			const f = (input: LCFExpressionValueType) => {
				if (!LCFExpression.isString(input)) return null;
				return browsersafeTypes.has(input);
			};
			switch (args.length) {
				case 0: return f(input);
				default: if (throwTypeError) { throw Error(`0 args expected, but ${args.length} args provided.`); } else { return null; }
			}
		},
	};

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.meta)
		private meta: model.MiMeta,

		@Inject(DI.notesRepository)
		private notesRepository: model.NotesRepository,

		@Inject(DI.noteFlagsRepository)
		private noteFlagsRepository: model.NoteFlagsRepository,

		@Inject(DI.noteFlagAssignmentsRepository)
		private noteFlagAssignmentsRepository: model.NoteFlagAssignmentsRepository,

		private idService: IdService,
		private cacheService: CacheService,
		private globalEventService: GlobalEventService,
		private moderationLogService: ModerationLogService,
		private roleService: RoleService,
		private utilityService: UtilityService,
	) {
		// todo. キャッシュのライフタイム、設定に書き起こしてもよさそう？
		this.noteUserCache = new MemoryKVCache<model.MiNote['userId']>(1000 * 60); // 1min
		this.noteFlagsCache = new MemorySingleCache<model.MiNoteFlag[]>(1000 * 60 * 60); // 1hour
		this.noteFlagAssignmentsByNoteCache = new RedisKVCache<model.MiNoteFlagAssignment[]>(this.redisClient, 'noteFlagAssignments', {
			lifetime: 1000 * 60 * 10, // 10min
			memoryCacheLifetime: 1000 * 30, // 30sec
			fetcher: (key) => this.noteFlagAssignmentsRepository.findBy({ noteId: key }),
			toRedisConverter: (value) => JSON.stringify(value),
			fromRedisConverter: (value) => JSON.parse(value),
		});
		this.noteFlagIdsCache = new MemoryKVCache<{ manual: Set<model.MiNoteFlag['id']>, conditional: Set<model.MiNoteFlag['id']> }>(1000 * 60); // 1min
		this.cacheMayExpireUsers = new MemoryKVCache<true>(1000 * 60); // = noteFlagIdsCache.constructor.lifetime

		this.updateProhibitedWords();
		this.updateSensitiveWords();
		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_host: string, data: string): Promise<void> {
		const obj = JSON.parse(data) as { [K in keyof GlobalEvents]: { channel: GlobalEvents[K]['name'], message: GlobalEvents[K]['payload'] } }[keyof GlobalEvents];
		if (obj.channel === 'internal') {
			const { type, body } = obj.message;
			switch (type) {
				case 'metaUpdated': {
					this.updateProhibitedWords(body.after.prohibitedWords);
					this.updateSensitiveWords(body.after.sensitiveWords);
					break;
				}
				case 'noteFlagCreated': {
					const cache = this.noteFlagsCache.get();
					if (cache) {
						cache.push({
							...body,
							updatedAt: new Date(body.updatedAt),
						});
					}
					break;
				}
				case 'noteFlagUpdated': {
					const cache = this.noteFlagsCache.get();
					const i = cache?.findIndex(v => v.id === body.id);
					if (cache && i && i >= 0) {
						cache[i] = {
							...body,
							updatedAt: new Date(body.updatedAt),
						};
					}
					break;
				}
				case 'noteFlagDeleted': {
					const cache = this.noteFlagsCache.get();
					if (cache) {
						this.noteFlagsCache.set(cache.filter(v => v.id !== body.id));
					}
					break;
				}
				case 'noteFlagAssigned':
				case 'noteFlagUnassigned': {
					this.noteFlagAssignmentsByNoteCache.delete(body.noteId);
					this.noteFlagIdsCache.delete(body.noteId);
					break;
				}
				case 'userRoleAssigned':
				case 'userRoleUnassigned':
				case 'updateUserProfile': {
					this.cacheMayExpireUsers.set(body.userId, true);
					break;
				}
				default: break;
			}
		}
	};

	/**
	 * すべてのノートフラグを取得する。
	 */
	@bindThis
	public async getAllFlags() {
		return await this.noteFlagsCache.fetch(() => this.noteFlagsRepository.findBy({}));
	}

	/**
	 * 指定したユーザー(省略した場合は通常のローカルユーザー)がアサイン可能なノートフラグを取得する。
	 */
	@bindThis
	public async getAssignableFlags(userId?: model.MiUser['id']) {
		const [iAmMod, flags] = await Promise.all([
			(async () => userId ? await this.roleService.isModerator({ id: userId }) : false)(),
			this.getAllFlags(),
		]);
		return flags.filter(f => f.target === 'manual' && (iAmMod || f.isPublic && f.canAssignByUser));
	}

	/**
	 * ノートに関連付けられたフラグを取得する。
	 * @param noteId 取得対象のノートID
	 */
	@bindThis
	public async getFlagsOfNote(noteId: model.MiNote['id']) {
		const flags = await this.getAllFlags();
		const poster = await this.noteUserCache.fetch(noteId, async () => (await this.notesRepository.findOneByOrFail({ id: noteId })).userId);
		const expire = this.cacheMayExpireUsers.get(poster);
		if (expire) {
			this.noteFlagIdsCache.delete(poster);
		}
		const idset = await this.noteFlagIdsCache.fetch(noteId, async () => {
			const assigned = new Set((await this.noteFlagAssignmentsByNoteCache.fetch(noteId)).map(v => v.flagId));
			const note = await this.notesRepository.findOneByOrFail({ id: noteId });
			const user = await this.cacheService.findUserById(note.userId);
			const roles = await this.roleService.getUserRoles(note.userId);
			const conditionalFlags = flags.filter(flags => flags.target === 'conditional' && flags.condFormula);
			if (conditionalFlags.length > 0) {
				const compiler = new LCFExpression({ predicateDefs: NoteModerationService.lcfPredicates, throwOnTypeError: false });
				const matched = new Set(conditionalFlags.filter(flag => {
					try {
						return compiler.compile(compiler.parse(flag.condFormula))({
							...note,
							user: { ...user, roles: roles.map(o => { return { ...o, lastUsedAt: o.lastUsedAt.valueOf(), updatedAt: o.updatedAt.valueOf() } as LCFExpressionRecordType; }) },
							flags: [...assigned.values()],
						} as LCFExpressionRecordType);
					} catch (_) { return false; }
				}).map(flag => flag.id));
				return { manual: assigned, conditional: matched };
			} else {
				return { manual: assigned, conditional: new Set() };
			}
		});
		return flags.filter(flag => (flag.target === 'manual' && idset.manual.has(flag.id)) || (flag.target === 'conditional' && idset.conditional.has(flag.id)));
	}

	/**
	 * ノートに適用されるポリシーを取得する。
	 * @param noteId 取得対象のノートID
	 */
	public async getNotePolicies(noteId: model.MiNote['id']): Promise<MiNotePolicies> {
		const defaultPolicies = { ...DEFAULT_POLICIES, ...this.meta.notePolicies };
		const flags = await this.getFlagsOfNote(noteId);

		function aggregatePolicy<P extends keyof MiNotePolicies>(key: P, mergePred: (values: NotePolicyOverrideValue<P>[]) => MiNotePolicies[P]) {
			const policyMod = flags.map(flag => flag.policies[key]).filter((p): p is NotePolicyOverrideValue<P> => p && p.useDefault === false);
			if (policyMod.length <= 0) return defaultPolicies[key];
			const priority = Math.max(...policyMod.map(v => v.priority));
			return mergePred(policyMod.filter(v => v.priority === priority));
		}

		return {
			masked: aggregatePolicy('masked', v => v.every(i => i.value)),
			enableReply: aggregatePolicy('enableReply', v => v.some(i => i.value)),
			enableQuote: aggregatePolicy('enableQuote', v => v.some(i => i.value)),
		};
	}

	/**
	 * 新しいフラグを作成する。
	 * @param e 作成するフラグの内容
	 * @param moderator 操作を実行するユーザー
	 * @returns 作成されたフラグ
	 */
	@bindThis
	public async createFlag(e: Partial<model.MiNoteFlag>, moderator?: model.MiUser) {
		const date = new Date();
		const created = await this.noteFlagsRepository.insertOne({
			...e,
			id: this.idService.gen(date.getTime()),
			updatedAt: date,
		});

		this.globalEventService.publishInternalEvent('noteFlagCreated', created);
		if (moderator) {
			await this.moderationLogService.log(moderator, 'createNoteFlag', {
				flagId: created.id,
				flag: created,
			});
		}
		return created;
	}

	/**
	 * フラグを削除する。
	 * @param target 削除するフラグ
	 * @param moderator 操作を実行するユーザー
	 */
	@bindThis
	public async deleteFlag(target: model.MiNoteFlag, moderator?: model.MiUser) {
		await this.noteFlagsRepository.delete({ id: target.id });

		this.globalEventService.publishInternalEvent('noteFlagDeleted', target);
		if (moderator) {
			await this.moderationLogService.log(moderator, 'deleteNoteFlag', {
				flagId: target.id,
				flag: target,
			});
		}
	}

	/**
	 * フラグの内容を更新する。
	 * @param target 更新するフラグ
	 * @param e フラグの更新内容
	 * @param moderator 操作を実行するユーザー
	 */
	@bindThis
	public async updateFlag(target: model.MiNoteFlag, e: Partial<model.MiNoteFlag>, moderator?: model.MiUser) {
		const date = new Date();
		await this.noteFlagsRepository.update(target.id, {
			...e,
			id: undefined,
			updatedAt: date,
		});

		const updated = await this.noteFlagsRepository.findOneByOrFail({ id: target.id });
		this.globalEventService.publishInternalEvent('noteFlagUpdated', updated);
		if (moderator) {
			await this.moderationLogService.log(moderator, 'updateNoteFlag', {
				flagId: target.id,
				before: target,
				after: updated,
			});
		}
	}

	/**
	 * ノートにフラグを付与する。
	 * @param targetId 対象のノートのID
	 * @param flagId 付与するフラグのID
	 * @param moderator 操作を実行するユーザー
	 */
	@bindThis
	public async assignFlagToNote(targetId: model.MiNote['id'], flagId: model.MiNoteFlag['id'], moderator?: model.MiUser) {
		const now = Date.now();
		const flag = await this.noteFlagsRepository.findOneByOrFail({ id: flagId });
		const note = await this.notesRepository.findOneByOrFail({ id: targetId });
		const existing = await this.noteFlagAssignmentsRepository.findOneBy({ flagId: flagId, noteId: targetId });
		if (existing) {
			throw new NoteModerationService.FlagAlreadyAssignedError();
		}
		const created = await this.noteFlagAssignmentsRepository.insertOne({
			id: this.idService.gen(now),
			flagId: flagId,
			noteId: targetId,
		});
		this.globalEventService.publishInternalEvent('noteFlagAssigned', created);
		if (moderator) {
			this.moderationLogService.log(moderator, 'assignNoteFlag', {
				flagId: flagId,
				flagName: flag.name,
				noteId: targetId,
				note: note,
				noteUserId: note.userId,
				noteUserHost: note.userHost,
			});
		}
	}

	/**
	 * ノートからフラグを剥奪する。
	 * @param targetId 対象のノートのID
	 * @param flagId 剥奪するフラグのID
	 * @param moderator 操作を実行するユーザー
	 */
	@bindThis
	public async unassignFlagToNote(targetId: model.MiNote['id'], flagId: model.MiNoteFlag['id'], moderator?: model.MiUser) {
		const flag = await this.noteFlagsRepository.findOneByOrFail({ id: flagId });
		const note = await this.notesRepository.findOneByOrFail({ id: targetId });
		const existing = await this.noteFlagAssignmentsRepository.findOneBy({ flagId: flagId, noteId: targetId });
		if (!existing) {
			throw new NoteModerationService.FlagNotAssignedError();
		}
		await this.noteFlagAssignmentsRepository.delete(existing.id);
		this.globalEventService.publishInternalEvent('noteFlagUnassigned', existing);
		if (moderator) {
			this.moderationLogService.log(moderator, 'unassignNoteFlag', {
				flagId: flagId,
				flagName: flag.name,
				noteId: targetId,
				note: note,
				noteUserId: note.userId,
				noteUserHost: note.userHost,
			});
		}
	}

	@bindThis
	public checkProhibitedWordsContain(content: Parameters<UtilityService['concatNoteContentsForKeyWordCheck']>[0]) {
		return this.utilityService.isMatchKeywords(this.utilityService.concatNoteContentsForKeyWordCheck(content), this.prohibitedWords, 'included');
	}

	@bindThis
	public checkSensitiveWordsContain(content: string) {
		return this.utilityService.isMatchKeywords(content, this.sensitiveWords, 'included');
	}

	@bindThis
	public evalProhibitedNoteExpr(subject: InspectionSubject): boolean { return this.evalNoteExpr(subject, this.prohibitedNoteExpr); }

	@bindThis
	public evalSensitiveNoteExpr(subject: InspectionSubject): boolean { return this.evalNoteExpr(subject, this.sensitiveNoteExpr); }

	@bindThis
	private evalNoteExpr(subject: InspectionSubject, expr: LCFAST[]): boolean {
		if (expr.length <= 0) return false;
		try {
			return LCFExpression.toBoolean(expr.map(i => LCFExpression.compile(i, { throwOnTypeError: false, predicateDefs: NoteModerationService.lcfPredicates })).some(e => e({
				...subject,
				reply: subject.reply ? { ...subject.reply } as LCFExpressionRecordType : null,
				renote: subject.renote ? { ...subject.renote } as LCFExpressionRecordType : null,
				files: subject.files ? subject.files.map(o => ({ ...o } as LCFExpressionRecordType)) : null,
				roles: subject.roles.map(o => ({ ...o, lastUsedAt: o.lastUsedAt.valueOf(), updatedAt: o.updatedAt.valueOf() } as LCFExpressionRecordType)),
				flags: subject.flags.map(o => ({ ...o, updatedAt: o.updatedAt.valueOf() } as LCFExpressionRecordType)),
			})));
		} catch (_err) {
			return false;
		}
	}

	// ![deplecated feature]: あとでけす
	@bindThis
	public isProhibitedNote(subject: InspectionSubject): boolean {
		const formula = this.meta.prohibitedNotePattern;
		if (formula.type) {
			const bhash = subject.files?.filter(v => v.blurhash != null).map(v => { try { return decode(v.blurhash ?? '', 5, 5); } catch (e) { return null; } }).filter(v => v != null).map(v => v as Uint8ClampedArray) ?? [];
			return this.evalcond(subject, bhash, formula);
		} else {
			return false;
		}
	}

	// ![deplecated feature]: あとでけす
	@bindThis
	private evalcond(subject: InspectionSubject, blurhashes: Uint8ClampedArray[], formula: ProhibitedNoteFormulaValue): boolean {
		try {
			switch (formula.type) {
				case 'true': {
					return true;
				}
				case 'false': {
					return false;
				}
				case 'and': {
					return formula.values.every(v => this.evalcond(subject, blurhashes, v));
				}
				case 'or': {
					return formula.values.some(v => this.evalcond(subject, blurhashes, v));
				}
				case 'not': {
					return !this.evalcond(subject, blurhashes, formula.value);
				}
				case 'roleAssignedTo': {
					return subject.roles.some(r => r.id === formula.roleId);
				}
				case 'hasText': {
					return subject.text != null;
				}
				case 'textMatchOf': {
					return this.utilityService.isKeyWordIncluded(subject.text ?? '', Array.isArray(formula.pattern) ? formula.pattern : [formula.pattern]);
				}
				case 'hasMentions': {
					return subject.reply ? true : subject.mentions.length > 0;
				}
				case 'mentionCountIs': {
					return (subject.mentions.length) === formula.value;
				}
				case 'mentionCountMoreThanOrEq': {
					return (subject.mentions.length) >= formula.value;
				}
				case 'mentionCountLessThan': {
					return (subject.mentions.length) < formula.value;
				}
				case 'isReply': {
					return subject.reply != null;
				}
				case 'isQuoted': {
					return subject.renote != null;
				}
				case 'hasFiles': {
					return subject.files ? subject.files.length > 0 : false;
				}
				case 'fileCountIs': {
					return (subject.files ? subject.files.length : 0) === formula.value;
				}
				case 'fileCountMoreThanOrEq': {
					return (subject.files ? subject.files.length : 0) >= formula.value;
				}
				case 'fileCountLessThan': {
					return (subject.files ? subject.files.length : 0) < formula.value;
				}
				case 'fileTotalSizeMoreThanOrEq': {
					return (subject.files?.reduce((p, f) => p + f.size, 0) ?? 0) >= formula.size;
				}
				case 'fileTotalSizeLessThan': {
					return (subject.files?.reduce((p, f) => p + f.size, 0) ?? 0) < formula.size;
				}
				case 'hasFileSizeMoreThanOrEq': {
					return subject.files?.some(f => f.size >= formula.size) ?? false;
				}
				case 'hasFileSizeLessThan': {
					return subject.files?.some(f => f.size < formula.size) ?? true;
				}
				case 'hasFileMD5Is': {
					return subject.files?.some(f => f.md5 === formula.hash) ?? false;
				}
				case 'hasBrowserInsafe': {
					return subject.files?.some(f => !FILE_TYPE_BROWSERSAFE.some(t => f.type === t)) ?? false;
				}
				case 'hasPictures': {
					return subject.files?.some(f => f.type.startsWith('image/')) ?? false;
				}
				case 'hasLikelyBlurhash': {
					try {
						const k = decode(formula.hash, 5, 5);
						return blurhashes.some(h => h.reduce((v, j, n) => v + (j >= k[n] ? j - k[n] : k[n] - j), 0) <= formula.diff);
					} catch (e) {
						return false;
					}
				}
				case 'hasHashtags': {
					return subject.tags.length > 0;
				}
				case 'hashtagCountIs': {
					return (subject.tags.length) === formula.value;
				}
				case 'hashtagCountMoreThanOrEq': {
					return (subject.tags.length) >= formula.value;
				}
				case 'hashtagCountLessThan': {
					return (subject.tags.length) < formula.value;
				}
				case 'hasHashtagMatchOf': {
					return (subject.tags).some(h => this.utilityService.isKeyWordIncluded(h, Array.isArray(formula.pattern) ? formula.pattern : [formula.pattern]));
				}
				default:
					return false;
			}
		} catch (err) {
			// TODO: log error
			return false;
		}
	}

	@bindThis
	private updateProhibitedWords(value: string[] = this.meta.prohibitedWords) {
		this.prohibitedWords = value.filter(i => !i.startsWith('$'));
		this.prohibitedNoteExpr = value.filter(i => i.startsWith('$')).map(i => {
			try {
				return LCFExpression.parse(i.substring(1));
			} catch (_) {
				return undefined;
			}
		}).filter(i => i !== undefined);
	}

	@bindThis
	private updateSensitiveWords(value: string[] = this.meta.sensitiveWords) {
		this.sensitiveWords = value.filter(i => !i.startsWith('$'));
		this.sensitiveNoteExpr = value.filter(i => i.startsWith('$')).map(i => {
			try {
				return LCFExpression.parse(i.substring(1));
			} catch (_) {
				return undefined;
			}
		}).filter(i => i !== undefined);
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onMessage);
		this.noteFlagAssignmentsByNoteCache.dispose();
	}

	@bindThis
	public onApplicationShutdown(_signal?: string | undefined): void {
		this.dispose();
	}
}
