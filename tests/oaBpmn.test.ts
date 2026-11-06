import {
  compileOaConditionRule,
  defaultOaBpmnXml,
  isSafeOaCondition,
  OA_BPMN_LIMITS,
  oaConditionError,
  parseOaConditionValue,
  validateOaAssignment,
  validateOaBpmnXml,
  validateOaTimerValue,
} from '@/utils/oaBpmn';

const XSI = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';

function definitions(children: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:flowable="http://flowable.org/bpmn" ${XSI}
  id="Definitions_1" targetNamespace="http://guardfind.com/oa/bpmn">
  <bpmn:process id="oa_process" name="测试流程" isExecutable="true">
    ${children}
  </bpmn:process>
</bpmn:definitions>`;
}

const SIMPLE_PROCESS = definitions(`
  <bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
  <bpmn:userTask id="Activity_approve" name="审批" flowable:candidateUsers="\${approver}">
    <bpmn:incoming>Flow_1</bpmn:incoming>
    <bpmn:outgoing>Flow_2</bpmn:outgoing>
  </bpmn:userTask>
  <bpmn:endEvent id="EndEvent_1"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
  <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_approve"/>
  <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_approve" targetRef="EndEvent_1"/>
`);

function gatewayProcess(condition = '${amount > 1000}') {
  return definitions(`
    <bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:exclusiveGateway id="Gateway_1" name="金额判断">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Activity_approve" name="审批" flowable:candidateUsers="\${approver}">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1"><bpmn:incoming>Flow_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Activity_approve">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${condition}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Activity_approve" targetRef="EndEvent_1"/>
  `);
}

function boundaryProcess(
  timer = '<bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT1H</bpmn:timeDuration>',
  attachedTo = 'Activity_approve',
) {
  return definitions(`
    <bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:userTask id="Activity_approve" name="审批" flowable:candidateUsers="\${approver}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="Boundary_1" name="超时" attachedToRef="${attachedTo}" cancelActivity="true">
      <bpmn:timerEventDefinition>${timer}</bpmn:timerEventDefinition>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="EndEvent_1"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_approve"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_approve" targetRef="EndEvent_1"/>
  `);
}

describe('validateOaBpmnXml', () => {
  it('接受默认流程并输出摘要', () => {
    const report = validateOaBpmnXml(defaultOaBpmnXml());
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.summary.processId).toBe('oa_process');
    expect(report.summary.nodeCount).toBe(3);
    expect(report.summary.userTaskCount).toBe(1);
    expect(report.summary.conditionCount).toBe(0);
    expect(report.summary.userTasks).toEqual([
      {
        id: 'Activity_approve',
        name: '审批',
        assignment: '候选用户 ${approver}',
      },
    ]);
  });

  it('拒绝空 XML 与 DTD', () => {
    expect(validateOaBpmnXml('').valid).toBe(false);
    const withDoctype = `<!DOCTYPE bpmn:definitions [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${defaultOaBpmnXml()}`;
    const report = validateOaBpmnXml(withDoctype);
    expect(report.valid).toBe(false);
    expect(report.errors.join()).toContain('DTD');
  });

  it('拒绝超过大小限制的 XML', () => {
    const oversized = 'x'.repeat(OA_BPMN_LIMITS.maxBytes + 1);
    const report = validateOaBpmnXml(oversized);
    expect(report.valid).toBe(false);
    expect(report.errors.join()).toContain('限制');
  });

  it('拒绝解析失败的 XML', () => {
    const report = validateOaBpmnXml('<bpmn:definitions>');
    expect(report.valid).toBe(false);
    expect(report.errors.join()).toContain('解析失败');
  });

  it('拒绝脚本任务与扩展元素', () => {
    const withScript = SIMPLE_PROCESS.replace(
      '<bpmn:endEvent',
      '<bpmn:scriptTask id="Script_1"/><bpmn:endEvent',
    );
    expect(validateOaBpmnXml(withScript).errors.join()).toContain('scriptTask');
    const withExtension = SIMPLE_PROCESS.replace(
      '<bpmn:endEvent',
      '<bpmn:extensionElements/><bpmn:endEvent',
    );
    expect(validateOaBpmnXml(withExtension).errors.join()).toContain(
      'extensionElements',
    );
  });

  it('要求用户任务配置审批范围并校验格式', () => {
    const missing = SIMPLE_PROCESS.replace(
      ' flowable:candidateUsers="${approver}"',
      '',
    );
    expect(validateOaBpmnXml(missing).errors.join()).toContain(
      '必须配置审批人变量或候选范围',
    );
    const unsafe = SIMPLE_PROCESS.replace(
      'flowable:candidateUsers="${approver}"',
      'flowable:candidateUsers="${a b}"',
    );
    expect(validateOaBpmnXml(unsafe).errors.join()).toContain('简单变量表达式');
  });

  it('服务任务必须配置处理器类并提示白名单', () => {
    const serviceTask = SIMPLE_PROCESS.replace(
      /<bpmn:userTask id="Activity_approve"[\s\S]*?<\/bpmn:userTask>/,
      '<bpmn:serviceTask id="Activity_approve" name="通知" flowable:class="com.guardfind.backend.oa.handler.OaNotifyHandler"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:serviceTask>',
    );
    const valid = validateOaBpmnXml(serviceTask);
    expect(valid.valid).toBe(true);
    expect(valid.warnings.join()).toContain('白名单');

    const missingClass = serviceTask.replace(
      ' flowable:class="com.guardfind.backend.oa.handler.OaNotifyHandler"',
      '',
    );
    expect(validateOaBpmnXml(missingClass).errors.join()).toContain(
      '必须配置 flowable:class',
    );
  });

  it('条件只能出现在排他网关输出连线上', () => {
    const onStartFlow = SIMPLE_PROCESS.replace(
      '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_approve"/>',
      '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_approve"><bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${amount > 1}</bpmn:conditionExpression></bpmn:sequenceFlow>',
    );
    expect(validateOaBpmnXml(onStartFlow).errors.join()).toContain(
      '条件表达式只能用于排他网关',
    );
  });

  it('接受受限条件并拒绝不安全条件', () => {
    expect(validateOaBpmnXml(gatewayProcess()).valid).toBe(true);
    const unsafe = validateOaBpmnXml(
      gatewayProcess('${execution.getVariable("x")}'),
    );
    expect(unsafe.valid).toBe(false);
    expect(unsafe.errors.join()).toContain('条件不安全');
  });

  it('校验排他网关默认连线', () => {
    const invalidDefault = gatewayProcess().replace(
      'id="Gateway_1" name="金额判断"',
      'id="Gateway_1" name="金额判断" default="Flow_9"',
    );
    expect(validateOaBpmnXml(invalidDefault).errors.join()).toContain(
      '默认连线无效',
    );
    const conditionOnDefault = gatewayProcess().replace(
      'id="Gateway_1" name="金额判断"',
      'id="Gateway_1" name="金额判断" default="Flow_2"',
    );
    expect(validateOaBpmnXml(conditionOnDefault).errors.join()).toContain(
      '默认连线 Flow_2 不能配置条件',
    );
  });

  it('接受用户任务上的定时边界事件', () => {
    const report = validateOaBpmnXml(boundaryProcess());
    expect(report.valid).toBe(true);
    expect(report.summary.boundaryTimerCount).toBe(1);
  });

  it('拒绝挂错位置或格式非法的定时器', () => {
    const attachedToGateway = boundaryProcess(undefined, 'StartEvent_1');
    expect(validateOaBpmnXml(attachedToGateway).errors.join()).toContain(
      '只能挂在用户任务上',
    );
    const badTimer = boundaryProcess(
      '<bpmn:timeDuration xsi:type="bpmn:tFormalExpression">1 hour</bpmn:timeDuration>',
    );
    expect(validateOaBpmnXml(badTimer).errors.join()).toContain(
      '定时器格式非法',
    );
  });

  it('检查开始/结束节点、重复 id 与断链', () => {
    const noStart = SIMPLE_PROCESS.replace(
      /<bpmn:startEvent[\s\S]*?<\/bpmn:startEvent>/,
      '',
    );
    expect(validateOaBpmnXml(noStart).errors.join()).toContain('开始事件');

    const duplicate = SIMPLE_PROCESS.replace(
      'id="EndEvent_1"',
      'id="Activity_approve"',
    );
    expect(validateOaBpmnXml(duplicate).errors.join()).toContain('id 重复');

    const broken = SIMPLE_PROCESS.replace(
      'targetRef="EndEvent_1"',
      'targetRef="Missing"',
    );
    expect(validateOaBpmnXml(broken).errors.join()).toContain('目标节点无效');
  });

  it('限制流程节点数量', () => {
    const manyNodes = Array.from(
      { length: OA_BPMN_LIMITS.maxFlowNodes + 1 },
      (_, index) => `<bpmn:startEvent id="Start_${index}"/>`,
    ).join('');
    const report = validateOaBpmnXml(definitions(manyNodes));
    expect(report.valid).toBe(false);
    expect(report.errors.join()).toContain('流程节点数量超过');
  });

  it('要求流程标记 isExecutable', () => {
    const report = validateOaBpmnXml(
      SIMPLE_PROCESS.replace('isExecutable="true"', 'isExecutable="false"'),
    );
    expect(report.valid).toBe(false);
    expect(report.errors.join()).toContain('isExecutable=true');
  });
});

describe('compileOaConditionRule', () => {
  it('编译 AND 与集合条件', () => {
    expect(
      compileOaConditionRule({
        combinator: 'AND',
        items: [
          { field: 'amount', operator: 'GT', value: 1000 },
          {
            field: 'dept',
            operator: 'IN',
            value: ['sales', 'market'],
          },
        ],
      }),
    ).toBe('${amount > 1000 && (dept == "sales" || dept == "market")}');
  });

  it('编译 OR 条件并转义引号', () => {
    const expression = compileOaConditionRule({
      combinator: 'OR',
      items: [
        { field: 'level', operator: 'EQ', value: 'a"b' },
        { field: 'vip', operator: 'EQ', value: true },
      ],
    });
    expect(expression).toBe('${level == "a\\"b" || vip == true}');
    expect(isSafeOaCondition(expression)).toBe(true);
  });

  it('拒绝非法字段与空集合', () => {
    expect(() =>
      compileOaConditionRule({
        combinator: 'AND',
        items: [{ field: 'a b', operator: 'EQ', value: 1 }],
      }),
    ).toThrow('条件字段名非法');
    expect(() =>
      compileOaConditionRule({
        combinator: 'AND',
        items: [{ field: 'amount', operator: 'IN', value: [] }],
      }),
    ).toThrow('集合');
  });
});

describe('条件表达式安全校验', () => {
  it('接受比较、集合与布尔组合', () => {
    expect(oaConditionError('${amount >= 100 && dept == "sales"}')).toBeNull();
    expect(
      oaConditionError('${status == "A" || (status == "B" && vip == true)}'),
    ).toBeNull();
  });

  it('拒绝函数调用、单等号与非法字符', () => {
    expect(oaConditionError('${execution.getVariable("x")}')).toContain(
      '无法解析',
    );
    expect(oaConditionError('${amount = 1}')).toContain('单等号');
    expect(oaConditionError('${amount @ 1}')).toContain('非法字符');
    expect(oaConditionError('amount > 1')).toContain('${...}');
  });
});

describe('条件值解析', () => {
  it('解析数字、布尔、字符串与集合', () => {
    expect(parseOaConditionValue('1000')).toBe(1000);
    expect(parseOaConditionValue('true')).toBe(true);
    expect(parseOaConditionValue('"text"')).toBe('text');
    expect(parseOaConditionValue('sales, market', true)).toEqual([
      'sales',
      'market',
    ]);
  });

  it('拒绝空值', () => {
    expect(() => parseOaConditionValue('')).toThrow('不能为空');
  });
});

describe('属性校验', () => {
  it('校验审批人表达式与字面量', () => {
    expect(validateOaAssignment('${approver}', '指定审批人')).toBeNull();
    expect(
      validateOaAssignment('${applicant.deptLeader}', '候选用户'),
    ).toBeNull();
    expect(validateOaAssignment('user1,user2', '候选用户')).toBeNull();
    expect(validateOaAssignment('${a b}', '指定审批人')).toContain(
      '简单变量表达式',
    );
    expect(validateOaAssignment('a b', '候选组')).toContain('非法字符');
  });

  it('校验定时器格式', () => {
    expect(validateOaTimerValue('timeDuration', 'PT2H')).toBeNull();
    expect(validateOaTimerValue('timeDuration', '2 hours')).toContain(
      '格式非法',
    );
    expect(validateOaTimerValue('timeCycle', 'R3/PT1H')).toBeNull();
    expect(validateOaTimerValue('timeCycle', '0 0 9 * * ?')).toBeNull();
    expect(
      validateOaTimerValue('timeDate', '2026-12-01T09:00:00+08:00'),
    ).toBeNull();
    expect(validateOaTimerValue('timeDuration', '${timeout}')).toBeNull();
    expect(validateOaTimerValue('timeDuration', '${a b}')).toContain(
      '简单变量表达式',
    );
  });
});
