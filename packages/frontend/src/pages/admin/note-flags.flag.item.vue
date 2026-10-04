<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div v-if="readonly && flag.id != null" class="_spacer" style="--MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
		<MkKeyValue v-if="flag.id" :copy="flag.id" oneline>
			<template #key>ID</template>
			<template #value><span class="_monospace">{{ flag.id }}</span></template>
		</MkKeyValue>
		<MkKeyValue v-if="flag.createdAt" oneline>
			<template #key>{{ i18n.ts.createdAt }}</template>
			<template #value><span class="_monospace">{{ new Date(flag.createdAt).toLocaleString() }}</span></template>
		</MkKeyValue>
		<MkKeyValue v-if="flag.updatedAt" oneline>
			<template #key>{{ i18n.ts.updatedAt }}</template>
			<template #value><span class="_monospace">{{ new Date(flag.updatedAt).toLocaleString() }}</span></template>
		</MkKeyValue>
	</div>

	<MkInput v-model="flag.name" :readonly="readonly">
		<template #label>{{ i18n.ts._noteFlag.name }}</template>
	</MkInput>

	<MkTextarea v-model="flag.description" :readonly="readonly">
		<template #label>{{ i18n.ts._noteFlag.description }}</template>
	</MkTextarea>

	<MkColorInput v-model="flag.color">
		<template #label>{{ i18n.ts.color }}</template>
	</MkColorInput>

	<MkInput v-model="flag.iconUrl" type="url">
		<template #label>{{ i18n.ts._noteFlag.iconUrl }}</template>
	</MkInput>

	<MkInput v-model="flag.displayOrder" type="number">
		<template #label>{{ i18n.ts._noteFlag.displayOrder }}</template>
		<template #caption>{{ i18n.ts._noteFlag.descriptionOfDisplayOrder }}</template>
	</MkInput>

	<MkSelect v-model="flag.target" :items="flagTargetItems" :readonly="readonly">
		<template #label><i class="ti ti-users"></i> {{ i18n.ts._noteFlag.assignTarget }}</template>
		<template #caption>
			{{ i18n.ts._noteFlag.descriptionOfAssignTarget }}
		</template>
	</MkSelect>

	<template v-if="flag.target === 'conditional'">
		<MkTextarea v-model="flag.condFormula">
			<template #label>{{ i18n.ts._noteFlag.condition }}</template>
			<template #caption>
				<MkFolder>
					<template #label>{{ i18n.ts._lcfExpression.inputContext }}: <code>InspectionSubject</code></template>
					<MkCode
						lang="typescript"
						:code="'type InspectionSubject = {\n\tuserId: MiUser[\'id\'];\n\ttext: string | null;\n\treply: MiNote | null;\n\trenote: MiNote | null;\n\tfiles: MiDriveFile[] | null;\n\tmentions: { username: string; host: string | null; }[];\n\ttags: string[];\n\troles: MiRole[];\n}'"
					>
					</MkCode>
				</MkFolder>
			</template>
		</MkTextarea>
	</template>

	<MkSwitch v-model="flag.isPublic" :readonly="readonly">
		<template #label>{{ i18n.ts._noteFlag.isPublic }}</template>
	</MkSwitch>

	<MkSwitch v-model="flag.asBadge" :readonly="readonly">
		<template #label>{{ i18n.ts._noteFlag.asBadge }}</template>
		<template #caption>{{ i18n.ts._noteFlag.descriptionOfAsBadge }}</template>
	</MkSwitch>

	<MkSwitch v-model="flag.canAssignByUser" :readonly="readonly">
		<template #label>{{ i18n.ts._noteFlag.canAssignToOwnNoteByUser }}</template>
		<template #caption>{{ i18n.ts._noteFlag.descriptionOfCanAssignToOwnNoteByUser }}</template>
	</MkSwitch>
</div>
</template>

<script lang="ts" setup>
import { watch, ref } from 'vue';
import { throttle } from 'throttle-debounce';
import * as Mi from 'misskey-js';
import type { MkSelectItem } from '@/components/MkSelect.vue';
import MkCode from '@/components/MkCode.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInput from '@/components/MkInput.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import { i18n } from '@/i18n.js';
import { deepClone } from '@/utility/clone.js';

export type NoteFlagLike = Pick<Mi.entities.NoteFlag, 'name' | 'description' | 'color' | 'iconUrl' | 'canAssignByUser' | 'displayOrder' | 'isPublic' | 'asBadge' | 'target' | 'condFormula' | 'policies'> & {
	id?: Mi.entities.NoteFlag['id'] | null;
	createdAt?: Mi.entities.NoteFlag['createdAt'] | null;
	updatedAt?: Mi.entities.NoteFlag['updatedAt'] | null;
};

const props = defineProps<{
	modelValue: NoteFlagLike;
	readonly?: boolean;
}>();
const emit = defineEmits<{
	(ev: 'update:modelValue', v: NoteFlagLike): void;
}>();

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const flag = ref(deepClone(props.modelValue));

const flagTargetItems = [{ label: i18n.ts._noteFlag.manual, value: 'manual' }, { label: i18n.ts._noteFlag.conditional, value: 'conditional' }] as const satisfies MkSelectItem[];

watch(() => flag.value, throttle(100, (v: NoteFlagLike) => {
	const data = {
		name: v.name,
		description: v.description,
		color: v.color === '' ? null : v.color,
		iconUrl: v.iconUrl === '' ? null : v.iconUrl,
		isPublic: v.isPublic,
		asBadge: v.asBadge,
		canAssignByUser: v.canAssignByUser,
		displayOrder: v.displayOrder,
		target: v.target,
		condFormula: v.condFormula,
		policies: v.policies,
	} satisfies NoteFlagLike;
	emit('update:modelValue', data);
}), { deep: true });
</script>
