import './_common';
import {Document} from 'graphql';
import gql from 'graphql-tag';
import {graphql, wrapPrototype, assignInput, GraphqlInput} from '../src/graphql';
import {Angular2Apollo} from '../src';

const query: Document = gql`
    query getBar {
        bar {
            name
        }
    }
`;

const mutation: Document = gql`
    mutation changeBar {
        changeBar {
            name
        }
    }
`;

const subscription: Document = gql`
    subscription dataChange {
        dataChange {
            name
        }
    }
`;

const subscription2: Document = gql`
    subscription dataRemove {
        dataRemove {
            name
        }
    }
`;

describe('wrapPrototype', () => {
  it('should replace with a new method and keep the old one', () => {
    const spy1 = jest.fn();
    const spy2 = jest.fn();

    class Foo {
      public bar() {
        spy1();
      }
    }

    wrapPrototype(Foo)('bar', function () {
      spy2();
    });

    (new Foo()).bar();

    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });
});

describe('assignInput', () => {
  it('should assign a input', () => {
    const spy = jest.fn();
    const input: GraphqlInput = {query};

    /* tslint:disable:variable-name */
    class Foo {
      public __apollo = {
        watchQuery(options) {
          spy(options);
        },
      } as Angular2Apollo;
    }

    const foo = new Foo;

    assignInput(foo)(input);

    expect(spy).toHaveBeenCalledWith({
      query: input['query'],
    });
  });
});

describe('graphql', () => {
  let spyWatchQuery: jest.Mock<any>;
  let spyConstructor: jest.Mock<any>;
  let foo: any;
  const input: GraphqlInput = {
    query,
  };

  beforeEach(() => {
    spyWatchQuery = jest.fn();
    spyConstructor = jest.fn();

    const mock = {
      watchQuery(options) {
        spyWatchQuery(options);
        return options;
      },
    };

    @graphql([input])
    class Foo {
      public getBar: any;
      public ngOnInit: Function;

      constructor(...args: any[]) {
        spyConstructor(...args);
      }
    }

    foo = new Foo(mock);

    foo.ngOnInit();
  });

  it('should not include Angular2Apollo in the constructor', () => {
    expect(spyConstructor).toHaveBeenCalledWith();
  });
});

describe(`graphql - query, mutation, subscribe`, () => {
  let spyWatchQuery;
  let spyMutate;
  let spySubscribeToMore;

  const mock = {
    watchQuery(options) {
      spyWatchQuery(options);
      return {
        subscribeToMore: (opts) => {
          spySubscribeToMore(opts);
        },
      };
    },
    mutate(options) {
      spyMutate(options);
      return options;
    },
  };

  beforeEach(() => {
    spyWatchQuery = jest.fn();
    spyMutate = jest.fn();
    spySubscribeToMore = jest.fn();
  });

  const createInstance = (decoratorConfig: GraphqlInput[]) => {
    @graphql(decoratorConfig)
    class Foo {
      public ngOnInit: Function;
      public test: Function;
      public test2: Function;

      /* tslint:disable:no-empty */
      constructor(...args: any[]) {

      }
    }

    return new Foo(mock);
  };

  it('query - should execute watchQuery with the correct query object', () => {
    let input = [{
      query,
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(spyWatchQuery).toBeCalledWith({query});
  });

  it('query - should execute watchQuery with the correct query options', () => {
    let options = {
      variables: {
        test: 1,
      },
    };

    let input = [{
      query,
      options,
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(spyWatchQuery).toBeCalledWith({query, variables: options.variables});
  });

  it('query - should execute watchQuery with the correct query options (options as function)', () => {
    let optionsValue = {
      variables: {
        test: 1,
      },
    };

    let options = () => {
      return optionsValue;
    };

    let input = [{
      query,
      options,
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(spyWatchQuery).toBeCalledWith({query, variables: optionsValue.variables});
  });

  it('query - should execute options function with the correct context', () => {
    let context = null;

    let options = (c) => {
      context = c;
    };

    let input = [{
      query,
      options,
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(context).toBe(foo);
  });

  it('query with subscriptions - should support object', () => {
    let input = [{
      query,
      subscriptions: {
        subscription: subscription,
        name: 'test',
      },
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(foo.test).toBeDefined();
    expect(typeof foo.test).toBe('function');
  });

  it('query with subscriptions - should support array of objects', () => {
    let input = [{
      query,
      subscriptions: [
        {
          subscription: subscription,
          name: 'test',
        },
        {
          subscription: subscription2,
          name: 'test2',
        },
      ],
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(foo.test).toBeDefined();
    expect(typeof foo.test).toBe('function');
    expect(foo.test2).toBeDefined();
    expect(typeof foo.test2).toBe('function');
  });

  it('query with subscriptions - should create subscription on call', () => {
    let input = [{
      query,
      subscriptions: {
        subscription: subscription,
        name: 'test',
      },
    }];
    let foo = createInstance(input);
    foo.ngOnInit();
    foo.test();

    expect(spySubscribeToMore).toBeCalled();
  });

  it('query with subscriptions - should create subscription with variables and updateQueries', () => {
    const updateQueries = () => {};
    const variables = {
      test: 1,
    };

    let input = [{
      query,
      subscriptions: {
        subscription: subscription,
        name: 'test',
        variables,
        updateQueries,
      },
    }];
    let foo = createInstance(input);
    foo.ngOnInit();
    foo.test();

    expect(spySubscribeToMore).toBeCalledWith({ document: subscription, variables, updateQueries});
  });

  it('query with subscriptions - should execute subscription with variables and updateQueries', () => {
    const updateQueries = () => {};
    const variables = {
      test: 1,
    };

    let input = [{
      query,
      subscriptions: {
        subscription: subscription,
        name: 'test',
      },
    }];
    let foo = createInstance(input);
    foo.ngOnInit();
    foo.test({
      variables,
      updateQueries,
    });

    expect(spySubscribeToMore).toBeCalledWith({ document: subscription, variables, updateQueries});
  });

  it('query - should execute watchQuery with the correct query options (options as function with fragments)', () => {
    let optionsValue = {
      variables: {
        test: 1,
      },
      fragments: [
        {},
      ],
    };

    let options = () => {
      return optionsValue;
    };

    let input = [{
      query,
      options,
    }];
    let foo = createInstance(input);
    foo.ngOnInit();

    expect(spyWatchQuery).toBeCalledWith({query, variables: optionsValue.variables, fragments: optionsValue.fragments});
  });

  it('mutation - should create execution method on the instance', () => {
    let foo = createInstance([{
      name: 'myMutation',
      mutation,
    }]);

    foo.ngOnInit();

    expect(foo['myMutation']).toBeDefined();
    expect(typeof foo['myMutation']).toBe('function');
  });

  it('mutation - should trigger mutation when executed (without params on call)', () => {
    let foo = createInstance([{
      name: 'mutation',
      mutation,
    }]);

    foo.ngOnInit();
    foo['mutation']();

    expect(spyMutate).toBeCalledWith({mutation});
  });

  const createMutationAndExecuteWith = (executionOptions?: any) => {
    const executionOptionsString = Object.keys(executionOptions).join(', ');

    it(`mutation - should trigger mutation when executed (with ${executionOptionsString})`, () => {
      let foo = createInstance([{
        name: 'mutation',
        mutation,
      }]);

      foo.ngOnInit();
      foo['mutation'](executionOptions);

      expect(spyMutate).toBeCalledWith(Object.assign({mutation}, executionOptions));
    });
  };

  const createMutationWithBase = (creationOptions: any = {}) => {
    const creationOptionsString = Object.keys(creationOptions).join(', ');
    return {
      andExecuteWith: (executionOptions: any = {}) => {
        const executionOptionsString = Object.keys(executionOptions).join(', ');

        it(`mutation - should create with (${creationOptionsString}) and trigger with ${executionOptionsString}`, () => {
          let foo = createInstance([Object.assign({
            name: 'mutation',
            mutation,
          }, creationOptions)]);

          foo.ngOnInit();
          foo['mutation'](executionOptions);

          expect(spyMutate).toBeCalledWith(Object.assign({mutation}, creationOptions, executionOptions));
        });
      },
    };
  };

  createMutationAndExecuteWith({
    variables: {
      test: 1,
    },
  });

  createMutationAndExecuteWith({
    variables: {
      test: 1,
    },
    updateQueries: () => {

    },
  });

  createMutationAndExecuteWith({
    optimisticResponse: {
      __typename: 'changeBar',
      name: 'Test',
    },
  });

  createMutationWithBase({
    updateQueries: () => {

    },
  }).andExecuteWith();

  // Need to use both updateQueries and variables
  createMutationWithBase({
    updateQueries: () => {

    },
  }).andExecuteWith({
    variables: {
      test: 2,
    },
  });

  // Need to override variables
  createMutationWithBase({
    variables: {
      test: 1,
    },
  }).andExecuteWith({
    variables: {
      test: 2,
    },
  });

  // Need to merge variables
  createMutationWithBase({
    variables: {
      test1: 1,
    },
  }).andExecuteWith({
    variables: {
      test2: 2,
    },
  });
});
