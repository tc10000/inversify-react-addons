import 'reflect-metadata';
import { Container, injectable, unmanaged } from 'inversify';
import * as React from 'react';
import { useState } from 'react';
import * as renderer from 'react-test-renderer';
import { assert, IsExact } from 'conditional-type-checks';

import * as hooksModule from '../src/hooks'; // for jest.spyOn
import {
    useOptionalAllInjections,
} from '../src';
import { Provider } from 'inversify-react';

// We want to test types around hooks with signature overloads (as it's more complex),
// but don't actually execute them,
// so we wrap test code into a dummy function just for TypeScript compiler
function staticTypecheckOnly(_fn: () => void) {
    return () => { };
}

function throwErr(msg: string): never {
    throw new Error(msg);
}

@injectable()
class Foo {
    readonly name = 'foo';
}

@injectable()
class Bar {
    readonly name: string;

    constructor(@unmanaged() tag: string) {
        this.name = 'bar-' + tag;
    }
}

const aTag = 'a-tag';
const bTag = 'b-tag';
const multiId = Symbol('multi-id');

class OptionalService {
    readonly label = 'OptionalService' as const;
}

interface RootComponentProps {
    children?: React.ReactNode;
}

const RootComponent: React.FC<RootComponentProps> = ({ children }) => {
    const [container] = useState(() => {
        const c = new Container();
        c.bind(Foo).toSelf();
        c.bind(Bar).toDynamicValue(() => new Bar('a')).whenTargetNamed(aTag);
        c.bind(Bar).toDynamicValue(() => new Bar('a')).whenTargetTagged(aTag, 'a');
        c.bind(Bar).toDynamicValue(() => new Bar('b')).whenTargetNamed(bTag);
        c.bind(multiId).toConstantValue('x');
        c.bind(multiId).toConstantValue('y');
        c.bind(multiId).toConstantValue('z');
        return c;
    });
    return (
        <Provider container={container}>
            <div>{children}</div>
        </Provider>
    );
};

describe('useOptionalAllInjections hook', () => {
    const hookSpy = jest.spyOn(hooksModule, 'useOptionalAllInjections');

    afterEach(() => {
        hookSpy.mockClear();
    });

    // hook with overloads, so we test types
    test('types', staticTypecheckOnly(() => {
        const opt = useOptionalAllInjections(Foo);
        assert<IsExact<typeof opt, readonly Foo[] | undefined>>(true);
    }));

    test('returns undefined for missing injection/binding', () => {
        const ChildComponent = () => {
            const optionalThing = useOptionalAllInjections(OptionalService);
            return (
                <>
                    {optionalThing === undefined ? 'missing' : throwErr('unexpected')}
                </>
            );
        };

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent />
            </RootComponent>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveReturnedWith(undefined);
        expect(tree.children).toEqual(['missing']);
    });

    test('resolves if injection/binding exists', () => {
        const ChildComponent = () => {
            const foos = useOptionalAllInjections(Foo);
            return (
                <>
                    {foos !== undefined ? foos[0].name : throwErr('Cannot resolve injection for Foo')}
                </>
            );
        };

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent />
            </RootComponent>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(tree.children).toEqual(['foo']);
    });
});