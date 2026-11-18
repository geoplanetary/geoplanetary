<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader v-model:tab="tabRef" v-bind="header">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<XFlagItem v-if="tabRef === 'flag'" v-model="flag" :readonly="false"/>
		<XFlagPolicies
			v-else-if="tabRef === 'policies'" :policies="{ isBase: false, policies: flag.policies }"
			:readonly="false"
		/>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import * as Mi from 'misskey-js';
import XFlagItem from './note-flags.flag.item.vue';
import XFlagPolicies from './note-flags.policies.vue';
import type { Tab } from '@/components/MkTabs.vue';
import { noteFlagsCache } from '@/cache.js';
import MkButton from '@/components/MkButton.vue';
import PageWithHeader from '@/components/global/PageWithHeader.vue';
import { definePage } from '@/page';
import { i18n } from '@/i18n';
import { instance } from '@/instance.js';
import { useRouter } from '@/router.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api';

type TabKeys = 'flag' | 'policies';
const router = useRouter();
const props = defineProps<{
	id?: string;
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

const flag = ref<Pick<Mi.entities.NoteFlag, 'name' | 'description' | 'color' | 'iconUrl' | 'canAssignByUser' | 'displayOrder' | 'isPublic' | 'asBadge' | 'target' | 'condFormula' | 'policies'>>({
	name: 'New Flag',
	description: '',
	color: null,
	iconUrl: null,
	isPublic: false,
	asBadge: false,
	canAssignByUser: false,
	target: 'manual',
	condFormula: '',
	displayOrder: 0,
	policies: Object.fromEntries((Object.keys(instance.notePolicies) as (keyof Mi.entities.NoteFlag['policies'])[]).map(k => [k, { useDefault: true }])) as Mi.entities.NoteFlag['policies'],
});
if (props.id !== undefined) {
	flag.value = reactive(await misskeyApi('admin/note-flags/show', { flagId: props.id }));
}

async function save() {
	noteFlagsCache.delete();
	if (props.id === undefined) {
		// @ts-expect-error Misskey API パラメータ定義に ref を使用できないため、定義が不十分
		const created = await os.apiWithDialog('admin/note-flags/create', {
			...flag.value,
		});
		router.replace('/admin/note-flag/:id', {
			params: {
				id: created.id,
			},
		});
	} else {
		// @ts-expect-error Misskey API パラメータ定義に ref を使用できないため、定義が不十分
		os.apiWithDialog('admin/note-flags/update', {
			flagId: props.id,
			...flag.value,
		});
	}
}

const header = computed(() => ({
	actions: [],
	tabs: [
		{ key: 'flag', title: i18n.ts._noteFlag.flag, icon: 'ti ti-flag' },
		{ key: 'policies', title: i18n.ts._noteFlag.policies, icon: 'ti ti-license' },
	] as Tab[],
}));
definePage(() => props.id === undefined ? ({
	title: i18n.ts._noteFlag.new,
	icon: 'ti ti-flag',
}) : ({
	title: `${i18n.ts._noteFlag.edit}: ${flag.value.name}`,
	icon: 'ti ti-flag',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}
</style>
