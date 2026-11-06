import { act, render } from '@testing-library/react';
import React from 'react';
import OaBpmnCanvas from '@/pages/oa/process/design/components/OaBpmnCanvas';

jest.mock('@/pages/oa/process/design/components/bpmnLoader', () => {
  class FakeModeler {
    constructor(options) {
      this.container = options.container;
      this.handlers = {};
      this.updates = [];
      this.registry = new Map();
      this.xml = '';
      this.zoomed = 0;
      this.destroyed = false;
      globalThis.__fakeModeler = this;
    }

    get(name) {
      switch (name) {
        case 'eventBus':
          return {
            on: (event, handler) => {
              this.handlers[event] = handler;
            },
          };
        case 'canvas':
          return {
            zoom: () => {
              this.zoomed += 1;
            },
          };
        case 'elementRegistry':
          return {
            get: (id) => this.registry.get(id),
          };
        case 'modeling':
          return {
            updateProperties: (element, properties) => {
              this.updates.push({ id: element.id, properties });
            },
          };
        case 'moddle':
          return {
            create: (type, attributes) => ({ $type: type, ...attributes }),
          };
        case 'commandStack':
          return { undo: jest.fn(), redo: jest.fn() };
        default:
          return null;
      }
    }

    async importXML(xml) {
      this.xml = xml;
    }

    async saveXML() {
      return { xml: this.xml };
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return {
    loadOaBpmnConstructors: async () => ({
      Modeler: FakeModeler,
      NavigatedViewer: FakeModeler,
    }),
  };
});

function renderCanvas(props = {}) {
  const ref = React.createRef();
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  render(
    <OaBpmnCanvas
      ref={ref}
      xml="<definitions/>"
      onReady={resolveReady}
      {...props}
    />,
  );
  const settle = () =>
    act(async () => {
      await ready;
    });
  return { ref, settle };
}

describe('OaBpmnCanvas', () => {
  it('导入模型，写回名称与审批范围并导出', async () => {
    const { ref, settle } = renderCanvas();
    await settle();
    const modeler = globalThis.__fakeModeler;
    modeler.registry.set('Activity_approve', {
      id: 'Activity_approve',
      businessObject: { id: 'Activity_approve' },
    });

    ref.current.updateName('Activity_approve', '复核');
    ref.current.updateUserTask('Activity_approve', {
      candidateUsers: 'user1,user2',
      candidateGroups: '   ',
    });

    expect(modeler.updates).toEqual([
      { id: 'Activity_approve', properties: { name: '复核' } },
      {
        id: 'Activity_approve',
        properties: {
          assignee: undefined,
          candidateUsers: 'user1,user2',
          candidateGroups: undefined,
        },
      },
    ]);
    expect(modeler.zoomed).toBe(1);
    await expect(ref.current.exportXML()).resolves.toBe('<definitions/>');
  });

  it('写入条件、默认连线与定时器时使用正确的模型属性', async () => {
    const { ref, settle } = renderCanvas();
    await settle();
    const modeler = globalThis.__fakeModeler;
    modeler.registry.set('Flow_2', {
      id: 'Flow_2',
      businessObject: { id: 'Flow_2' },
    });
    modeler.registry.set('Flow_3', {
      id: 'Flow_3',
      businessObject: { id: 'Flow_3' },
    });
    modeler.registry.set('Gateway_1', {
      id: 'Gateway_1',
      businessObject: { id: 'Gateway_1' },
    });
    modeler.registry.set('Boundary_1', {
      id: 'Boundary_1',
      businessObject: { id: 'Boundary_1' },
    });

    ref.current.updateCondition('Flow_2', '${amount > 1000}');
    ref.current.updateDefaultFlow('Gateway_1', 'Flow_3');
    ref.current.updateTimer('Boundary_1', 'timeDuration', 'PT24H');

    expect(modeler.updates[0].properties.conditionExpression).toEqual({
      $type: 'bpmn:FormalExpression',
      body: '${amount > 1000}',
    });
    expect(modeler.updates[1]).toEqual({
      id: 'Gateway_1',
      properties: { default: { id: 'Flow_3' } },
    });
    const timer = modeler.updates[2].properties.eventDefinitions[0];
    expect(timer.$type).toBe('bpmn:TimerEventDefinition');
    expect(timer.timeDuration.body).toBe('PT24H');
  });

  it('把画布选中项转换为属性面板数据', async () => {
    const onSelectionChange = jest.fn();
    const { ref, settle } = renderCanvas({ onSelectionChange });
    await settle();
    const modeler = globalThis.__fakeModeler;

    const flow = {
      id: 'Flow_2',
      businessObject: {
        $type: 'bpmn:SequenceFlow',
        id: 'Flow_2',
        name: '高额',
        conditionExpression: { body: '${amount > 1000}' },
      },
      source: {
        businessObject: {
          $type: 'bpmn:ExclusiveGateway',
          default: { id: 'Flow_2' },
        },
      },
      outgoing: [{ businessObject: { id: 'EndEvent_1', name: '' } }],
    };
    act(() => {
      modeler.handlers['selection.changed']({ newSelection: [flow] });
    });

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'Flow_2',
        type: 'SequenceFlow',
        isSequenceFlow: true,
        sourceType: 'ExclusiveGateway',
        sourceIsDefault: true,
        condition: '${amount > 1000}',
      }),
    );
    expect(ref.current.getSelection()).toEqual(
      expect.objectContaining({ id: 'Flow_2', sourceIsDefault: true }),
    );
  });
});
