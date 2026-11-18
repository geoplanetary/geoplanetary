/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { $i } from '@/i';

export function isFollowEnabled(user: Misskey.entities.UserDetailed): boolean {
	return ($i && user.id !== $i.id && $i.policies.canFollowing && !(user.isBlocking ?? false) && !(user.isBlocked ?? false) && !(user.isSuspended) && user.canFollowedFromOthers) ?? false;
}
