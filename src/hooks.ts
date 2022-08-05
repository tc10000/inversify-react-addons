
import { interfaces } from 'inversify';
import { useContainer } from "inversify-react";

/**
 * Resolves injection if it's bound in container
 */
export function useOptionalAllInjections<T>(
    serviceId: interfaces.ServiceIdentifier<T>,
    resolveDefault: (container: interfaces.Container) => T[] | undefined = () => undefined
): readonly T[] | undefined {
    return useContainer(
        container => container.isBound(serviceId)
            ? container.getAll(serviceId)
            : resolveDefault(container)
    );
}
