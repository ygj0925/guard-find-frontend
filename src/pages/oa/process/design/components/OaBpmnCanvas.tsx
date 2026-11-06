/**
 * BPMN 画布：bpmn-js 只在组件挂载后动态加载，避免进入设计页就拖慢首屏。
 * 编辑模式使用 Modeler，预览模式使用 NavigatedViewer。
 */
import { Alert, Spin } from 'antd';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { OaBpmnSelection } from '@/utils/oaBpmn';
import { loadOaBpmnConstructors } from './bpmnLoader';
import { FLOWABLE_MODDLE } from './flowableModdle';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

export type OaUserTaskAttributes = {
  assignee?: string;
  candidateUsers?: string;
  candidateGroups?: string;
};

export type OaBpmnCanvasHandle = {
  importXML(xml: string): Promise<void>;
  exportXML(): Promise<string>;
  updateName(id: string, name: string): void;
  updateUserTask(id: string, attributes: OaUserTaskAttributes): void;
  updateServiceTask(id: string, className: string): void;
  updateCondition(flowId: string, expression: string | null): void;
  updateDefaultFlow(gatewayId: string, flowId: string | null): void;
  updateTimer(elementId: string, type: string, value: string): void;
  undo(): void;
  redo(): void;
  zoomFit(): void;
  getSelection(): OaBpmnSelection | null;
};

type OaBpmnCanvasProps = {
  xml: string;
  readOnly?: boolean;
  onSelectionChange?: (selection: OaBpmnSelection | null) => void;
  onChange?: () => void;
  onReady?: () => void;
};

type BpmnInstance = {
  importXML(xml: string): Promise<unknown>;
  saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;
  get<T = any>(name: string): T;
  destroy(): void;
};

function localType(type?: string) {
  return String(type || '').replace(/^bpmn:/, '');
}

function toSelection(element: any): OaBpmnSelection | null {
  const businessObject = element?.businessObject;
  if (!businessObject) return null;
  const type = localType(businessObject.$type);
  const definitions: any[] = Array.isArray(businessObject.eventDefinitions)
    ? businessObject.eventDefinitions
    : [];
  const timer = definitions.find((definition) =>
    String(definition?.$type || '').startsWith('bpmn:Timer'),
  );
  const timerType = timer ? localType(timer.$type) : '';
  const timerValue = timer ? (timer[timerType]?.body ?? '') : '';
  return {
    id: businessObject.id || '',
    type,
    name: businessObject.name || '',
    isProcess: businessObject.$type === 'bpmn:Process',
    isUserTask: businessObject.$type === 'bpmn:UserTask',
    isServiceTask: businessObject.$type === 'bpmn:ServiceTask',
    isSequenceFlow: businessObject.$type === 'bpmn:SequenceFlow',
    isExclusiveGateway: businessObject.$type === 'bpmn:ExclusiveGateway',
    isBoundaryEvent: businessObject.$type === 'bpmn:BoundaryEvent',
    assignee: businessObject.assignee || '',
    candidateUsers: businessObject.candidateUsers || '',
    candidateGroups: businessObject.candidateGroups || '',
    serviceClass: businessObject.class || '',
    condition: businessObject.conditionExpression?.body || '',
    timerType,
    timerValue,
    defaultFlow: businessObject.default?.id || '',
    sourceType: localType(element?.source?.businessObject?.$type),
    sourceIsDefault:
      element?.source?.businessObject?.default?.id === businessObject.id,
    outgoing: Array.isArray(element?.outgoing)
      ? element.outgoing.map((connection: any) => ({
          id: connection?.businessObject?.id || '',
          name: connection?.businessObject?.name || '',
        }))
      : [],
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'BPMN 画布加载失败';
}

const OaBpmnCanvas = forwardRef<OaBpmnCanvasHandle, OaBpmnCanvasProps>(
  ({ xml, readOnly = false, onSelectionChange, onChange, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<BpmnInstance | null>(null);
    const selectionRef = useRef<OaBpmnSelection | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const callbacks = useRef({ onSelectionChange, onChange, onReady });
    useEffect(() => {
      callbacks.current = { onSelectionChange, onChange, onReady };
    }, [onSelectionChange, onChange, onReady]);

    const setSelection = (selection: OaBpmnSelection | null) => {
      selectionRef.current = selection;
      callbacks.current.onSelectionChange?.(selection);
    };

    const requireInstance = () => {
      const instance = instanceRef.current;
      if (!instance) throw new Error('BPMN 画布尚未就绪');
      return instance;
    };

    const refreshSelection = (instance: BpmnInstance, id: string) => {
      if (selectionRef.current?.id !== id) return;
      const element = instance.get('elementRegistry').get(id);
      if (element) setSelection(toSelection(element));
    };

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      const bootstrap = async () => {
        const { Modeler, NavigatedViewer } = await loadOaBpmnConstructors();
        if (cancelled || !containerRef.current) return;
        const Constructor = readOnly ? NavigatedViewer : Modeler;
        const instance = new Constructor({
          container: containerRef.current,
          moddleExtensions: { flowable: FLOWABLE_MODDLE },
        }) as BpmnInstance;
        instanceRef.current = instance;

        instance.get('eventBus').on('selection.changed', (event: any) => {
          const element = event?.newSelection?.[0];
          setSelection(element ? toSelection(element) : null);
        });
        instance.get('eventBus').on('commandStack.changed', () => {
          callbacks.current.onChange?.();
        });

        await instance.importXML(xml);
        instance.get('canvas').zoom('fit-viewport', 'auto');
        if (cancelled) return;
        setLoading(false);
        callbacks.current.onReady?.();
      };

      bootstrap().catch((reason) => {
        if (cancelled) return;
        setError(errorMessage(reason));
        setLoading(false);
      });

      return () => {
        cancelled = true;
        instanceRef.current?.destroy();
        instanceRef.current = null;
        selectionRef.current = null;
      };
    }, [readOnly, xml]);

    useImperativeHandle(
      ref,
      (): OaBpmnCanvasHandle => ({
        async importXML(nextXml: string) {
          const instance = requireInstance();
          await instance.importXML(nextXml);
          instance.get('canvas').zoom('fit-viewport', 'auto');
          setSelection(null);
        },
        async exportXML() {
          const instance = requireInstance();
          const result = await instance.saveXML({ format: true });
          if (!result?.xml) throw new Error('BPMN 导出为空');
          return result.xml;
        },
        updateName(id: string, name: string) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(id);
          if (!element) return;
          instance
            .get('modeling')
            .updateProperties(element, { name: name.trim() || undefined });
          refreshSelection(instance, id);
        },
        updateUserTask(id: string, attributes: OaUserTaskAttributes) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(id);
          if (!element) return;
          instance.get('modeling').updateProperties(element, {
            assignee: attributes.assignee?.trim() || undefined,
            candidateUsers: attributes.candidateUsers?.trim() || undefined,
            candidateGroups: attributes.candidateGroups?.trim() || undefined,
          });
          refreshSelection(instance, id);
        },
        updateServiceTask(id: string, className: string) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(id);
          if (!element) return;
          instance.get('modeling').updateProperties(element, {
            class: className.trim() || undefined,
          });
          refreshSelection(instance, id);
        },
        updateCondition(flowId: string, expression: string | null) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(flowId);
          if (!element) return;
          const modeling = instance.get('modeling');
          if (!expression?.trim()) {
            modeling.updateProperties(element, {
              conditionExpression: undefined,
            });
            refreshSelection(instance, flowId);
            return;
          }
          const condition = instance
            .get('moddle')
            .create('bpmn:FormalExpression', { body: expression.trim() });
          modeling.updateProperties(element, {
            conditionExpression: condition,
          });
          refreshSelection(instance, flowId);
        },
        updateDefaultFlow(gatewayId: string, flowId: string | null) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(gatewayId);
          if (!element) return;
          const flow = flowId
            ? instance.get('elementRegistry').get(flowId)
            : null;
          instance.get('modeling').updateProperties(element, {
            default: flow?.businessObject,
          });
          refreshSelection(instance, gatewayId);
        },
        updateTimer(elementId: string, type: string, value: string) {
          const instance = requireInstance();
          const element = instance.get('elementRegistry').get(elementId);
          if (!element) return;
          const modeling = instance.get('modeling');
          if (!type) {
            modeling.updateProperties(element, { eventDefinitions: [] });
            return;
          }
          const moddle = instance.get('moddle');
          const definition = moddle.create('bpmn:TimerEventDefinition', {});
          definition[type] = moddle.create('bpmn:FormalExpression', {
            body: value.trim(),
          });
          modeling.updateProperties(element, {
            eventDefinitions: [definition],
          });
          refreshSelection(instance, elementId);
        },
        undo() {
          const instance = requireInstance();
          instance.get('commandStack').undo();
          const selected = selectionRef.current;
          if (selected) refreshSelection(instance, selected.id);
        },
        redo() {
          const instance = requireInstance();
          instance.get('commandStack').redo();
          const selected = selectionRef.current;
          if (selected) refreshSelection(instance, selected.id);
        },
        zoomFit() {
          requireInstance().get('canvas').zoom('fit-viewport', 'auto');
        },
        getSelection() {
          return selectionRef.current;
        },
      }),
      [],
    );

    return (
      <div style={{ position: 'relative', minHeight: 480 }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: 560,
            background: readOnly ? '#fafafa' : '#fff',
          }}
        />
        {loading && !error ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spin tip="正在加载流程画布…">
              <div style={{ width: 120, height: 40 }} />
            </Spin>
          </div>
        ) : null}
        {error ? (
          <div style={{ position: 'absolute', inset: 16 }}>
            <Alert
              type="error"
              showIcon
              message="画布加载失败"
              description={error}
            />
          </div>
        ) : null}
      </div>
    );
  },
);

export default OaBpmnCanvas;
