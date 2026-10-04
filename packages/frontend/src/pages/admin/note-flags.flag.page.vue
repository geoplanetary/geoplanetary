<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tabRef" v-bind="header">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<XFlagItem v-if="flag && tabRef === 'flag'" :modelValue="flag" :readonly="true"/>
		<XFlagPolicies
			v-else-if="flag && tabRef === 'policies'" :policies="{ isBase: false, policies: flag.policies }"
			:readonly="true"
		/>
	</div>
</PageWithHeader>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import * as Mi from 'misskey-js';
import XFlagItem from './note-flags.flag.item.vue';
import XFlagPolicies from './note-flags.policies.vue';
import type { PageHeaderItem } from '@/types/page-header';
import type { Tab } from '@/components/MkTabs.vue';
import PageWithHeader from '@/components/global/PageWithHeader.vue';
import { definePage } from '@/page';
import { i18n } from '@/i18n';
import * as os from '@/os.js';
import { useRouter } from '@/router';
import { misskeyApi } from '@/utility/misskey-api';

type TabKeys = 'flag' | 'policies';
const router = useRouter();
const props = defineProps<{
	id: string;
	tab?: TabKeys
}>();
const emit = defineEmits<{
	(ev: 'update:tab', v: TabKeys): void;
}>();

const tabRef = ref<TabKeys>('flag');
watch(() => props.tab, v => {
	if (!v) return;
	tabRef.value = v;
}, { immediate: true });
watch(tabRef, v => emit('update:tab', v));

const flag = ref<Mi.entities.NoteFlag | undefined>();
watch(() => props.id, async (v) => {
	flag.value = reactive(await misskeyApi('admin/note-flags/show', { flagId: v }));
}, { immediate: true });

const header = computed(() => ({
	actions: [
		{
			text: i18n.ts.edit,
			highlighted: true,
			danger: false,
			icon: 'ti ti-pencil',
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			handler(ev) {
				if (flag.value === undefined) return;
				router.push('/admin/note-flag/:id/edit', {
					params: { id: flag.value.id },
				});
			},
		},
		{
			text: i18n.ts.delete,
			highlighted: false,
			danger: true,
			icon: 'ti ti-trash',
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			async handler(ev) {
				if (flag.value === undefined) return;
				const { canceled } = await os.confirm({
					type: 'warning',
					text: i18n.tsx.deleteAreYouSure({ x: flag.value.name }),
				});
				if (canceled) return;

				await os.apiWithDialog('admin/note-flags/delete', {
					flagId: props.id,
				});

				router.replace('/admin/note-flags');
			},
		},
	] as PageHeaderItem[],
	tabs: [
		{ key: 'flag', title: i18n.ts._noteFlag.flag, icon: 'ti ti-flag' },
		{ key: 'policies', title: i18n.ts._noteFlag.policies, icon: 'ti ti-license' },
	] as Tab[],
}));
definePage(() => ({
	title: `${i18n.ts._noteFlag.flag}: ${flag.value?.name}`,
	icon: 'ti ti-flag',
}));
</script>
