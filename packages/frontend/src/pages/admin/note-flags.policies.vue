<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<FormSlot>
	<div class="_gaps_s">
		<MkInput v-model="queryRef" type="search">
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>

		<div class="_gaps_s">
			<XItem
				v-if="matchQuery([i18n.ts._noteFlag._policies.masked, 'masked'])"
				v-model:overrideMeta="policyOverrides.masked.value" :readonly="readonly"
			>
				<template #label>{{ i18n.ts._noteFlag._policies.masked }}</template>
				<template #valueText>{{ policyValues.masked.value ? i18n.ts.yes : i18n.ts.no }}</template>
				<template #default="{ disabled }">
					<MkSwitch v-model="policyValues.masked.value" :disabled="disabled">
						<template #label>{{ i18n.ts.enable }}</template>
					</MkSwitch>
				</template>
			</XItem>
		</div>

		<div class="_gaps_s">
			<XItem
				v-if="matchQuery([i18n.ts._noteFlag._policies.defaultMuted, 'defaultMuted'])"
				v-model:overrideMeta="policyOverrides.defaultMuted.value" :readonly="readonly"
			>
				<template #label>{{ i18n.ts._noteFlag._policies.defaultMuted }}</template>
				<template #valueText>{{ policyValues.defaultMuted.value ? i18n.ts.yes : i18n.ts.no }}</template>
				<template #default="{ disabled }">
					<MkSwitch v-model="policyValues.defaultMuted.value" :disabled="disabled">
						<template #label>{{ i18n.ts.enable }}</template>
					</MkSwitch>
				</template>
			</XItem>
		</div>

		<div class="_gaps_s">
			<XItem
				v-if="matchQuery([i18n.ts._noteFlag._policies.enableReply, 'enableReply'])"
				v-model:overrideMeta="policyOverrides.enableReply.value" :readonly="readonly"
			>
				<template #label>{{ i18n.ts._noteFlag._policies.enableReply }}</template>
				<template #valueText>{{ policyValues.enableReply.value ? i18n.ts.yes : i18n.ts.no }}</template>
				<template #default="{ disabled }">
					<MkSwitch v-model="policyValues.enableReply.value" :disabled="disabled">
						<template #label>{{ i18n.ts.enable }}</template>
					</MkSwitch>
				</template>
			</XItem>
		</div>

		<div class="_gaps_s">
			<XItem
				v-if="matchQuery([i18n.ts._noteFlag._policies.enableQuote, 'enableQuote'])"
				v-model:overrideMeta="policyOverrides.enableQuote.value" :readonly="readonly"
			>
				<template #label>{{ i18n.ts._noteFlag._policies.enableQuote }}</template>
				<template #valueText>{{ policyValues.enableQuote.value ? i18n.ts.yes : i18n.ts.no }}</template>
				<template #default="{ disabled }">
					<MkSwitch v-model="policyValues.enableQuote.value" :disabled="disabled">
						<template #label>{{ i18n.ts.enable }}</template>
					</MkSwitch>
				</template>
			</XItem>
		</div>
	</div>
</FormSlot>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as Mi from 'misskey-js';
import XItem from './note-flags.policies.item.vue';
import type { OverrideMetadata } from './note-flags.policies.item.vue';
import type { WritableComputedRef } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSlot from '@/components/form/slot.vue';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';

export type SwitchablePolicy = {
	isBase: true; policies: Mi.entities.NotePolicies;
} | {
	isBase: false; policies: Mi.entities.NotePolicyOverrides;
};

const props = defineProps<{
	policies: SwitchablePolicy;
	query?: string;
	readonly?: boolean;
}>();
const emit = defineEmits<{
	(event: 'update:policies', value: SwitchablePolicy): void;
	(event: 'update:query', value: string | undefined): void;
}>();

const queryRef = ref<string | undefined>(undefined);
watch(() => props.query, v => {
	queryRef.value = v;
}, { immediate: true });
watch(queryRef, v => {
	emit('update:query', v);
});

const policiesRef = ref<SwitchablePolicy>();
watch(() => props.policies, () => {
	policiesRef.value = props.policies;
}, { immediate: true, deep: true });

const defaultPolicyValues = {
	masked: false,
	defaultMuted: false,
	enableQuote: true,
	enableReply: true,
} as const satisfies Required<Mi.entities.NotePolicies>;

const policyValues = (() => {
	return Object.fromEntries((Object.keys(defaultPolicyValues) as (keyof Mi.entities.NotePolicyOverrides)[]).map(k => [k, computed({
		get: () => {
			if (!policiesRef.value) return instance.notePolicies[k] ?? defaultPolicyValues[k];
			if (!policiesRef.value.isBase && policiesRef.value.policies[k].useDefault) return instance.notePolicies[k] ?? defaultPolicyValues[k];
			return (policiesRef.value.isBase ? policiesRef.value.policies[k] : policiesRef.value.policies[k].value) ?? instance.notePolicies[k] ?? defaultPolicyValues[k];
		},
		set: (v) => {
			if (!policiesRef.value) return;
			if (!policiesRef.value.isBase && policiesRef.value.policies[k].useDefault) return;
			if (policiesRef.value.isBase) policiesRef.value.policies[k] = v;
			else policiesRef.value.policies[k].value = v;
			emit('update:policies', policiesRef.value);
		},
	})])) as { [K in keyof Required<Mi.entities.NotePolicies>]: WritableComputedRef<Required<Mi.entities.NotePolicies>[K]> };
})();
const policyOverrides = (() => {
	return Object.fromEntries((Object.keys(defaultPolicyValues) as (keyof typeof defaultPolicyValues)[]).map(k => [k, computed<OverrideMetadata | null>({
		get: () => {
			if (!policiesRef.value || policiesRef.value.isBase) return null;
			return { useDefault: policiesRef.value.policies[k].useDefault, priority: policiesRef.value.policies[k].priority ?? 0 } satisfies OverrideMetadata;
		},
		set: (v) => {
			if (!v || !policiesRef.value || policiesRef.value.isBase) return;
			policiesRef.value.policies[k] = v.useDefault ? { useDefault: true } : { useDefault: false, priority: v.priority, value: policiesRef.value.policies[k].value ?? instance.notePolicies[k] ?? defaultPolicyValues[k] };
			emit('update:policies', policiesRef.value);
		},
	})])) as { [K in keyof Required<Mi.entities.NotePolicies>]: WritableComputedRef<OverrideMetadata | null> };
})();

function matchQuery(keywords: string[]): boolean {
	if (queryRef.value == null || queryRef.value.trim().length === 0) return true;
	return keywords.some(keyword => queryRef.value == null || keyword.toLowerCase().includes(queryRef.value.toLowerCase()));
}
</script>
