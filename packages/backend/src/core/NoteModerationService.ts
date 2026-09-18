/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { decode } from 'blurhash';
import { LCFAST, LCFExpression, LCFExpressionRecordType, LCFExpressionValueType, LCFPredicateDefinitionList, defaultPredicateLib } from '@geoplanetary/lcf-expression';
import Redis from 'ioredis';
import { MiNote } from '@/models/Note.js';
import { MiDriveFile } from '@/models/DriveFile.js';
import { bindThis } from '@/decorators.js';
import type { ProhibitedNoteFormulaValue } from '@/models/ProhibitedNoteFormula.js';
import { MiUser } from '@/models/User.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { MiRole } from '@/models/Role.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import { UtilityService } from './UtilityService.js';
import { GlobalEvents } from './GlobalEventService.js';

type InspectionSubject = {
	userId: MiUser['id'];
	text: string | null;
	reply: MiNote | null;
	renote: MiNote | null;
	files: MiDriveFile[] | null;
	mentions: { username: string; host: string | null; }[];
	tags: string[];
	roles: MiRole[];
};

@Injectable()
export class NoteModerationService {
	private prohibitedWords: string[];
	private prohibitedNoteExpr: LCFAST[];
	private sensitiveWords: string[];
	private sensitiveNoteExpr: LCFAST[];

	constructor(
		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.meta)
		private meta: MiMeta,

		private utilityService: UtilityService,
	) {
		this.updateProhibitedWords();
		this.updateSensitiveWords();
		this.redisForSub.on('message', this.onMessage);
	}

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

	@bindThis
	private async onMessage(_host: string, data: string): Promise<void> {
		const obj = JSON.parse(data) as { [K in keyof GlobalEvents]: { channel: GlobalEvents[K]['name'], message: GlobalEvents[K]['payload'] } }[keyof GlobalEvents];
		if (obj.channel === 'internal' && obj.message.type === 'metaUpdated') {
			const { body } = obj.message;
			this.updateProhibitedWords(body.after.prohibitedWords);
			this.updateSensitiveWords(body.after.sensitiveWords);
		}
	};

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
				files: subject.files ? subject.files.map(o => { return { ...o } as LCFExpressionRecordType; }) : null,
				roles: subject.roles.map(o => { return { ...o, lastUsedAt: o.lastUsedAt.valueOf(), updatedAt: o.updatedAt.valueOf() } as LCFExpressionRecordType; }),
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
}
