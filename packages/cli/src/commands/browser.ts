import type { CAC } from 'cac';
import path from 'node:path';
import { startBrowserRecorder } from '@cli-skill/browser-recorder';
import { syncBrowserUserData } from '../browser/sync';
import { getCliSkillHome, getResolvedCliSkillConfig } from '../config';

export function registerBrowserCommands(cli: CAC): void {
  cli
    .command('browser <action>', 'Browser tools')
    .usage('browser record\n  cli-skill browser sync')
    .action(async (action: string) => {
      const config = await getResolvedCliSkillConfig();

      if (action === 'record') {
        const storageRoot = path.join(getCliSkillHome(), 'browser-recorder');
        const result = await startBrowserRecorder({
          storageRoot,
          browserExecutablePath: config.browserExecutablePath,
          browserUserDataDir: config.browserUserDataDir,
        });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (action === 'sync') {
        const result = await syncBrowserUserData({
          sourceDir: config.browserSourceUserDataDir,
          targetDir: config.browserUserDataDir,
        });
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      throw new Error('Usage: cli-skill browser record | cli-skill browser sync');
    });
}
