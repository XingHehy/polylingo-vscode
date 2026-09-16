import { AsyncLocalStorage } from 'async_hooks';
import { ProviderInstance } from './types';

const scope = new AsyncLocalStorage<ProviderInstance>();

export function currentProviderInstance(): ProviderInstance | undefined {
  return scope.getStore();
}

export function withProviderInstance<T>(instance: ProviderInstance, task: () => Promise<T> | T): Promise<T> {
  return Promise.resolve(scope.run(instance, task));
}
