/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { iAmModerator } from '@/i';
import { Cache } from '@/utility/cache.js';
import { misskeyApi } from '@/utility/misskey-api.js';

export const clipsCache = new Cache<Misskey.entities.Clip[]>(1000 * 60 * 30, () => misskeyApi('clips/list', { limit: 30 }));
export const rolesCache = new Cache(1000 * 60 * 30, () => misskeyApi('admin/roles/list', { limit: 30 }));
export const noteFlagsCache = new Cache(1000 * 60 * 30, () => iAmModerator ? misskeyApi('admin/note-flags/list', {}) : misskeyApi('note-flags/list', {}));
export const userListsCache = new Cache<Misskey.entities.UserList[]>(1000 * 60 * 30, () => misskeyApi('users/lists/list'));
export const antennasCache = new Cache<Misskey.entities.Antenna[]>(1000 * 60 * 30, () => misskeyApi('antennas/list', { limit: 30 }));
export const favoritedChannelsCache = new Cache<Misskey.entities.Channel[]>(1000 * 60 * 30, () => misskeyApi('channels/my-favorites', { limit: 100 }));
