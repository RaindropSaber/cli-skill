import type { CAC } from 'cac';
import path from 'node:path';
import { startBrowserRecorder } from '@cli-skill/browser-recorder';
import { getBrowserSkillHome, getResolvedBrowserSkillCliConfig } from '../config';

export function registerBrowserCommands(cli: CAC): void {
  cli
    .command('browser <action>', 'Browser tools')
    .usage('browser record')
    .action(async (action: string) => {
      if (action !== 'record') {
        throw new Error('Usage: cli-skill browser record');
      }

      const config = await getResolvedBrowserSkillCliConfig();
      const storageRoot = path.join(getBrowserSkillHome(), 'browser-recorder');
      const result = await startBrowserRecorder({
        storageRoot,
        browserStorageRoot: config.browserStorageRoot,
        browserProfileRoot: config.browserProfileRoot,
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
