import { TranslationManager } from '../core/manager';
import { getProviderInstances, PROVIDER_NAMES } from '../core/config';
import { withProviderInstance } from '../core/providerScope';
import { Secrets } from '../core/secrets';
import { TranslationProvider } from '../core/types';
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
  const base = new Map<string, TranslationProvider>([
    new GoogleFreeProvider(), new BingWebProvider(), new MyMemoryProvider(),
    new LibreTranslateProvider(secrets), new DeepLProvider(secrets), new AzureProvider(secrets),
    new GoogleCloudProvider(secrets), new BaiduProvider(secrets), new TencentProvider(secrets),
    new OpenAICompatibleProvider(secrets), new OllamaProvider()
  ].map((provider) => [provider.id, provider]));
  manager.clear();
  for (const instance of getProviderInstances()) {
    const provider = base.get(instance.kind);
    if (!provider) continue;
    const scoped: TranslationProvider = {
      id: instance.id,
      kind: instance.kind,
      displayName: `${instance.name} · ${PROVIDER_NAMES[instance.kind]}`,
      maxChars: provider.maxChars,
      isConfigured: () => withProviderInstance(instance, () => provider.isConfigured()),
      translate: (request) => withProviderInstance(instance, () => provider.translate(request))
    };
    manager.register(scoped);
  }
}
