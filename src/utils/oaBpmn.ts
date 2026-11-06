/**
 * OA BPMN 前端预检与条件编译。
 *
 * 与服务端 `OaBpmnValidator` / `OaConditionRuleCompiler` 保持同一套白名单思路，
 * 但服务端仍是最终裁决方；这里只负责设计期的即时提示，不替代发布校验。
 */

export const OA_BPMN_NAMESPACES = {
  bpmn: 'http://www.omg.org/spec/BPMN/20100524/MODEL',
  bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
  dc: 'http://www.omg.org/spec/DD/20100524/DC',
  di: 'http://www.omg.org/spec/DD/20100524/DI',
  flowable: 'http://flowable.org/bpmn',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

export const OA_BPMN_LIMITS = {
  maxBytes: 512 * 1024,
  maxFlowNodes: 200,
  maxElements: 2000,
} as const;

const FLOW_NODE_TYPES = new Set([
  'startEvent',
  'endEvent',
  'userTask',
  'serviceTask',
  'exclusiveGateway',
  'parallelGateway',
  'boundaryEvent',
]);

const ALLOWED_BPMN_ELEMENTS = new Set([
  ...FLOW_NODE_TYPES,
  'definitions',
  'process',
  'sequenceFlow',
  'conditionExpression',
  'timerEventDefinition',
  'timeDuration',
  'timeDate',
  'timeCycle',
  'incoming',
  'outgoing',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  definitions: new Set([
    'id',
    'targetNamespace',
    'name',
    'exporter',
    'exporterVersion',
  ]),
  process: new Set(['id', 'name', 'isExecutable']),
  startEvent: new Set(['id', 'name']),
  endEvent: new Set(['id', 'name']),
  userTask: new Set(['id', 'name']),
  serviceTask: new Set(['id', 'name']),
  exclusiveGateway: new Set(['id', 'name', 'default']),
  parallelGateway: new Set(['id', 'name']),
  boundaryEvent: new Set(['id', 'name', 'attachedToRef', 'cancelActivity']),
  sequenceFlow: new Set(['id', 'name', 'sourceRef', 'targetRef']),
  conditionExpression: new Set(['id', 'name']),
  timerEventDefinition: new Set(['id']),
  timeDuration: new Set(['id']),
  timeDate: new Set(['id']),
  timeCycle: new Set(['id']),
  incoming: new Set(),
  outgoing: new Set(),
};

const DIAGRAM_ELEMENTS = new Set([
  'BPMNDiagram',
  'BPMNPlane',
  'BPMNShape',
  'BPMNEdge',
  'BPMNLabel',
]);
const SHAPE_ELEMENTS = new Set(['Bounds']);
const WAYPOINT_ELEMENTS = new Set(['waypoint']);
const TIMER_TYPES = new Set(['timeDuration', 'timeDate', 'timeCycle']);
export const OA_BPMN_TIMER_TYPES = [
  'timeDuration',
  'timeDate',
  'timeCycle',
] as const;
export type OaBpmnTimerType = (typeof OA_BPMN_TIMER_TYPES)[number];

const SIMPLE_EXPRESSION =
  /^\$\{[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*\}$/;
const LITERAL_ASSIGNEE = /^[A-Za-z0-9_.,:-]+$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const ISO_DURATION = /^P[0-9A-Z.]+$/;
const ISO_CYCLE = /^R[0-9]*\/[0-9A-Z./]+$/;
const CRON = /^[0-9*?/,: -]+$/;
const ISO_DATE = /^[0-9T:.+\-Z]+$/;
const NUMBER = /^-?\d+(?:\.\d+)?$/;

const RESERVED_WORDS = new Set([
  'and',
  'or',
  'not',
  'eq',
  'ne',
  'lt',
  'le',
  'gt',
  'ge',
  'div',
  'mod',
  'empty',
  'null',
  'instanceof',
  'new',
]);

export type OaBpmnSelection = {
  id: string;
  type: string;
  name: string;
  isProcess: boolean;
  isUserTask: boolean;
  isServiceTask: boolean;
  isSequenceFlow: boolean;
  isExclusiveGateway: boolean;
  isBoundaryEvent: boolean;
  assignee: string;
  candidateUsers: string;
  candidateGroups: string;
  serviceClass: string;
  condition: string;
  timerType: string;
  timerValue: string;
  defaultFlow: string;
  sourceType: string;
  sourceIsDefault: boolean;
  outgoing: { id: string; name: string }[];
};

export type OaBpmnSummary = {
  processId: string;
  processName: string;
  nodeCount: number;
  userTaskCount: number;
  serviceTaskCount: number;
  gatewayCount: number;
  boundaryTimerCount: number;
  conditionCount: number;
  userTasks: { id: string; name: string; assignment: string }[];
};

export type OaBpmnValidationReport = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: OaBpmnSummary;
};

export type OaConditionOperator =
  | 'EQ'
  | 'NE'
  | 'GT'
  | 'GE'
  | 'LT'
  | 'LE'
  | 'IN'
  | 'NOT_IN';

export type OaConditionValue = string | number | boolean;

export type OaConditionItem = {
  field: string;
  operator: OaConditionOperator;
  value: OaConditionValue | OaConditionValue[];
};

export type OaConditionRule = {
  combinator: 'AND' | 'OR';
  items: OaConditionItem[];
};

const EMPTY_SUMMARY: OaBpmnSummary = {
  processId: '',
  processName: '',
  nodeCount: 0,
  userTaskCount: 0,
  serviceTaskCount: 0,
  gatewayCount: 0,
  boundaryTimerCount: 0,
  conditionCount: 0,
  userTasks: [],
};

function utf8Length(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return new Blob([value]).size;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function defaultOaBpmnXml(
  processKey = 'oa_process',
  processName = '新流程',
): string {
  const key = escapeXml(processKey);
  const name = escapeXml(processName);
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  xmlns:flowable="http://flowable.org/bpmn"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  id="Definitions_1" targetNamespace="http://guardfind.com/oa/bpmn">
  <bpmn:process id="${key}" name="${name}" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="发起">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Activity_approve" name="审批" flowable:candidateUsers="\${approver}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1" name="结束">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_approve"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_approve" targetRef="EndEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${key}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="160" y="160" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_approve_di" bpmnElement="Activity_approve">
        <dc:Bounds x="250" y="140" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="410" y="160" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="196" y="178"/>
        <di:waypoint x="250" y="180"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="180"/>
        <di:waypoint x="410" y="178"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

export function validateOaBpmnXml(xml: string): OaBpmnValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summary: OaBpmnSummary = { ...EMPTY_SUMMARY, userTasks: [] };
  const fail = (message: string): OaBpmnValidationReport => ({
    valid: false,
    errors: errors.length ? errors : [message],
    warnings,
    summary,
  });

  if (!xml || !xml.trim()) return fail('BPMN XML 不能为空');
  if (utf8Length(xml) > OA_BPMN_LIMITS.maxBytes) {
    return fail(`BPMN XML 超过 ${OA_BPMN_LIMITS.maxBytes / 1024}KB 限制`);
  }
  const upper = xml.toUpperCase();
  if (upper.includes('<!DOCTYPE') || upper.includes('<!ENTITY')) {
    return fail('BPMN XML 不允许 DTD 或实体声明');
  }

  const document = new DOMParser().parseFromString(xml, 'text/xml');
  if (
    !document.documentElement ||
    document.getElementsByTagName('parsererror').length > 0 ||
    document.documentElement.nodeName === 'parsererror'
  ) {
    return fail('BPMN XML 解析失败');
  }

  const root = document.documentElement;
  if (
    root.namespaceURI !== OA_BPMN_NAMESPACES.bpmn ||
    root.localName !== 'definitions'
  ) {
    errors.push('根节点必须是 BPMN definitions');
  }

  const elements = Array.from(
    document.getElementsByTagNameNS(OA_BPMN_NAMESPACES.bpmn, '*'),
  );
  const allElements = Array.from(document.getElementsByTagName('*'));
  if (allElements.length > OA_BPMN_LIMITS.maxElements) {
    errors.push(`BPMN 元素数量超过 ${OA_BPMN_LIMITS.maxElements}`);
  }

  const ids = new Set<string>();
  const nodes = new Map<string, Element>();
  const flows = new Map<string, Element>();
  for (const element of elements) {
    const type = element.localName;
    if (!ALLOWED_BPMN_ELEMENTS.has(type)) {
      errors.push(`不允许的 BPMN 节点: ${type}`);
      continue;
    }
    validateAttributes(element, type, errors);
    const id = element.getAttribute('id') || '';
    if (id && ids.has(id)) errors.push(`BPMN 节点 id 重复: ${id}`);
    if (id) ids.add(id);
    if (FLOW_NODE_TYPES.has(type)) {
      if (!id) errors.push(`流程节点 ${type} 缺少 id`);
      else nodes.set(id, element);
    } else if (type === 'sequenceFlow') {
      if (!id) errors.push('顺序流缺少 id');
      else flows.set(id, element);
    }
  }

  for (const element of allElements) {
    if (
      element.namespaceURI === OA_BPMN_NAMESPACES.bpmndi &&
      !DIAGRAM_ELEMENTS.has(element.localName)
    ) {
      errors.push(`不允许的 BPMN DI 节点: ${element.localName}`);
    }
    if (
      element.namespaceURI === OA_BPMN_NAMESPACES.dc &&
      !SHAPE_ELEMENTS.has(element.localName)
    ) {
      errors.push(`不允许的图形节点: ${element.localName}`);
    }
    if (
      element.namespaceURI === OA_BPMN_NAMESPACES.di &&
      !WAYPOINT_ELEMENTS.has(element.localName)
    ) {
      errors.push(`不允许的图形节点: ${element.localName}`);
    }
  }

  const processes = elements.filter(
    (element) => element.localName === 'process',
  );
  if (processes.length !== 1) {
    errors.push('必须且只能包含一个流程定义');
  }
  const processElement = processes[0];
  if (processElement) {
    summary.processId = processElement.getAttribute('id') || '';
    summary.processName = processElement.getAttribute('name') || '';
    if (processElement.getAttribute('isExecutable') !== 'true') {
      errors.push('流程必须标记为 isExecutable=true');
    }
    for (const child of Array.from(processElement.children)) {
      if (child.namespaceURI !== OA_BPMN_NAMESPACES.bpmn) continue;
      if (
        !FLOW_NODE_TYPES.has(child.localName) &&
        child.localName !== 'sequenceFlow'
      ) {
        errors.push(`流程下不允许节点: ${child.localName}`);
      }
    }
  }

  if (nodes.size > OA_BPMN_LIMITS.maxFlowNodes) {
    errors.push(`流程节点数量超过 ${OA_BPMN_LIMITS.maxFlowNodes}`);
  }
  if (
    !Array.from(nodes.values()).some((node) => node.localName === 'startEvent')
  ) {
    errors.push('流程缺少开始事件');
  }
  if (
    !Array.from(nodes.values()).some((node) => node.localName === 'endEvent')
  ) {
    errors.push('流程缺少结束事件');
  }

  for (const flow of flows.values()) {
    validateFlow(flow, nodes, errors);
  }

  for (const node of nodes.values()) {
    validateNode(node, nodes, flows, errors, warnings);
  }

  summary.nodeCount = nodes.size;
  summary.userTaskCount = Array.from(nodes.values()).filter(
    (node) => node.localName === 'userTask',
  ).length;
  summary.serviceTaskCount = Array.from(nodes.values()).filter(
    (node) => node.localName === 'serviceTask',
  ).length;
  summary.gatewayCount = Array.from(nodes.values()).filter(
    (node) =>
      node.localName === 'exclusiveGateway' ||
      node.localName === 'parallelGateway',
  ).length;
  summary.boundaryTimerCount = Array.from(nodes.values()).filter(
    (node) => node.localName === 'boundaryEvent',
  ).length;
  summary.conditionCount = elements.filter(
    (element) => element.localName === 'conditionExpression',
  ).length;
  summary.userTasks = Array.from(nodes.values())
    .filter((node) => node.localName === 'userTask')
    .map((node) => ({
      id: node.getAttribute('id') || '',
      name: node.getAttribute('name') || '',
      assignment: assignmentOf(node),
    }));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

function validateAttributes(element: Element, type: string, errors: string[]) {
  const allowed = ALLOWED_ATTRIBUTES[type];
  if (!allowed) return;
  for (const attr of Array.from(element.attributes)) {
    if (attr.namespaceURI === 'http://www.w3.org/2000/xmlns/') continue;
    const name = attr.localName || attr.name;
    if (!attr.namespaceURI) {
      if (!allowed.has(name)) errors.push(`节点 ${type} 不允许属性 ${name}`);
      continue;
    }
    if (attr.namespaceURI === OA_BPMN_NAMESPACES.xsi) {
      if (type === 'definitions' && name === 'schemaLocation') continue;
      if (
        (type === 'conditionExpression' || TIMER_TYPES.has(type)) &&
        name === 'type' &&
        /^(bpmn:)?tFormalExpression$/.test(attr.value)
      ) {
        continue;
      }
      errors.push(`节点 ${type} 不允许属性 xsi:${name}`);
      continue;
    }
    if (attr.namespaceURI === OA_BPMN_NAMESPACES.flowable) {
      if (!isAllowedFlowableAttribute(type, name)) {
        errors.push(`节点 ${type} 不允许属性 flowable:${name}`);
      }
      continue;
    }
    errors.push(`节点 ${type} 不允许扩展属性 ${name}`);
  }
}

function isAllowedFlowableAttribute(type: string, name: string) {
  if (type === 'userTask') {
    return ['assignee', 'candidateUsers', 'candidateGroups'].includes(name);
  }
  return type === 'serviceTask' && name === 'class';
}

function validateNode(
  node: Element,
  nodes: Map<string, Element>,
  flows: Map<string, Element>,
  errors: string[],
  warnings: string[],
) {
  const id = node.getAttribute('id') || '';
  const type = node.localName;
  if (type === 'userTask') {
    if (!assignmentOf(node)) {
      errors.push(`用户任务 ${id} 必须配置审批人变量或候选范围`);
    }
    for (const name of ['assignee', 'candidateUsers', 'candidateGroups']) {
      validateAssignment(
        node.getAttributeNS(OA_BPMN_NAMESPACES.flowable, name) || '',
        name,
        id,
        errors,
      );
    }
  }
  if (type === 'serviceTask') {
    if (!node.getAttributeNS(OA_BPMN_NAMESPACES.flowable, 'class')?.trim()) {
      errors.push(`服务任务 ${id} 必须配置 flowable:class`);
    }
    warnings.push(`服务任务 ${id} 的处理器需在服务端白名单中`);
  }
  if (type === 'boundaryEvent') {
    const attachedTo = node.getAttribute('attachedToRef') || '';
    const target = nodes.get(attachedTo);
    if (!target || target.localName !== 'userTask') {
      errors.push('边界定时事件只能挂在用户任务上');
    }
    const timers = Array.from(node.children).filter(
      (child) =>
        child.namespaceURI === OA_BPMN_NAMESPACES.bpmn &&
        child.localName === 'timerEventDefinition',
    );
    if (timers.length !== 1) {
      errors.push(`边界事件 ${id} 必须且只能包含一个定时器`);
    } else {
      validateTimer(timers[0], id, errors);
    }
  }
  if (type === 'exclusiveGateway') {
    const defaultFlow = node.getAttribute('default') || '';
    const outgoing = Array.from(flows.values()).filter(
      (flow) => flow.getAttribute('sourceRef') === id,
    );
    const defaultElement = defaultFlow
      ? outgoing.find((flow) => flow.getAttribute('id') === defaultFlow)
      : undefined;
    if (defaultFlow && !defaultElement) {
      errors.push(`排他网关 ${id} 的默认连线无效`);
    }
    if (defaultElement && conditionOf(defaultElement)) {
      errors.push(`排他网关 ${id} 的默认连线 ${defaultFlow} 不能配置条件`);
    }
    if (outgoing.length > 1) {
      for (const flow of outgoing) {
        if (flow.getAttribute('id') === defaultFlow) continue;
        if (!conditionOf(flow)) {
          errors.push(
            `排他网关 ${id} 的输出连线 ${flow.getAttribute('id')} 缺少条件`,
          );
        }
      }
    }
  }
}

function validateFlow(
  flow: Element,
  nodes: Map<string, Element>,
  errors: string[],
) {
  const id = flow.getAttribute('id') || '';
  const sourceRef = flow.getAttribute('sourceRef') || '';
  const targetRef = flow.getAttribute('targetRef') || '';
  const source = nodes.get(sourceRef);
  const target = nodes.get(targetRef);
  if (!source) errors.push(`顺序流 ${id} 的来源节点无效`);
  if (!target) errors.push(`顺序流 ${id} 的目标节点无效`);
  if (target?.localName === 'boundaryEvent') {
    errors.push(`顺序流 ${id} 不能指向边界事件`);
  }
  if (target?.localName === 'startEvent') {
    errors.push(`顺序流 ${id} 不能指向开始事件`);
  }
  if (source?.localName === 'endEvent') {
    errors.push('结束事件不能有输出连线');
  }
  const conditions = Array.from(flow.children).filter(
    (child) =>
      child.namespaceURI === OA_BPMN_NAMESPACES.bpmn &&
      child.localName === 'conditionExpression',
  );
  if (conditions.length > 1) {
    errors.push(`顺序流 ${id} 只能有一个条件表达式`);
  }
  for (const condition of conditions) {
    if (source?.localName !== 'exclusiveGateway') {
      errors.push('条件表达式只能用于排他网关的输出连线');
    }
    const expression = condition.textContent?.trim() || '';
    const error = oaConditionError(expression);
    if (error) errors.push(`顺序流 ${id} 条件不安全: ${error}`);
  }
  for (const child of Array.from(flow.children)) {
    if (
      child.namespaceURI === OA_BPMN_NAMESPACES.bpmn &&
      child.localName === 'conditionExpression'
    ) {
      continue;
    }
    errors.push(`顺序流 ${id} 不允许子节点: ${child.localName}`);
  }
}

function validateAssignment(
  value: string,
  name: string,
  taskId: string,
  errors: string[],
) {
  const error = validateOaAssignment(value, name);
  if (error) errors.push(`用户任务 ${taskId} 的 ${error}`);
}

export function validateOaAssignment(
  value: string,
  name: string,
): string | null {
  if (!value) return null;
  if (value.includes('${')) {
    return SIMPLE_EXPRESSION.test(value)
      ? null
      : `${name} 只能使用简单变量表达式`;
  }
  return LITERAL_ASSIGNEE.test(value) ? null : `${name} 含有非法字符`;
}

function validateTimer(timer: Element, boundaryId: string, errors: string[]) {
  const settings = Array.from(timer.children).filter(
    (child) =>
      child.namespaceURI === OA_BPMN_NAMESPACES.bpmn &&
      TIMER_TYPES.has(child.localName),
  );
  if (settings.length !== 1) {
    errors.push(`边界事件 ${boundaryId} 必须且只能包含一个定时器`);
    return;
  }
  const setting = settings[0];
  const value = setting.textContent?.trim() || '';
  if (!value) {
    errors.push(`边界事件 ${boundaryId} 的定时器不能为空`);
    return;
  }
  const error = validateOaTimerValue(setting.localName, value);
  if (error) errors.push(`边界事件 ${boundaryId} 的${error}`);
}

export function validateOaTimerValue(
  type: string,
  value: string,
): string | null {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '定时器不能为空';
  if (trimmed.includes('${')) {
    return SIMPLE_EXPRESSION.test(trimmed)
      ? null
      : '定时器只能使用简单变量表达式';
  }
  const valid =
    type === 'timeDuration'
      ? ISO_DURATION.test(trimmed)
      : type === 'timeCycle'
        ? ISO_CYCLE.test(trimmed) || CRON.test(trimmed)
        : ISO_DATE.test(trimmed);
  return valid ? null : '定时器格式非法';
}

function assignmentOf(node: Element) {
  const assignee =
    node.getAttributeNS(OA_BPMN_NAMESPACES.flowable, 'assignee') || '';
  const candidateUsers =
    node.getAttributeNS(OA_BPMN_NAMESPACES.flowable, 'candidateUsers') || '';
  const candidateGroups =
    node.getAttributeNS(OA_BPMN_NAMESPACES.flowable, 'candidateGroups') || '';
  if (assignee) return `指定人 ${assignee}`;
  if (candidateUsers) return `候选用户 ${candidateUsers}`;
  if (candidateGroups) return `候选组 ${candidateGroups}`;
  return '';
}

function conditionOf(flow: Element) {
  const condition = Array.from(flow.children).find(
    (child) =>
      child.namespaceURI === OA_BPMN_NAMESPACES.bpmn &&
      child.localName === 'conditionExpression',
  );
  return condition?.textContent?.trim() || '';
}

export function compileOaConditionRule(rule: OaConditionRule): string {
  if (!rule.items?.length) throw new Error('条件项不能为空');
  const joiner = rule.combinator === 'AND' ? ' && ' : ' || ';
  const parts = rule.items.map(compileConditionItem);
  const expression = `\${${parts.join(joiner)}}`;
  const error = oaConditionError(expression);
  if (error) throw new Error(error);
  return expression;
}

function compileConditionItem(item: OaConditionItem) {
  const field = requireField(item.field);
  switch (item.operator) {
    case 'EQ':
      return `${field} == ${literal(item.value)}`;
    case 'NE':
      return `${field} != ${literal(item.value)}`;
    case 'GT':
      return `${field} > ${literal(item.value)}`;
    case 'GE':
      return `${field} >= ${literal(item.value)}`;
    case 'LT':
      return `${field} < ${literal(item.value)}`;
    case 'LE':
      return `${field} <= ${literal(item.value)}`;
    case 'IN':
      return membership(field, item.value, true);
    case 'NOT_IN':
      return membership(field, item.value, false);
    default:
      throw new Error('不支持的条件操作');
  }
}

function membership(
  field: string,
  value: OaConditionValue | OaConditionValue[],
  inList: boolean,
) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('IN/NOT_IN 条件值必须是集合');
  }
  const joiner = inList ? ' || ' : ' && ';
  const operator = inList ? ' == ' : ' != ';
  const parts = value.map((entry) => field + operator + literal(entry));
  return `(${parts.join(joiner)})`;
}

function requireField(field: string) {
  const trimmed = field?.trim() || '';
  if (!FIELD_PATTERN.test(trimmed)) {
    throw new Error(`条件字段名非法: ${field}`);
  }
  if (
    RESERVED_WORDS.has(trimmed.toLowerCase()) ||
    /^(true|false)$/i.test(trimmed)
  ) {
    throw new Error(`条件字段名不能使用关键字: ${field}`);
  }
  return trimmed;
}

function literal(value: OaConditionValue | OaConditionValue[]): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('条件数值非法');
    return String(value);
  }
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  throw new Error('条件值只支持数字、布尔或字符串');
}

export function parseOaConditionValue(raw: string, list = false) {
  const values = list
    ? raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [raw.trim()];
  if (values.length === 0) throw new Error('条件值不能为空');
  const parsed = values.map(parseScalar);
  return list ? parsed : parsed[0];
}

function parseScalar(raw: string): OaConditionValue {
  if (raw === '') throw new Error('条件值不能为空');
  if (raw.toLowerCase() === 'true') return true;
  if (raw.toLowerCase() === 'false') return false;
  if (NUMBER.test(raw)) return Number(raw);
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    const quote = raw[0];
    const body = raw.slice(1, -1);
    return quote === '"'
      ? body.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : body;
  }
  return raw;
}

export function oaConditionError(expression: string): string | null {
  try {
    requireSafeCondition(expression);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '条件表达式不安全';
  }
}

export function isSafeOaCondition(expression: string): boolean {
  return oaConditionError(expression) === null;
}

export function requireSafeCondition(expression: string) {
  if (!expression?.trim()) throw new Error('条件表达式不能为空');
  const trimmed = expression.trim();
  if (!trimmed.startsWith('${') || !trimmed.endsWith('}')) {
    throw new Error('条件表达式必须使用 ${...} 包裹');
  }
  const body = trimmed.slice(2, -1).trim();
  if (!body) throw new Error('条件表达式不能为空');
  if (body.length > 2000) throw new Error('条件表达式过长');
  if (body.includes('{') || body.includes('}')) {
    throw new Error('条件表达式不允许嵌套花括号');
  }
  new ConditionParser(tokenizeCondition(body)).parse();
}

type ConditionTokenType =
  | 'identifier'
  | 'number'
  | 'string'
  | 'boolean'
  | 'symbol'
  | 'eof';

type ConditionToken = { type: ConditionTokenType; text: string };

function tokenizeCondition(body: string): ConditionToken[] {
  const tokens: ConditionToken[] = [];
  let index = 0;
  while (index < body.length) {
    const current = body[index];
    if (/\s/.test(current)) {
      index++;
      continue;
    }
    if (current === '"' || current === "'") {
      const quote = current;
      let value = '';
      index++;
      let closed = false;
      while (index < body.length) {
        const character = body[index];
        if (character === '\\') {
          if (index + 1 >= body.length)
            throw new Error('条件表达式字符串未闭合');
          value += character + body[index + 1];
          index += 2;
          continue;
        }
        if (character === quote) {
          closed = true;
          index++;
          break;
        }
        value += character;
        index++;
      }
      if (!closed) throw new Error('条件表达式字符串未闭合');
      tokens.push({ type: 'string', text: value });
      continue;
    }
    if (current === '(' || current === ')') {
      tokens.push({ type: 'symbol', text: current });
      index++;
      continue;
    }
    if ('!=<>'.includes(current)) {
      const next = body[index + 1];
      let symbol = current;
      if (next === '=') symbol += '=';
      else if (current === '=') throw new Error('条件表达式不允许单等号');
      if (!['==', '!=', '>', '>=', '<', '<='].includes(symbol)) {
        throw new Error('条件表达式包含非法运算符');
      }
      tokens.push({ type: 'symbol', text: symbol });
      index += symbol.length;
      continue;
    }
    if (current === '&' || current === '|') {
      if (body[index + 1] !== current) {
        throw new Error('条件表达式包含非法运算符');
      }
      tokens.push({ type: 'symbol', text: current + current });
      index += 2;
      continue;
    }
    if (/\d/.test(current) || (current === '-' && /\d/.test(body[index + 1]))) {
      let end = index + (current === '-' ? 1 : 0);
      let dot = false;
      while (end < body.length) {
        const character = body[end];
        if (/\d/.test(character)) {
          end++;
          continue;
        }
        if (character === '.' && !dot) {
          dot = true;
          end++;
          continue;
        }
        break;
      }
      const number = body.slice(index, end);
      if (number.endsWith('.')) throw new Error('条件表达式数字格式非法');
      tokens.push({ type: 'number', text: number });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(current)) {
      let end = index;
      while (end < body.length) {
        const character = body[end];
        if (/[A-Za-z0-9_.]/.test(character)) {
          if (character === '.' && !/[A-Za-z_]/.test(body[end + 1] || ''))
            break;
          end++;
          continue;
        }
        break;
      }
      const identifier = body.slice(index, end);
      const lower = identifier.toLowerCase();
      if (RESERVED_WORDS.has(lower)) {
        throw new Error(`条件表达式不允许关键字: ${identifier}`);
      }
      tokens.push({
        type: lower === 'true' || lower === 'false' ? 'boolean' : 'identifier',
        text: identifier,
      });
      index = end;
      continue;
    }
    throw new Error(`条件表达式包含非法字符: ${current}`);
  }
  tokens.push({ type: 'eof', text: '' });
  return tokens;
}

class ConditionParser {
  private position = 0;

  constructor(private readonly tokens: ConditionToken[]) {}

  parse() {
    this.parseOr();
    if (this.peek().type !== 'eof') {
      throw new Error(`条件表达式包含无法解析的内容: ${this.peek().text}`);
    }
  }

  private parseOr() {
    this.parseAnd();
    while (this.match('||')) this.parseAnd();
  }

  private parseAnd() {
    this.parseUnary();
    while (this.match('&&')) this.parseUnary();
  }

  private parseUnary() {
    if (this.match('!')) {
      this.parseUnary();
      return;
    }
    if (this.match('(')) {
      this.parseOr();
      this.expect(')');
      return;
    }
    this.parseComparison();
  }

  private parseComparison() {
    this.parsePrimary();
    if (['==', '!=', '>', '>=', '<', '<='].includes(this.peek().text)) {
      this.position++;
      this.parsePrimary();
    }
  }

  private parsePrimary() {
    const token = this.peek();
    if (
      token.type === 'number' ||
      token.type === 'string' ||
      token.type === 'boolean' ||
      token.type === 'identifier'
    ) {
      this.position++;
      return;
    }
    throw new Error('条件表达式缺少操作数');
  }

  private match(symbol: string) {
    if (this.peek().type === 'symbol' && this.peek().text === symbol) {
      this.position++;
      return true;
    }
    return false;
  }

  private expect(symbol: string) {
    if (!this.match(symbol)) throw new Error(`条件表达式缺少 ${symbol}`);
  }

  private peek() {
    return this.tokens[this.position];
  }
}
