import { TranslationManager } from '../core/manager';
import { Secrets } from '../core/secrets';
import { AzureProvider } from './azure';
import { BaiduProvider } from './baidu';
import { BingWebProvider } from './bingWeb';
import { DeepLProvider } from './deepL';
import { GoogleCloudProvider } from './googleCloud';
import { GoogleFreeProvider } from './googleFree';
import { LibreTranslateProvider } from './libreTranslate';
import { MyMemoryProvider } from './myMemory';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openAICompatible';
import { TencentProvider } from './tencent';

export function registerProviders(manager: TranslationManager, secrets: Secrets): void {
  manager.register(new GoogleFreeProvider());
  manager.register(new BingWebProvider());
  manager.register(new MyMemoryProvider());
  manager.register(new LibreTranslateProvider(secrets));
  manager.register(new DeepLProvider(secrets));
  manager.register(new AzureProvider(secrets));
  manager.register(new GoogleCloudProvider(secrets));
  manager.register(new BaiduProvider(secrets));
  manager.register(new TencentProvider(secrets));
  manager.register(new OpenAICompatibleProvider(secrets));
  manager.register(new OllamaProvider());
}
