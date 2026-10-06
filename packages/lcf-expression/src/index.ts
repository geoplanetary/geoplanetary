/**
 * LCFのトークン
 */
export type LCFToken =
	{ type: 'dot' | 'comma' | 'gt' | 'equal' | 'true' | 'false' | 'null' } |
	{ type: 'bracket_wave' | 'bracket_angle' | 'bracket_circle', direction: 'left' | 'right' } |
	{ type: 'member_access' | 'call_predicate', key: string } |
	{ type: 'ident' | 'str_literal', content: string } |
	{ type: 'num_literal', content: number } |
	{ type: 'regexp_literal', content: string, flags: string };

/**
 * 階層情報付きのLCFトークン
 */
export type LeveledLCFToken = LCFToken & { level: number };

/**
 * null リテラル値を表す式
 */
export type LCFNullLiteralExpression = { type: 'null', value: null };

/**
 * boolean 型リテラル値を表す式
 */
export type LCFBooleanLiteralExpression = { type: 'boolean', value: boolean };

/**
 * number 型リテラル値を表す式
 */
export type LCFNumberLiteralExpression = { type: 'number', value: number };

/**
 * string 型リテラル値を表す式
 */
export type LCFStringLiteralExpression = { type: 'string', value: string };

/**
 * RegExp 型リテラル値を表す式
 */
export type LCFRegExpLiteralExpression = { type: 'regexp', value: string, flags: string };

/**
 * LCF で用いられるリテラル値を表す式
 */
export type LCFLiteralExpression = LCFNullLiteralExpression | LCFBooleanLiteralExpression | LCFNumberLiteralExpression | LCFStringLiteralExpression | LCFRegExpLiteralExpression;

/**
 * 現在のコンテキストそのものを表す式
 */
export type LCFIdenticalExpression = { type: 'identical' };

/**
 * メンバアクセスを表す式
 */
export type LCFMemberAccessExpression = { type: 'member_access', key: string };

/**
 * インデックスアクセスを表す式
 */
export type LCFIndexAccessExpression = { type: 'index_access', key: LCFAST };

/**
 * プレディケートを表す式
 */
export type LCFPredicateExpression = { type: 'predicate', key: string, args: LCFAST[] };

/**
 * Array 型リテラル値を表す式
 */
export type LCFArrayExpression = { type: 'array', value: LCFAST[] };

/**
 * Record 型リテラル値を表す式
 */
export type LCFRecordsExpression = { type: 'records', value: [string, LCFAST][] };

/**
 * LCF で用いられる式
 */
export type LCFASTElement = LCFLiteralExpression | LCFIdenticalExpression | LCFMemberAccessExpression | LCFIndexAccessExpression | LCFArrayExpression | LCFRecordsExpression | LCFPredicateExpression;

/**
 * LCF 式の構文ツリー
 */
export type LCFAST = LCFASTElement[];

/**
 * LCF で扱うプリミティブ型
 */
export type LCFExpressionPrimitiveType = string | number | boolean | null;

/**
 * LCF レコード型
 */
export type LCFExpressionRecordType = { [k in string]?: LCFExpressionValueType };

/**
 * LCF 配列型
 */
export type LCFExpressionArrayType = LCFExpressionValueType[];

/**
 * LCF で扱うことができる値型
 */
export type LCFExpressionValueType = LCFExpressionPrimitiveType | RegExp | LCFExpressionRecordType | LCFExpressionArrayType;

/**
 * LCF プレディケートの定義
 */
export type LCFPredicateDefinition = (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean) => LCFExpressionValueType;

/**
 * LCF プレディケートの定義リスト
 */
export type LCFPredicateDefinitionList = { [k in string]?: LCFPredicateDefinition };

/**
 * 既定の LCF プレディケート定義
 */
export const defaultPredicateLib: LCFPredicateDefinitionList = {
	type: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 0: return LCFExpression.typestr(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	to_bool: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 0: return LCFExpression.toBoolean(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	size: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 0: return LCFExpression.size(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	empty: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 0: return LCFExpression.size(input) === 0;
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	not: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 0: return !LCFExpression.toBoolean(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	negation: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(v: LCFExpressionValueType) {
			if (LCFExpression.isBoolean(v)) return !v;
			if (LCFExpression.isNumber(v)) return -v;
			else return null;
		}

		switch (args.length) {
			case 0: return f(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	add: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 1: return LCFExpression.add(input, args[0](input));
			case 2: return LCFExpression.add(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	sub: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(left: LCFExpressionValueType, right: LCFExpressionValueType) {
			if (LCFExpression.isBoolean(left) && LCFExpression.isBoolean(right)) return (left || right) && (!left || !right);
			if (LCFExpression.isNumber(left) && LCFExpression.isNumber(right)) return left - right;
			if (LCFExpression.isString(left) && LCFExpression.isString(right)) return left.endsWith(right) ? left.substring(0, left.length - right.length) : left;
			if (LCFExpression.isRecord(left) && LCFExpression.isRecord(right)) {
				const rk = Object.keys(right);
				return Object.fromEntries(Object.entries(left).filter(v => !rk.includes(v[0])));
			} else return null;
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	mul: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(left: LCFExpressionValueType, right: LCFExpressionValueType) {
			if (LCFExpression.isBoolean(left) && LCFExpression.isBoolean(right)) return left && right;
			if (LCFExpression.isNumber(left) && LCFExpression.isNumber(right)) return left * right;
			if (LCFExpression.isString(left) && LCFExpression.isNumber(right)) return left.repeat(right);
			else return null;
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	div: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(left: LCFExpressionValueType, right: LCFExpressionValueType) {
			if (LCFExpression.isNumber(left) && LCFExpression.isNumber(right)) return left / right;
			else return null;
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	equals: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 1: return LCFExpression.compare(input, args[0](input)) === 'equivalent';
			case 2: return LCFExpression.compare(args[0](input), args[1](input)) === 'equivalent';
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	lt: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 1: return LCFExpression.compare(input, args[0](input)) === 'less';
			case 2: return LCFExpression.compare(args[0](input), args[1](input)) === 'less';
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	gt: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		switch (args.length) {
			case 1: return LCFExpression.compare(input, args[0](input)) === 'greater';
			case 2: return LCFExpression.compare(args[0](input), args[1](input)) === 'greater';
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	leq: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(left: LCFExpressionValueType, right: LCFExpressionValueType) {
			const c = LCFExpression.compare(left, right);
			return c === 'equivalent' || c === 'less';
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	geq: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(left: LCFExpressionValueType, right: LCFExpressionValueType) {
			const c = LCFExpression.compare(left, right);
			return c === 'equivalent' || c === 'greater';
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	match: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(input: LCFExpressionValueType, pattern: LCFExpressionValueType) {
			switch (true) {
				case LCFExpression.isArray(pattern): {
					if (LCFExpression.isArray(input) && pattern.length > 0) {
						for (let i = 0; (i + pattern.length - 1) < input.length; ++i) { if (LCFExpression.compare(input[i], pattern[0]) === 'equivalent' && LCFExpression.compare(input.slice(i, i + pattern.length), pattern) === 'equivalent') return true; }
						return false;
					} else return false;
				}
				case LCFExpression.isRegExp(pattern): {
					if (LCFExpression.isPrimitive(input) && !LCFExpression.isNull(input)) return pattern.test(String(input));
					else return false;
				}
				case LCFExpression.isString(pattern): {
					if (LCFExpression.isPrimitive(input) && !LCFExpression.isNull(input)) return String(input).includes(pattern);
					else return false;
				}
				default: {
					if (throwTypeError) throw Error(`pattern expected array, regexp, or string, but given ${LCFExpression.typestr(pattern)}.`); else return null;
				}
			}
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	some: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(array: LCFExpressionValueType, pred: (input: LCFExpressionValueType) => LCFExpressionValueType) {
			if (LCFExpression.isArray(array)) return array.some((v) => LCFExpression.toBoolean(pred(v)));
			else return null;
		}

		switch (args.length) {
			case 0: return f(input, (o) => o);
			case 1: return f(input, args[0]);
			case 2: return f(args[0](input), args[1]);
			default: if (throwTypeError) throw Error(`0 to 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	every: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(array: LCFExpressionValueType, pred: (input: LCFExpressionValueType) => LCFExpressionValueType) {
			if (LCFExpression.isArray(array)) return array.every((v) => LCFExpression.toBoolean(pred(v)));
			else return null;
		}

		switch (args.length) {
			case 0: return f(input, (o) => o);
			case 1: return f(input, args[0]);
			case 2: return f(args[0](input), args[1]);
			default: if (throwTypeError) throw Error(`0 to 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	map: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(array: LCFExpressionValueType, pred: (input: LCFExpressionValueType) => LCFExpressionValueType) {
			if (LCFExpression.isArray(array)) return array.map(pred);
			else return null;
		}

		switch (args.length) {
			case 1: return f(input, args[0]);
			case 2: return f(args[0](input), args[1]);
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	filter: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(array: LCFExpressionValueType, pred: (input: LCFExpressionValueType) => LCFExpressionValueType) {
			if (LCFExpression.isArray(array)) return array.filter(v => LCFExpression.toBoolean(pred(v)));
			else return null;
		}

		switch (args.length) {
			case 1: return f(input, args[0]);
			case 2: return f(args[0](input), args[1]);
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
	accumulate: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(array: LCFExpressionValueType) {
			if (LCFExpression.isArray(array) && array.length > 0) return array.reduce((pv, cv) => LCFExpression.add(pv, cv));
			else return null;
		}

		switch (args.length) {
			case 0: return f(input);
			default: if (throwTypeError) throw Error(`0 args expected, but given ${args.length} args.`); else return null;
		}
	},
	has: (input: LCFExpressionValueType, args: ((input: LCFExpressionValueType) => LCFExpressionValueType)[], throwTypeError: boolean): LCFExpressionValueType => {
		function f(v: LCFExpressionValueType, key: LCFExpressionValueType) {
			if (LCFExpression.isArray(v) && LCFExpression.isNumber(key)) return v.at(key) !== undefined;
			if (LCFExpression.isRecord(v) && LCFExpression.isString(key)) return v[key] !== undefined;
			if (LCFExpression.isRecord(v) && LCFExpression.isRegExp(key)) return Object.keys(v).find(i => key.test(i)) !== undefined;
			return false;
		}

		switch (args.length) {
			case 1: return f(input, args[0](input));
			case 2: return f(args[0](input), args[1](input));
			default: if (throwTypeError) throw Error(`1 or 2 args expected, but given ${args.length} args.`); else return null;
		}
	},
};

type OptionalRecord<O extends object> = { [k in keyof O]?: O[k]; };

/**
 * LCF コンパイル時のオプション
 */
export type LCFExpressionCompilerOptions = { throwOnTypeError: boolean, predicateDefs: LCFPredicateDefinitionList };

/**
 * LCF コンパイル時オプションのデフォルト値
 */
export const compilerDefaults: LCFExpressionCompilerOptions = { throwOnTypeError: true, predicateDefs: defaultPredicateLib };

/**
 * LCF コンパイラ
 */
export interface LCFExpressionCompiler {
	readonly throwOnTypeError: boolean;
	readonly predicateDefs: LCFPredicateDefinitionList;
	toknize(expr: string): Iterable<LeveledLCFToken>;
	parse(expr: string): LCFAST;
	parse(tokens: Iterable<LeveledLCFToken> | Iterator<LeveledLCFToken>): LCFAST;
	compile(ast: LCFAST): (input: LCFExpressionValueType) => LCFExpressionValueType;
};

/**
 * CSSセレクタに近い記法でオブジェクトへの操作を記述する軽量言語 LCF(Lightweight Context Filter) の言語実装
 */
interface LCFExpressionConstructor {
	/**
	 * 式文字列からのコンパイルを実行します
	 */
	(expr: string, options?: OptionalRecord<LCFExpressionCompilerOptions>): (input: LCFExpressionValueType) => LCFExpressionValueType;

	/**
	 * 式構文ツリーオブジェクトからコンパイルを実行します
	 */
	(ast: LCFAST, options?: OptionalRecord<LCFExpressionCompilerOptions>): (input: LCFExpressionValueType) => LCFExpressionValueType;

	/**
	 * コンパイラを構築します
	 */
	new(options?: OptionalRecord<LCFExpressionCompilerOptions>): LCFExpressionCompiler;

	/**
	 * 文字列をトークンとして列挙します
	 */
	toknize(expr: string): Iterable<LeveledLCFToken>;

	/**
	 * 文字列から構文ツリーを構築します
	 */
	parse(expr: string): LCFAST;

	/**
	 * トークン列から構文ツリーを構築します
	 */
	parse(tokens: Iterable<LeveledLCFToken> | Iterator<LeveledLCFToken>): LCFAST;

	/**
	 * 構文ツリーから式を実行する関数オブジェクトを構築します
	 */
	compile(ast: LCFAST, options?: OptionalRecord<LCFExpressionCompilerOptions>): (input: LCFExpressionValueType) => LCFExpressionValueType;

	/**
	 * LCF の値型の種類を表す文字列を取得します
	 */
	typestr(o: LCFExpressionValueType): 'null' | 'boolean' | 'number' | 'string' | 'regexp' | 'array' | 'record';

	/**
	 * 値が null を保持するか検査します
	 */
	isNull(o: LCFExpressionValueType): o is null;

	/**
	 * 値が boolean を保持するか検査します
	 */
	isBoolean(o: LCFExpressionValueType): o is boolean;

	/**
	 * 値が number を保持するか検査します
	 */
	isNumber(o: LCFExpressionValueType): o is number;

	/**
	 * 値が string を保持するか検査します
	 */
	isString(o: LCFExpressionValueType): o is string;

	/**
	 * 値が RegExp を保持するか検査します
	 */
	isRegExp(o: LCFExpressionValueType): o is RegExp;

	/**
	 * 値が null、boolean、number、string のいずれかを保持するか検査します
	 */
	isPrimitive(o: LCFExpressionValueType): o is LCFExpressionPrimitiveType;

	/**
	 * 値がLCF値型の配列を保持するか検査します
	 */
	isArray(o: LCFExpressionValueType): o is LCFExpressionArrayType;

	/**
	 * 値がLCF値型を値に持つオブジェクトを保持するか検査します
	 */
	isRecord(o: LCFExpressionValueType): o is LCFExpressionRecordType;

	/**
	 * 値を boolean に変換します
	 */
	toBoolean(o: LCFExpressionValueType): boolean;

	/**
	 * 値の要素数を取得します
	 */
	size(o: LCFExpressionValueType): number;

	/**
	 * 値の順序比較をします
	 */
	compare(left: LCFExpressionValueType, right: LCFExpressionValueType): 'equivalent' | 'less' | 'greater' | 'unordered';

	/**
	 * 値の加算を行います
	 */
	add(left: LCFExpressionValueType, right: LCFExpressionValueType): LCFExpressionValueType;
};

/**
 * CSSセレクタに近い記法でオブジェクトへの操作を記述する軽量言語 LCF(Lightweight Context Filter) の言語実装
 */
export const LCFExpression = (() => {
	function constructor(this: LCFExpressionCompiler, arg0: unknown, arg1: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (new.target !== undefined) {
			Object.defineProperty(this, 'throwOnTypeError', { enumerable: true, value: (arg0 as (OptionalRecord<LCFExpressionCompilerOptions> | undefined))?.throwOnTypeError ?? compilerDefaults.throwOnTypeError, writable: false });
			Object.defineProperty(this, 'predicateDefs', { enumerable: true, value: (arg0 as (OptionalRecord<LCFExpressionCompilerOptions> | undefined))?.predicateDefs ?? compilerDefaults.predicateDefs, writable: false });
			return this;
		} else if (typeof arg0 === 'string') {
			return compile(parse(toknize(arg0)), arg1 as (OptionalRecord<LCFExpressionCompilerOptions> | undefined));
		} else {
			return compile(arg0 as LCFAST, arg1 as (OptionalRecord<LCFExpressionCompilerOptions> | undefined));
		}
	}

	Object.defineProperties(constructor.prototype, {
		toknize: { enumerable: true, value: toknize, writable: false },
		parse: { enumerable: true, value: parse, writable: false },
		compile: { enumerable: true, value: function (this: LCFExpressionCompiler, ast: LCFAST) { return compile(ast, { throwOnTypeError: this.throwOnTypeError, predicateDefs: this.predicateDefs }); }, writable: false },
	});

	const whitespaceCharset = new Set([' ', '\t', '\n']);
	const numberHeadCharset = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '-', '+']);
	const numberCharset = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.']);
	const identHeadCharset = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_']);
	const identCharset = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '_']);

	function toknize(expr: string): Iterable<LeveledLCFToken> {
		function findNotIn(s: string, set: Set<string>, position: number, transform = (c: string) => c) {
			let pos = position;
			for (; ;) {
				const c = s.at(pos);
				if (c === undefined) { return s.length; }
				if (!set.has(transform(c))) { return pos; }
				pos += 1;
			}
		}

		function findCloseQuot(s: string, position: number) {
			let p = position;
			for (; ;) {
				const q = s.indexOf('"', p);
				if (q === -1) return -1;
				const eq = s.indexOf('\\"', p);
				if (eq === -1 || q < eq) return q;
				p = eq + 2;
			}
		}

		function findCloseRegex(s: string, position: number) {
			let p = position;
			for (; ;) {
				const q = s.indexOf('/', p);
				if (q === -1) return -1;
				const eq = s.indexOf('\\/', p);
				if (eq === -1 || q < eq) return q;
				p = eq + 2;
			}
		}

		return {
			[Symbol.iterator](): Iterator<LeveledLCFToken> {
				let pos = 0;
				const stack: LeveledLCFToken['type'][] = [];
				const level = () => stack.length;
				const startsWith = (s: string, pos: number) => {
					const n = s.length;
					for (let i = 0; i < n; ++i) if (expr.at(pos + i) !== s[i]) return false;
					return true;
				};
				const next = (): IteratorResult<LeveledLCFToken> => {
					pos = findNotIn(expr, whitespaceCharset, pos);
					const c = expr.at(pos);
					const si = pos;
					if (c === undefined && level() === 0) return { done: true, value: undefined };
					if (c === undefined) throw Error('Parse error as context filter expression. Unexpected EOF in non-root context.');
					pos += 1;
					switch (true) {
						case startsWith('true', si): {
							pos = si + 4;
							return { done: false, value: { type: 'true', level: level() } };
						}
						case startsWith('false', si): {
							pos = si + 5;
							return { done: false, value: { type: 'false', level: level() } };
						}
						case startsWith('null', si): {
							pos = si + 4;
							return { done: false, value: { type: 'null', level: level() } };
						}
						case startsWith('NaN', si): {
							pos = si + 3;
							return { done: false, value: { type: 'num_literal', content: NaN, level: level() } };
						}
						case startsWith('+inf', si): {
							pos = si + 4;
							return { done: false, value: { type: 'num_literal', content: Infinity, level: level() } };
						}
						case startsWith('-inf', si): {
							pos = si + 4;
							return { done: false, value: { type: 'num_literal', content: -Infinity, level: level() } };
						}
						case startsWith('inf', si): {
							pos = si + 3;
							return { done: false, value: { type: 'num_literal', content: Infinity, level: level() } };
						}
						case c === '[': {
							stack.push('bracket_angle');
							return { done: false, value: { type: 'bracket_angle', direction: 'left', level: level() - 1 } };
						}
						case c === '{': {
							stack.push('bracket_wave');
							return { done: false, value: { type: 'bracket_wave', direction: 'left', level: level() - 1 } };
						}
						case c === '(': {
							stack.push('bracket_circle');
							return { done: false, value: { type: 'bracket_circle', direction: 'left', level: level() - 1 } };
						}
						case c === ']': {
							const bb = stack.pop();
							if (bb === undefined) throw Error('Parse error as context filter expression. Unexpected closing bracket in root context.');
							if (bb !== 'bracket_angle') throw Error(`Parse error as context filter expression. Expect closing ${bb}, found bracket_angle.`);
							return { done: false, value: { type: 'bracket_angle', direction: 'right', level: level() } };
						}
						case c === '}': {
							const bb = stack.pop();
							if (bb === undefined) throw Error('Parse error as context filter expression. Unexpected closing bracket in root context.');
							if (bb !== 'bracket_wave') throw Error(`Parse error as context filter expression. Expect closing ${bb}, found bracket_wave.`);
							return { done: false, value: { type: 'bracket_wave', direction: 'right', level: level() } };
						}
						case c === ')': {
							const bb = stack.pop();
							if (bb === undefined) throw Error('Parse error as context filter expression. Unexpected closing bracket in root context.');
							if (bb !== 'bracket_circle') throw Error(`Parse error as context filter expression. Expect closing ${bb}, found bracket_circle.`);
							return { done: false, value: { type: 'bracket_circle', direction: 'right', level: level() } };
						}
						case c === '.': {
							const c2 = expr.at(si + 1);
							if (c2 && identHeadCharset.has(c2)) {
								const se = findNotIn(expr, identCharset, si + 1, (c) => c.toLowerCase());
								pos = se;
								return { done: false, value: { type: 'member_access', key: expr.substring(si + 1, se), level: level() } };
							} else if (c2 === '"') {
								const se = findCloseQuot(expr, si + 2);
								if (se === -1) throw Error('Parse error as context filter expression. Expected \'"\', but reached EOF.');
								pos = se + 1;
								return { done: false, value: { type: 'member_access', key: expr.substring(si + 2, se), level: level() } };
							} else {
								return { done: false, value: { type: 'dot', level: level() } };
							}
						}
						case c === ':': {
							const c2 = expr.at(si + 1);
							if (c2 && identHeadCharset.has(c2)) {
								const se = findNotIn(expr, identCharset, si + 2, (c) => c.toLowerCase());
								pos = se;
								return { done: false, value: { type: 'call_predicate', key: expr.substring(si + 1, se), level: level() } };
							} else {
								throw Error(`Parse error as context filter expression. Expected identifier, but found '${c2}'.`);
							}
						}
						case c === '>': { return { done: false, value: { type: 'gt', level: level() } }; }
						case c === ',': { return { done: false, value: { type: 'comma', level: level() } }; }
						case c === '=': { return { done: false, value: { type: 'equal', level: level() } }; }
						case c === '"': {
							const se = findCloseQuot(expr, si + 1);
							if (se === -1) throw Error('Parse error as context filter expression. Expected \'"\', but reached EOF.');
							pos = se + 1;
							return { done: false, value: { type: 'str_literal', content: expr.substring(si + 1, se).replaceAll('\\"', '"'), level: level() } };
						}
						case c === '/': {
							const se = findCloseRegex(expr, si + 1);
							if (se === -1) throw Error('Parse error as context filter expression. Expected \'/\', but reached EOF.');
							const fe = findNotIn(expr, identCharset, se + 1, c => c.toLowerCase());
							pos = fe;
							return { done: false, value: { type: 'regexp_literal', content: expr.substring(si + 1, se).replaceAll('\\/', '/'), flags: expr.substring(se + 1, fe), level: level() } };
						}
						case numberHeadCharset.has(c): {
							const se = findNotIn(expr, numberCharset, si + 1);
							pos = se;
							return { done: false, value: { type: 'num_literal', content: Number.parseFloat(expr.substring(si, se)), level: level() } };
						}
						case identHeadCharset.has(c.toLowerCase()): {
							const se = findNotIn(expr, identCharset, si + 1, c => c.toLowerCase());
							pos = se;
							return { done: false, value: { type: 'ident', content: expr.substring(si, se), level: level() } };
						}
						default: {
							throw new Error(`Parse error as context filter expression. Unexpected char "${c}". (in ${si})`);
						}
					}
				};
				return Iterator.from({ next });
			},
		};
	}

	type ParserBucketResult<TResult> = { done: false, value: undefined } | { done: true, value: TResult };
	interface ParserBucket<TInput, TResult> {
		next(input: TInput): ParserBucketResult<TResult>;
		finalize(): ParserBucketResult<TResult>;
		clear(): void;
	};

	function identicalBucket(): ParserBucket<LeveledLCFToken, [LCFIdenticalExpression, undefined]> {
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFIdenticalExpression, undefined]> => {
			if (t.type === 'dot') { return { done: true, value: [{ type: 'identical' }, undefined] }; };
			throw Error(`Unexpected token type for identical expression "${t.type}".`);
		};
		const finalize = (): ParserBucketResult<[LCFIdenticalExpression, undefined]> => { return { done: false, value: undefined }; };
		return { next, finalize, clear() { } };
	}

	function literalBucket(): ParserBucket<LeveledLCFToken, [LCFLiteralExpression, undefined]> {
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFLiteralExpression, undefined]> => {
			switch (t.type) {
				case 'true': { return { done: true, value: [{ type: 'boolean', value: true }, undefined] }; }
				case 'false': { return { done: true, value: [{ type: 'boolean', value: false }, undefined] }; }
				case 'null': { return { done: true, value: [{ type: 'null', value: null }, undefined] }; }
				case 'str_literal': { return { done: true, value: [{ type: 'string', value: t.content }, undefined] }; }
				case 'num_literal': { return { done: true, value: [{ type: 'number', value: t.content }, undefined] }; }
				case 'regexp_literal': { return { done: true, value: [{ type: 'regexp', value: t.content, flags: t.flags }, undefined] }; }
				default: { throw Error(`Unexpected token type for literal expression "${t.type}".`); }
			}
		};
		const finalize = (): ParserBucketResult<[LCFLiteralExpression, undefined]> => { return { done: false, value: undefined }; };
		return { next, finalize, clear() { } };
	}

	function memberAccessBucket(): ParserBucket<LeveledLCFToken, [LCFMemberAccessExpression, undefined]> {
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFMemberAccessExpression, undefined]> => {
			if (t.type === 'member_access') {
				return { done: true, value: [{ type: 'member_access', key: t.key }, undefined] };
			} else if (t.type === 'ident') {
				return { done: true, value: [{ type: 'member_access', key: t.content }, undefined] };
			} else {
				throw Error(`Unexpected token type for member access expression "${t.type}".`);
			}
		};
		const finalize = (): ParserBucketResult<[LCFMemberAccessExpression, undefined]> => { return { done: false, value: undefined }; };
		return { next, finalize, clear() { } };
	}

	function indexAccessBucket(): ParserBucket<LeveledLCFToken, [LCFIndexAccessExpression, undefined]> {
		let dotted = false;
		let resultValue: LCFAST | undefined = undefined;
		let depth: number | undefined = undefined;
		const subBucket = astBucket();
		const clear = (): void => {
			dotted = false;
			resultValue = undefined;
			depth = undefined;
			subBucket.clear();
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFIndexAccessExpression, undefined]> => {
			if (depth === undefined && t.type === 'bracket_angle' && t.direction === 'left') {
				depth = t.level;
				return { done: false, value: undefined };
			} else if (depth === undefined && !dotted && t.type === 'dot') {
				dotted = true;
				return { done: false, value: undefined };
			} else if (depth === undefined) {
				throw Error(`Expected left angle bracket, but saw ${t.type}`);
			} else if (t.type === 'bracket_angle' && t.direction === 'right' && t.level === depth) {
				const el = subBucket.finalize();
				if (el.done && resultValue === undefined) resultValue = el.value;
				else if (el.done) throw Error('Inner parser of index-access expression returns multiple tree.');
				if (resultValue === undefined) throw Error('Found index-access expression terminator, but inner parser returns nothing.');
				const r = resultValue;
				clear();
				return { done: true, value: [{ type: 'index_access', key: r }, undefined] };
			} else if (t.type === 'comma' && t.level === (depth + 1)) {
				throw Error('Unexpected comma.');
			} else if (resultValue !== undefined) {
				throw Error(`Expected right angle bracket, but saw ${t.type}`);
			} else if (t.level > depth) {
				const el = subBucket.next(t);
				if (el.done) {
					resultValue = el.value;
					subBucket.clear();
				}
				return { done: false, value: undefined };
			} else {
				throw Error(`Unexpected token ${t.type}`);
			}
		};
		const finalize = (): ParserBucketResult<[LCFIndexAccessExpression, undefined]> => {
			if (depth === undefined && !dotted) {
				return { done: false, value: undefined };
			} else {
				throw Error('Expected right angle bracket, but saw EOF');
			}
		};
		return { next, finalize, clear };
	}

	function predicateBucket(): ParserBucket<LeveledLCFToken, [LCFPredicateExpression, LeveledLCFToken | undefined]> {
		let resultValue: LCFAST[] = [];
		let ident: string | undefined;
		let depth: number | undefined = undefined;
		const subBucket = astBucket();
		const clear = (): void => {
			resultValue = [];
			ident = undefined;
			depth = undefined;
			subBucket.clear();
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFPredicateExpression, LeveledLCFToken | undefined]> => {
			if (ident === undefined && t.type === 'call_predicate') {
				ident = t.key;
				return { done: false, value: undefined };
			} else if (ident === undefined) {
				throw Error(`Expected predicate call token, but saw ${t.type}.`);
			} else if (depth === undefined && t.type === 'bracket_circle' && t.direction === 'left') {
				depth = t.level;
				return { done: false, value: undefined };
			} else if (depth === undefined) {
				const ri = ident;
				clear();
				return { done: true, value: [{ type: 'predicate', key: ri, args: [] }, t] };
			} else if (t.type === 'bracket_circle' && t.direction === 'right' && t.level === depth) {
				const el = subBucket.finalize();
				if (el.done) resultValue.push(el.value);
				const ri = ident;
				const ra = resultValue;
				clear();
				return { done: true, value: [{ type: 'predicate', key: ri, args: ra }, undefined] };
			} else if (t.type === 'comma' && t.level === (depth + 1)) {
				const el = subBucket.finalize();
				if (el.done) resultValue.push(el.value);
				subBucket.clear();
				return { done: false, value: undefined };
			} else if (t.level > depth) {
				const el = subBucket.next(t);
				if (el.done) {
					resultValue.push(el.value);
					subBucket.clear();
				}
				return { done: false, value: undefined };
			} else {
				throw Error(`Unexpected token ${t.type}`);
			}
		};
		const finalize = (): ParserBucketResult<[LCFPredicateExpression, LeveledLCFToken | undefined]> => {
			if (ident === undefined) {
				clear();
				return { done: false, value: undefined };
			} else if (depth === undefined) {
				const ri = ident;
				clear();
				return { done: true, value: [{ type: 'predicate', key: ri, args: [] }, undefined] };
			} else {
				throw Error('Expected right circle bracket, but saw EOF');
			}
		};
		return { next, finalize, clear };
	}

	function arrayBucket(): ParserBucket<LeveledLCFToken, [LCFArrayExpression, undefined]> {
		let resultValue: LCFAST[] = [];
		let depth: number | undefined = undefined;
		const subBucket = astBucket();
		const clear = (): void => { };
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFArrayExpression, undefined]> => {
			if (depth === undefined && t.type === 'bracket_angle' && t.direction === 'left') {
				depth = t.level;
				return { done: false, value: undefined };
			} else if (depth === undefined) {
				throw Error(`Expected left angle bracket, but saw ${t.type}`);
			} else if (t.type === 'bracket_angle' && t.direction === 'right' && t.level === depth) {
				const el = subBucket.finalize();
				if (el.done) resultValue.push(el.value);
				const r = resultValue;
				resultValue = [];
				depth = undefined;
				subBucket.clear();
				return { done: true, value: [{ type: 'array', value: r }, undefined] };
			} else if (t.type === 'comma' && t.level === (depth + 1)) {
				const el = subBucket.finalize();
				if (el.done && el.value.length > 0) { resultValue.push(el.value); } else if (el.done) { throw Error('Empty expression not allowed.'); }
				subBucket.clear();
				return { done: false, value: undefined };
			} else if (t.level > depth) {
				const el = subBucket.next(t);
				if (el.done) {
					resultValue.push(el.value);
					subBucket.clear();
				}
				return { done: false, value: undefined };
			} else {
				throw Error(`Unexpected token ${t.type}`);
			}
		};
		const finalize = (): ParserBucketResult<[LCFArrayExpression, undefined]> => {
			if (depth === undefined) {
				return { done: false, value: undefined };
			} else {
				throw Error('Expected right angle bracket, but saw EOF');
			}
		};
		return { next, finalize, clear };
	}

	function recordsBucket(): ParserBucket<LeveledLCFToken, [LCFRecordsExpression, undefined]> {
		let resultValue: [string, LCFAST][] = [];
		let depth: number | undefined = undefined;
		let ident: string | undefined = undefined;
		let equal = false;
		const subBucket = astBucket();
		const clear = (): void => {
			resultValue = [];
			depth = undefined;
			ident = undefined;
			equal = false;
			subBucket.clear();
		};
		const pushValue = (el: LCFAST) => {
			if (ident === undefined) throw Error('Expected expression after ident.');
			if (!equal) throw Error('Expected equal before expression.');
			if (el.length <= 0) throw Error('Expected expression after ident.');
			resultValue.push([ident, el]);
			ident = undefined;
			equal = false;
			subBucket.clear();
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFRecordsExpression, undefined]> => {
			if (depth === undefined && t.type === 'bracket_wave' && t.direction === 'left') {
				depth = t.level;
				return { done: false, value: undefined };
			} else if (depth === undefined) {
				throw Error(`Expected left wave bracket, but saw ${t.type}`);
			} else if (t.type === 'bracket_wave' && t.direction === 'right' && t.level === depth) {
				const el = subBucket.finalize();
				if (el.done) pushValue(el.value);
				const r = resultValue;
				clear();
				return { done: true, value: [{ type: 'records', value: r }, undefined] };
			} else if (ident === undefined && (t.type === 'ident' || t.type === 'str_literal')) {
				ident = t.content;
				return { done: false, value: undefined };
			} else if (ident === undefined) {
				throw Error(`Expected ident or string literal, but saw ${t.type}`);
			} else if (!equal && t.type === 'equal') {
				equal = true;
				return { done: false, value: undefined };
			} else if (!equal) {
				throw Error(`Expected equal, but saw ${t.type}`);
			} else if (t.type === 'comma' && t.level === (depth + 1)) {
				const el = subBucket.finalize();
				if (el.done) pushValue(el.value);
				return { done: false, value: undefined };
			} else if (t.level > depth) {
				const el = subBucket.next(t);
				if (el.done) pushValue(el.value);
				return { done: false, value: undefined };
			} else {
				throw Error(`Unexpected token ${t.type}`);
			}
		};
		const finalize = (): ParserBucketResult<[LCFRecordsExpression, undefined]> => {
			if (depth === undefined) {
				clear();
				return { done: false, value: undefined };
			} else {
				throw Error('Expected right wave bracket, but saw EOF');
			}
		};
		return { next, finalize, clear };
	}

	function forwardBucket(): ParserBucket<LeveledLCFToken, [LCFASTElement, LeveledLCFToken | undefined]> {
		let forwarded = false;
		const subBucket = astElementBucket(undefined);
		const clear = (): void => {
			forwarded = false;
			subBucket.clear();
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFASTElement, LeveledLCFToken | undefined]> => {
			if (!forwarded && t.type === 'gt') {
				forwarded = true;
				return { done: false, value: undefined };
			}
			if (!forwarded) throw Error(`Expected gt, but saw ${t.type}`);
			const el = subBucket.next(t);
			if (el.done) {
				clear();
				return { done: true, value: el.value };
			}
			return { done: false, value: undefined };
		};
		const finalize = (): ParserBucketResult<[LCFASTElement, LeveledLCFToken | undefined]> => {
			if (!forwarded) return { done: false, value: undefined };
			const el = subBucket.finalize();
			if (!el.done) throw Error('Expected expression after gt.');
			clear();
			return { done: true, value: el.value };
		};
		return { next, finalize, clear };
	}

	function astElementBucket(lastElement: LCFASTElement | undefined): ParserBucket<LeveledLCFToken, [LCFASTElement, LeveledLCFToken | undefined]> {
		type State = { matched: true, value: ParserBucket<LeveledLCFToken, [LCFASTElement, LeveledLCFToken | undefined]> } | { matched: false, value: LeveledLCFToken[] };
		let state: State = { matched: false, value: [] };
		const pushTokenToState = (t: LeveledLCFToken | undefined): ParserBucket<LeveledLCFToken, [LCFASTElement, LeveledLCFToken | undefined]> | undefined => {
			if (state.matched) return undefined;
			if (t !== undefined) state.value.push(t);
			const n = state.value.length;
			if (n <= 0) return undefined;
			if (n > 2) throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
			switch (state.value[0].type) {
				case 'true':
				case 'false':
				case 'null':
				case 'str_literal':
				case 'num_literal':
				case 'regexp_literal': {
					if (lastElement === undefined) return literalBucket();
					else throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
				}
				case 'member_access': { return memberAccessBucket(); }
				case 'ident': {
					if (lastElement === undefined) return memberAccessBucket();
					else throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
				}
				case 'bracket_angle': {
					const allowedType = new Set<LCFASTElement['type']>(['array', 'index_access', 'member_access', 'predicate', 'records']);
					if (state.value[0].direction === 'right') throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
					if (lastElement === undefined) return arrayBucket();
					else if (allowedType.has(lastElement.type)) return indexAccessBucket();
					else throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
				}
				case 'dot': {
					const second = state.value.at(1);
					if (second === undefined && t === undefined) return identicalBucket();
					if (second === undefined && t !== undefined) return undefined;
					if (second?.type === 'bracket_angle' && second.direction === 'left') return indexAccessBucket();
					throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`);
				}
				case 'gt': {
					return forwardBucket();
				}
				case 'call_predicate': { return predicateBucket(); }
				case 'bracket_wave': { return recordsBucket(); }
				default: { throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}].`); }
			}
		};
		const clear = (): void => {
			state = { matched: false, value: [] };
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<[LCFASTElement, LeveledLCFToken | undefined]> => {
			if (state.matched) {
				const el = state.value.next(t);
				if (el.done) {
					clear();
					return { done: true, value: el.value };
				}
				return { done: false, value: undefined };
			} else {
				const sb = pushTokenToState(t);
				if (sb === undefined) return { done: false, value: undefined };
				for (; ;) {
					const bt = state.value.shift();
					if (bt === undefined) {
						state = { matched: true, value: sb };
						return { done: false, value: undefined };
					}
					const el = sb.next(bt);
					if (el.done && state.value.length <= 0) {
						if (sb.finalize().done) throw Error();
						return { done: true, value: el.value };
					}
					if (el.done) {
						throw Error('Invalid state');
					}
				}
			}
		};
		const finalize = (): ParserBucketResult<[LCFASTElement, LeveledLCFToken | undefined]> => {
			if (state.matched) {
				const v = state.value.finalize();
				clear();
				if (v.done) return { done: true, value: v.value };
				else return { done: false, value: undefined };
			} else if (state.value.length === 0) {
				return { done: false, value: undefined };
			} else {
				const sb = pushTokenToState(undefined);
				if (sb === undefined) throw Error(`Syntax error. No candidate syntax for token [${state.value.map(v => v.type).join(', ')}, EOF].`);
				for (; ;) {
					const bt = state.value.shift();
					if (bt === undefined) {
						const v = sb.finalize();
						clear();
						if (v.done) return { done: true, value: v.value };
						return { done: false, value: undefined };
					}
					const el = sb.next(bt);
					if (el.done && state.value.length <= 0) {
						if (sb.finalize().done) throw Error();
						clear();
						return { done: true, value: el.value };
					}
					if (el.done) {
						throw Error('Invalid state');
					}
				}
			}
		};
		return { next, finalize, clear };
	}

	function astBucket(): ParserBucket<LeveledLCFToken, LCFAST> {
		let resultValue: LCFASTElement[] = [];
		let bucket = astElementBucket(undefined);
		const clear = (): void => {
			resultValue = [];
			bucket = astElementBucket(undefined);
		};
		const next = (t: LeveledLCFToken): ParserBucketResult<LCFAST> => {
			const r1 = bucket.next(t);
			if (!r1.done) return { done: false, value: undefined };
			resultValue.push(r1.value[0]);
			bucket = astElementBucket(resultValue.at(-1));
			if (r1.value[1] === undefined) return { done: false, value: undefined };
			const r2 = bucket.next(r1.value[1]);
			if (!r2.done) return { done: false, value: undefined };
			bucket = astElementBucket(resultValue.at(-1));
			if (r2.value[1] !== undefined) throw Error('Illegal state');
			return { done: false, value: undefined };
		};
		const finalize = (): ParserBucketResult<LCFAST> => {
			const el = bucket.finalize();
			if (el.done) resultValue.push(el.value[0]);
			const r = resultValue;
			resultValue = [];
			bucket = astElementBucket(undefined);
			return { done: true, value: r };
		};
		return { next, finalize, clear };
	}

	function parse(arg0: string | Iterable<LeveledLCFToken> | Iterator<LeveledLCFToken>): LCFAST {
		const f = (tokens: Iterable<LeveledLCFToken> | Iterator<LeveledLCFToken>): LCFAST => {
			const bucket = astBucket();
			const it = Iterator.from(tokens);
			for (; ;) {
				const t = it.next();
				if (t.done) {
					const r = bucket.finalize();
					if (r.done !== true) throw Error('Analyzer returns nothing.');
					return r.value;
				}
				const r = bucket.next(t.value);
				if (r.done) {
					if (bucket.finalize().done) throw Error('Analyzer returns multiple value.');
					return r.value;
				}
			}
		};
		if (typeof arg0 === 'string') { return f(toknize(arg0)); } else { return f(arg0); }
	}

	function compile(ast: LCFAST, options?: OptionalRecord<LCFExpressionCompilerOptions>): ((input: LCFExpressionValueType) => LCFExpressionValueType) {
		const c = (el: LCFASTElement): ((input: LCFExpressionValueType) => LCFExpressionValueType) => {
			switch (el.type) {
				case 'null':
				case 'boolean':
				case 'number':
				case 'string': { return (_) => el.value; }
				case 'regexp': { return (_) => new RegExp(el.value, el.flags); }
				case 'identical': { return (i) => i; }
				case 'member_access': {
					return (item: LCFExpressionValueType) => {
						if (item instanceof RegExp) return null;
						else if (Array.isArray(item)) return null;
						else if (typeof item === 'object' && item !== null && Object.hasOwn(item as LCFExpressionRecordType, el.key)) return (item as LCFExpressionRecordType)[el.key] ?? null;
						else return null;
					};
				}
				case 'index_access': {
					const sub = compile(el.key, options);
					return (item: LCFExpressionValueType) => {
						const key = sub(item);
						if (item instanceof RegExp) return null;
						else if (Array.isArray(item) && typeof key === 'number') return (item as LCFExpressionArrayType)[key];
						else if (typeof item === 'object' && item !== null && typeof key === 'string' && Object.hasOwn(item as LCFExpressionRecordType, key)) return (item as LCFExpressionRecordType)[key] ?? null;
						else return null;
					};
				}
				case 'predicate': {
					const f = (options?.predicateDefs ?? compilerDefaults.predicateDefs)[el.key];
					const subexprs = el.args.map((v) => compile(v, options));
					if (f === undefined) throw Error(`Undefined predicate "${el.key}"`);
					return (item: LCFExpressionValueType) => f(item, subexprs, options?.throwOnTypeError ?? compilerDefaults.throwOnTypeError);
				}
				case 'array': {
					const sub = el.value.map((v) => compile(v, options));
					return (item: LCFExpressionValueType) => sub.map((i) => i(item));
				}
				case 'records': {
					const sub = el.value.map((v): [string, ((input: LCFExpressionValueType) => LCFExpressionValueType)] => [v[0], compile(v[1], options)]);
					return (item: LCFExpressionValueType) => Object.fromEntries(sub.map((i) => [i[0], i[1](item)]));
				}
			}
		};
		const r = ast.map(c);
		return (item: LCFExpressionValueType) => r.reduce((pv, v) => v(pv), item);
	}

	const isNull = (o: LCFExpressionValueType): o is null => o === null;
	const isBoolean = (o: LCFExpressionValueType): o is boolean => typeof o === 'boolean';
	const isNumber = (o: LCFExpressionValueType): o is number => typeof o === 'number';
	const isString = (o: LCFExpressionValueType): o is string => typeof o === 'string';
	const isRegExp = (o: LCFExpressionValueType): o is RegExp => o instanceof RegExp;
	const isPrimitive = (o: LCFExpressionValueType): o is LCFExpressionPrimitiveType => o === null || typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string';
	const isArray = (o: LCFExpressionValueType): o is LCFExpressionArrayType => Array.isArray(o);
	const isRecord = (o: LCFExpressionValueType): o is LCFExpressionRecordType => o !== null && !(o instanceof RegExp) && !(Array.isArray(o)) && typeof o === 'object';
	const typestr = (o: LCFExpressionValueType): 'null' | 'boolean' | 'number' | 'string' | 'regexp' | 'array' | 'record' => {
		switch (true) {
			default:
			case isNull(o): return 'null';
			case isBoolean(o): return 'boolean';
			case isNumber(o): return 'number';
			case isString(o): return 'string';
			case isRegExp(o): return 'regexp';
			case isArray(o): return 'array';
			case isRecord(o): return 'record';
		}
	};
	const toBoolean = (o: LCFExpressionValueType): boolean => {
		if (isArray(o)) return o.length > 0;
		if (isRecord(o)) return Object.entries(o).some(v => v[1] !== undefined);
		return Boolean(o);
	};
	const size = (o: LCFExpressionValueType): number => {
		if (isArray(o) || isString(o)) return o.length;
		if (isRecord(o)) return Object.keys(o).length;
		if (isRegExp(o)) return 1;
		return Number(o);
	};
	const compare = (left: LCFExpressionValueType, right: LCFExpressionValueType): 'equivalent' | 'less' | 'greater' | 'unordered' => {
		if (isNull(left) && isNull(right)) return 'equivalent';
		if (isNull(left) || isNull(right)) return 'unordered';
		if (isPrimitive(left) && isPrimitive(right)) {
			if (left === right) return 'equivalent';
			else if (left < right) return 'less';
			else if (left > right) return 'greater';
			else return 'unordered';
		}
		if (LCFExpression.isRegExp(left) && LCFExpression.isRegExp(right)) return left.source === right.source && left.flags === right.flags ? 'equivalent' : 'unordered';
		if (LCFExpression.isArray(left) && LCFExpression.isArray(right)) {
			const n = left.length >= right.length ? left.length : right.length;
			for (let i = 0; i < n; ++i) {
				const l = left.at(i);
				const r = right.at(i);
				if (l === undefined && r !== undefined) return 'less';
				if (l !== undefined && r === undefined) return 'greater';
				if (l === undefined || r === undefined) throw Error();
				const c = compare(l, r);
				if (c !== 'equivalent') return c;
			}
			return 'equivalent';
		}
		if (LCFExpression.isRecord(left) && LCFExpression.isRecord(right)) {
			const lk = new Set(Object.keys(left));
			const rk = new Set(Object.keys(left));
			if (lk.difference(rk).size !== 0) return 'unordered';
			for (const k of lk) {
				const l = left[k];
				const r = right[k];
				if (l === undefined || r === undefined || compare(l, r) !== 'equivalent') return 'unordered';
			}
			return 'equivalent';
		}
		return 'unordered';
	};
	const add = (left: LCFExpressionValueType, right: LCFExpressionValueType): LCFExpressionValueType => {
		if (LCFExpression.isBoolean(left) && LCFExpression.isBoolean(right)) return left || right;
		if (LCFExpression.isNumber(left) && LCFExpression.isNumber(right)) return left + right;
		if (LCFExpression.isString(left) && LCFExpression.isString(right)) return left + right;
		if (LCFExpression.isRecord(left) && LCFExpression.isRecord(right)) return { ...left, ...right };
		if (LCFExpression.isArray(left) && LCFExpression.isArray(right)) return Array.of(left, right);
		if (LCFExpression.isArray(left)) return Array.of(left, [right]);
		if (LCFExpression.isArray(right)) return Array.of([left], right);
		else return null;
	};
	const r = { toknize, parse, compile, isNull, isBoolean, isNumber, isString, isRegExp, isPrimitive, isArray, isRecord, typestr, toBoolean, size, compare, add };
	Object.setPrototypeOf(constructor, r);
	Object.seal(constructor);
	return constructor as LCFExpressionConstructor;
})();
