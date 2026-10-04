<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="selectedTab" v-bind="header">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<div v-if="tabKey === 'flags'" class="_gaps">
			<MkFoldableSection>
				<template #header>{{ i18n.ts._noteFlag.manualFlags }}</template>
				<div class="_gaps_s">
					<MkNoteFlagPreview v-for="flag in flags.manual" :key="flag.id" :flag="flag" :forModeration="true"/>
				</div>
			</MkFoldableSection>
			<MkFoldableSection>
				<template #header>{{ i18n.ts._noteFlag.conditionalFlags }}</template>
				<div class="_gaps_s">
					<MkNoteFlagPreview v-for="flag in flags.conditional" :key="flag.id" :flag="flag" :forModeration="true"/>
				</div>
			</MkFoldableSection>
		</div>
		<XFlagPolicies
			v-else-if="tabKey === 'policies'" :policies="{ isBase: true, policies: policies }"
			:readonly="false"
		/>
	</div>
	<template #footer>
		<div v-if="tabKey === 'policies'" :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="savePolicies"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import * as Mi from 'misskey-js';
import XFlagPolicies from './note-flags.policies.vue';
import type { Tab } from '@/components/MkTabs.vue';
import type { PageHeaderItem } from '@/types/page-header';
import * as os from '@/os.js';
import PageWithHeader from '@/components/global/PageWithHeader.vue';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkNoteFlagPreview from '@/components/MkNoteFlagPreview.vue';
import { i18n } from '@/i18n';
import { fetchInstance, instance } from '@/instance';
import { definePage } from '@/page';
import { useRouter } from '@/router';
import { deepClone } from '@/utility/clone';
import { misskeyApi } from '@/utility/misskey-api';
import MkButton from '@/components/MkButton.vue';

type TabKeys = 'flags' | 'policies';
const router = useRouter();
const props = defineProps<{
	tab?: TabKeys
}>();
const emit = defineEmits<{
	'update:tab': [TabKeys],
}>();

const tabKey = ref<TabKeys>('flags');
watch(() => props.tab, v => {
	if (!v) return;
	tabKey.value = v;
}, { immediate: true });
const selectedTab = computed<TabKeys>({
	get: () => tabKey.value, set: v => {
		tabKey.value = v;
		emit('update:tab', v);
	},
});

const allFlags = ref<Mi.entities.NoteFlag[]>(await misskeyApi('admin/note-flags/list', {}));
const flags = computed(() => ({
	manual: allFlags.value.filter(v => v.target === 'manual'),
	conditional: allFlags.value.filter(v => v.target === 'conditional'),
}));
const flagIsEmpty = computed(() => allFlags.value.length <= 0);

const policies = reactive(deepClone(instance.notePolicies));
const savePolicies = async () => {
	await os.apiWithDialog('admin/note-flags/update-default-policies', {
		// @ts-expect-error Misskey API パラメータに ref を使用できないため、定義が不十分
		policies,
	});
	fetchInstance(true);
};

const header = computed(() => ({
	actions: [
		{
			text: i18n.ts._noteFlag.new,
			highlighted: flagIsEmpty.value,
			danger: false,
			icon: 'ti ti-plus',
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			handler(ev) {
				router.push('/admin/note-flag/new');
			},
		},
	] as PageHeaderItem[],
	tabs: [
		{ key: 'flags', title: i18n.ts._noteFlag.flags, icon: 'ti ti-flag' },
		{ key: 'policies', title: i18n.ts._noteFlag.policies, icon: 'ti ti-license' },
	] as Tab[],
}));
definePage(() => ({
	title: i18n.ts.noteFlags,
	icon: 'ti ti-flag',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}
</style>
