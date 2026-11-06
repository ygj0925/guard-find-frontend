/**
 * 最小 Flowable 属性描述，保证 bpmn-js 导入/导出时保留审批人与服务任务类。
 * 只声明首版白名单中的属性，避免把任意引擎扩展带进模型。
 */
export const FLOWABLE_MODDLE = {
  name: 'Flowable',
  uri: 'http://flowable.org/bpmn',
  prefix: 'flowable',
  xml: { tagAlias: 'lowerCase' },
  associations: [],
  types: [
    {
      name: 'UserTask',
      extends: ['bpmn:UserTask'],
      properties: [
        { name: 'assignee', isAttr: true, type: 'String' },
        { name: 'candidateUsers', isAttr: true, type: 'String' },
        { name: 'candidateGroups', isAttr: true, type: 'String' },
      ],
    },
    {
      name: 'ServiceTask',
      extends: ['bpmn:ServiceTask'],
      properties: [{ name: 'class', isAttr: true, type: 'String' }],
    },
  ],
};
