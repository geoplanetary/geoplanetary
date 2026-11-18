<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div :class="$style.header">
		<MkSelect v-model="type" :class="$style.typeSelect" :items="formulaTypeDef(child)"/>
		<button v-if="draggable" class="drag-handle _button" :class="$style.dragHandle" @dragstart.stop="dragStartCallback">
			<i class="ti ti-menu-2"></i>
		</button>
		<button v-if="draggable" class="_button" :class="$style.remove" @click="removeSelf">
			<i class="ti ti-x"></i>
		</button>
	</div>

	<div v-if="formula && isLogicsValue(formula)" class="_gaps">
		<MkDraggable v-model="children" direction="vertical" withGaps canNest manualDragStart group="prohibitedNoteFormula">
			<template #default="{ item, dragStart }">
				<div :class="$style.item">
					<!-- divが無いとエラーになる https://github.com/SortableJS/vue.draggable.next/issues/189 -->
					<ProhibitedNoteFormula
						:modelValue="item.value" child draggable :dragStartCallback="dragStart"
						@update:modelValue="updated => valuesItemUpdated({id: item.id, value: updated})" @remove="removeItem(item)"
					/>
				</div>
			</template>
		</MkDraggable>
		<MkButton rounded style="margin: 0 auto;" @click="addValue">
			<i class="ti ti-plus"></i> {{ i18n.ts.add }}
		</MkButton>
	</div>

	<div v-else-if="formula && isNotValue(formula)" :class="$style.item">
		<ProhibitedNoteFormula v-model="formula.value" child/>
	</div>

	<MkSelect
		v-else-if="formula && isAssignsRoleValue(formula)" v-model="formula.roleId"
		:items="roles.map((i) => { return { value: i.id, label: i.name } })"
	/>

	<MkInput v-else-if="formula && isMD5HashMatchValue(formula)" v-model="formula.hash" type="text"/>

	<MkInput
		v-else-if="formula && isSizeCompValue(formula)"
		v-model="formula.size" type="number"
	>
		<template #suffix>byte</template>
	</MkInput>

	<MkInput
		v-else-if="formula && isCountCompValue(formula)"
		v-model="formula.value" type="number"
	/>

	<MkTextarea v-else-if="formula && isPatternMatchValue(formula)" v-model="pattern" type="text">
		<template #caption>{{ i18n.ts._prohibitedNote.patternEditDescription }}</template>
	</MkTextarea>

	<div v-else-if="formula && isBlurhashLikelyValue(formula)">
		<MkInput v-model="formula.hash" type="text">
			<template #label>{{ i18n.ts._prohibitedNote.hash }}</template>
		</MkInput>
		<MkInput v-model="formula.diff" type="number">
			<template #label>{{ i18n.ts._prohibitedNote.allowDifference }}</template>
		</MkInput>
	</div>

	<div :class="$style.caption">
		<slot name="caption"></slot>
	</div>
</div>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { computed, ref, watch } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkButton from '@/components/MkButton.vue';
import MkDraggable from '@/components/MkDraggable.vue';
import { i18n } from '@/i18n.js';
import { deepClone } from '@/utility/clone.js';
import { rolesCache } from '@/cache.js';
import { genId } from '@/utility/id';

const roles = await rolesCache.fetch();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: Misskey.entities.ProhibitedNoteFormulaValue | null): void;
	(ev: 'remove'): void;
}>();

const props = defineProps<{
	modelValue: Misskey.entities.ProhibitedNoteFormulaValue | null;
	draggable?: boolean;
	dragStartCallback?: (ev: DragEvent) => void;
	child?: boolean;
}>();

const formulaTypeDef = (child: boolean) => {
	return (!child ? [
		{ value: 'disable', label: i18n.ts._prohibitedNote.disable },
	] : []).concat([
		{ value: 'false', label: i18n.ts._prohibitedNote._condition.false_value },
		{ value: 'true', label: i18n.ts._prohibitedNote._condition.true_value },
		{ value: 'and', label: i18n.ts._prohibitedNote._condition.and },
		{ value: 'or', label: i18n.ts._prohibitedNote._condition.or },
		{ value: 'not', label: i18n.ts._prohibitedNote._condition.not },
		{ value: 'roleAssignedTo', label: i18n.ts._prohibitedNote._condition.roleAssignedTo },
		{ value: 'hasText', label: i18n.ts._prohibitedNote._condition.hasText },
		{ value: 'textMatchOf', label: i18n.ts._prohibitedNote._condition.textMatchOf },
		{ value: 'hasMentions', label: i18n.ts._prohibitedNote._condition.hasMentions },
		{ value: 'mentionCountIs', label: i18n.ts._prohibitedNote._condition.mentionCountIs },
		{ value: 'mentionCountMoreThanOrEq', label: i18n.ts._prohibitedNote._condition.mentionCountMoreThanOrEq },
		{ value: 'mentionCountLessThan', label: i18n.ts._prohibitedNote._condition.mentionCountLessThan },
		{ value: 'isReply', label: i18n.ts._prohibitedNote._condition.isReply },
		{ value: 'isQuoted', label: i18n.ts._prohibitedNote._condition.isQuoted },
		{ value: 'hasFiles', label: i18n.ts._prohibitedNote._condition.hasFiles },
		{ value: 'fileCountIs', label: i18n.ts._prohibitedNote._condition.fileCountIs },
		{ value: 'fileCountMoreThanOrEq', label: i18n.ts._prohibitedNote._condition.fileCountMoreThanOrEq },
		{ value: 'fileCountLessThan', label: i18n.ts._prohibitedNote._condition.fileCountLessThan },
		{ value: 'fileTotalSizeMoreThanOrEq', label: i18n.ts._prohibitedNote._condition.fileTotalSizeMoreThanOrEq },
		{ value: 'fileTotalSizeLessThan', label: i18n.ts._prohibitedNote._condition.fileTotalSizeLessThan },
		{ value: 'hasFileSizeMoreThanOrEq', label: i18n.ts._prohibitedNote._condition.hasFileSizeMoreThanOrEq },
		{ value: 'hasFileSizeLessThan', label: i18n.ts._prohibitedNote._condition.hasFileSizeLessThan },
		{ value: 'hasFileMD5Is', label: i18n.ts._prohibitedNote._condition.hasFileMD5Is },
		{ value: 'hasBrowserInsafe', label: i18n.ts._prohibitedNote._condition.hasBrowserInsafe },
		{ value: 'hasPictures', label: i18n.ts._prohibitedNote._condition.hasPictures },
		{ value: 'hasLikelyBlurhash', label: i18n.ts._prohibitedNote._condition.hasLikelyBlurhash },
		{ value: 'hasHashtags', label: i18n.ts._prohibitedNote._condition.hasHashtags },
		{ value: 'hashtagCountIs', label: i18n.ts._prohibitedNote._condition.hashtagCountIs },
		{ value: 'hashtagCountMoreThanOrEq', label: i18n.ts._prohibitedNote._condition.hashtagCountMoreThanOrEq },
		{ value: 'hashtagCountLessThan', label: i18n.ts._prohibitedNote._condition.hashtagCountLessThan },
		{ value: 'hasHashtagMatchOf', label: i18n.ts._prohibitedNote._condition.hasHashtagMatchOf },
	]);
};

const formula = ref<Misskey.entities.ProhibitedNoteFormulaValue | null>(null);
const subValueKeys = ref<string[]>([]);

function regenerateSubValueKeys() {
	subValueKeys.value = formula.value && isLogicsValue(formula.value) ? formula.value.values.map(() => genId()) : [];
}

watch(() => props.modelValue, (newValue, oldValue) => {
	if (JSON.stringify(newValue) === JSON.stringify(oldValue)) return;
	formula.value = deepClone(newValue);
}, { deep: true, immediate: true });

watch(formula, () => {
	emit('update:modelValue', formula.value);
}, { deep: true });

const type = computed({
	get: () => formula.value ? formula.value.type : 'disable',
	set: (t) => {
		switch (t) {
			case 'true':
			case 'false': {
				formula.value = { type: t };
				break;
			}
			case 'and':
			case 'or': {
				formula.value = { type: t, values: [{ type: 'false' }] };
				break;
			}
			case 'not': {
				formula.value = { type: t, value: { type: 'false' } };
				break;
			}
			case 'hasText':
			case 'hasMentions':
			case 'isReply':
			case 'isQuoted':
			case 'hasFiles':
			case 'hasBrowserInsafe':
			case 'hasPictures':
			case 'hasHashtags': {
				formula.value = { type: t };
				break;
			}
			case 'textMatchOf':
			case 'hasHashtagMatchOf': {
				formula.value = { type: t, pattern: '' };
				break;
			}
			case 'mentionCountIs':
			case 'mentionCountMoreThanOrEq':
			case 'mentionCountLessThan':
			case 'fileCountIs':
			case 'fileCountMoreThanOrEq':
			case 'fileCountLessThan':
			case 'hashtagCountIs':
			case 'hashtagCountMoreThanOrEq':
			case 'hashtagCountLessThan': {
				formula.value = { type: t, value: 3 };
				break;
			}
			case 'fileTotalSizeMoreThanOrEq':
			case 'fileTotalSizeLessThan':
			case 'hasFileSizeMoreThanOrEq':
			case 'hasFileSizeLessThan': {
				formula.value = { type: t, size: 10240 };
				break;
			}
			case 'roleAssignedTo': {
				formula.value = { type: t, roleId: '' };
				break;
			}
			case 'hasFileMD5Is': {
				formula.value = { type: t, hash: '' };
				break;
			}
			case 'hasLikelyBlurhash': {
				formula.value = { type: t, hash: '', diff: 0 };
				break;
			}
			case 'disable': {
				formula.value = null;
			}
		}
	},
});
const isLogicsValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaLogics => ['and', 'or'].includes(v.type);
const isNotValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaNot => ['not'].includes(v.type);
const isPatternMatchValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaPatternMatch => ['textMatchOf', 'hasHashtagMatchOf'].includes(v.type);
const isAssignsRoleValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaAssignsRole => ['roleAssignedTo'].includes(v.type);
const isCountCompValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaCountComp => ['mentionCountIs', 'mentionCountMoreThanOrEq', 'mentionCountLessThan', 'fileCountIs', 'fileCountMoreThanOrEq', 'fileCountLessThan', 'hashtagCountIs', 'hashtagCountMoreThanOrEq', 'hashtagCountLessThan'].includes(v.type);
const isSizeCompValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaSizeComp => ['fileTotalSizeMoreThanOrEq', 'fileTotalSizeLessThan', 'hasFileSizeMoreThanOrEq', 'hasFileSizeLessThan'].includes(v.type);
const isMD5HashMatchValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaMD5HashMatch => ['hasFileMD5Is'].includes(v.type);
const isBlurhashLikelyValue = (v: Misskey.entities.ProhibitedNoteFormulaValue): v is Misskey.entities.ProhibitedNoteFormulaBlurhashLikely => ['hasLikelyBlurhash'].includes(v.type);

const children = computed({
	get: () => {
		if (!formula.value || !isLogicsValue(formula.value)) { return []; }
		if (subValueKeys.value.length < formula.value.values.length) {
			regenerateSubValueKeys();
		}
		return formula.value.values.map((v, i) => { return { id: subValueKeys.value[i], value: v }; });
	},
	set: (nv) => {
		if (!formula.value || !isLogicsValue(formula.value)) { return; }
		console.debug(formula.value.values.map((v, i) => { return { id: subValueKeys.value[i], value: v }; }));
		subValueKeys.value = nv.map(v => v.id);
		formula.value.values = nv.map(v => v.value);
	},
});
const pattern = computed({
	get: () => {
		const p = (formula.value as Misskey.entities.ProhibitedNoteFormulaPatternMatch).pattern;
		return Array.isArray(p) ? p.join('\n') : p;
	},
	set: (nv) => (formula.value as Misskey.entities.ProhibitedNoteFormulaPatternMatch).pattern = nv.split('\n'),
});

function addValue() {
	if (!formula.value || !isLogicsValue(formula.value)) {
		return;
	}
	formula.value.values.push({ type: 'false' });
	subValueKeys.value.push(genId());
}

function valuesItemUpdated(item: { id: string, value: Misskey.entities.ProhibitedNoteFormulaValue | null }) {
	const wi = subValueKeys.value.findIndex(k => k === item.id);
	if (!formula.value || !isLogicsValue(formula.value)) { return; }
	if (item.value) {
		formula.value.values[wi] = item.value;
		emit('update:modelValue', formula.value);
	} else {
		formula.value.values = formula.value.values.filter((_, i) => i !== wi);
		subValueKeys.value = subValueKeys.value.filter((_, i) => i !== wi);
	}
}

function removeItem(item: { id: string, value: Misskey.entities.ProhibitedNoteFormulaValue | null }) {
	children.value = children.value.filter((v) => v.id !== item.id);
}

function removeSelf() {
	emit('remove');
}
</script>

<style lang="scss" module>
.header {
	display: flex;
}

.typeSelect {
	flex: 1;
}

.dragHandle {
	cursor: move;
	margin-left: 10px;
}

.remove {
	margin-left: 10px;
}

.caption {
	font-size: 0.85em;
	padding: 8px 0 0 0;
	color: color(from var(--MI_THEME-fg) srgb r g b /0.75);

	&:empty {
		display: none;
	}
}

.item {
	border: solid 2px var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	padding: 12px;

	&:hover {
		border-color: var(--MI_THEME-accent);
	}
}
</style>
