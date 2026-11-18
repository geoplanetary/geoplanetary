<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkFolder>
	<template #label><slot name="label"></slot></template>
	<template #suffix>
		<template v-if="!isNonEmpty(props.overrideMeta)">
			<span><slot name="valueText"></slot></span>
		</template>
		<template v-else>
			<span v-if="props.overrideMeta.useDefault" :class="$style.useDefaultLabel">{{ i18n.ts._noteFlag.useBaseValue }}</span>
			<span v-else><slot name="valueText"></slot></span>
			<span v-if="!useDefault" :class="$style.priorityIndicator"><i class="ti ti-flag-exclamation" style="display: inline-block;"></i>{{ props.overrideMeta.priority }}</span>
		</template>
	</template>
	<div class="_gaps">
		<MkSwitch v-if="isNonEmpty(props.overrideMeta)" v-model="useDefault" :disabled="readonly">
			<template #label>{{ i18n.ts._noteFlag.useBaseValue }}</template>
		</MkSwitch>
		<div>
			<slot :disabled="readonly || useDefault"></slot>
		</div>
		<MkInput v-if="isNonEmpty(props.overrideMeta)" v-model="priority" type="number" :disabled="readonly">
			<template #label>{{ i18n.ts._noteFlag.priority }}</template>
		</MkInput>
	</div>
</MkFolder>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PolicyMeta } from './roles.policy-editor.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';

export type OverrideMetadata = { useDefault: boolean; priority: number; };

const props = defineProps<{
	overrideMeta?: OverrideMetadata | null;
	readonly?: boolean;
}>();
const emit = defineEmits<{
	(ev: 'update:overrideMeta', v: PolicyMeta): void;
}>();

const isNonEmpty = <T>(v: T | null | undefined): v is T => v != null;

const useDefault = computed<boolean>({
	get: () => props.overrideMeta?.useDefault ?? false,
	set: (value) => {
		const current = props.overrideMeta;
		if (!isNonEmpty(current)) return;
		if (current.useDefault === value) return;
		emit('update:overrideMeta', { ...current, useDefault: value });
	},
});

const priority = computed<number>({
	get: () => props.overrideMeta?.priority ?? 0,
	set: (value) => {
		const current = props.overrideMeta;
		if (current == null) return;
		if (current.priority === value) return;
		emit('update:overrideMeta', { ...current, priority: value });
	},
});
</script>

<style lang="scss" module>
.useDefaultLabel {
	opacity: 0.7;
}

.priorityIndicator {
	margin-left: 8px;
}
</style>
