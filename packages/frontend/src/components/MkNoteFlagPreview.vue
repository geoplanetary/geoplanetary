<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkA v-if="props.forModeration" :to="`/admin/note-flag/${props.flag.id}`" :class="$style.root" tabindex="-1" :style="{ '--color': props.flag.color }">
	<template v-if="props.detailed">
		<i v-if="'isPublic' in props.flag && props.flag.isPublic" class="ti ti-world" :class="$style.icon" style="color: var(--MI_THEME-success)"></i>
		<i v-else class="ti ti-lock" :class="$style.icon" style="color: var(--MI_THEME-warn)"></i>
	</template>
	<div v-adaptive-bg class="_panel" :class="$style.body">
		<div :class="$style.bodyTitle">
			<span :class="$style.bodyIcon">
				<template v-if="props.flag.iconUrl">
					<img :class="$style.bodyBadge" :src="props.flag.iconUrl"/>
				</template>
				<template v-else>
					<i class="ti ti-flag" style="opacity: 0.7;"></i>
				</template>
			</span>
			<span :class="$style.bodyName">{{ props.flag.name }}</span>
		</div>
		<div :class="$style.bodyDescription">{{ props.flag.description }}</div>
	</div>
</MkA>
<span v-else :class="$style.root" tabindex="-1" :style="`--color: ${props.flag.color}`">
	<div v-adaptive-bg class="_panel" :class="$style.body">
		<div :class="$style.bodyTitle">
			<span :class="$style.bodyIcon">
				<template v-if="props.flag.iconUrl">
					<img :class="$style.bodyBadge" :src="props.flag.iconUrl"/>
				</template>
				<template v-else>
					<i class="ti ti-flag" style="opacity: 0.7;"></i>
				</template>
			</span>
			<span :class="$style.bodyName">{{ props.flag.name }}</span>
		</div>
		<div :class="$style.bodyDescription">{{ props.flag.description }}</div>
	</div>
</span>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as Misskey from 'misskey-js';

const props = withDefaults(defineProps<{
	flag: Misskey.entities.NoteFlagLite;
	forModeration: boolean;
	detailed?: boolean;
}>(), {
	detailed: true,
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	align-items: center;
}

.icon {
	margin: 0 12px;
}

.body {
	display: block;
	padding: 16px 20px;
	flex: 1;
	border-left: solid 6px var(--color);
}

.bodyTitle {
	display: flex;
}

.bodyIcon {
	margin-right: 8px;
}

.bodyBadge {
	height: 1.3em;
	vertical-align: -20%;
}

.bodyName {
	font-weight: bold;
}

.bodyUsers {
	margin-left: auto;
	opacity: 0.7;
}

.bodyDescription {
	opacity: 0.7;
	font-size: 85%;
}
</style>
