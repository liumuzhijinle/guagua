import { createStorage, StorageEnum } from '../base/index.js';

export type SubtitleSettings = {
  fontColor: string;
  fontSize: number;
};

const storage = createStorage<SubtitleSettings>(
  'subtitle-settings-storage-key',
  {
    fontColor: '#ffffff',
    fontSize: 24,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const subtitleSettingsStorage = storage;
