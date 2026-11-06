/**
 * bpmn-js 按需加载入口：保持 Modeler/NavigatedViewer 独立异步 chunk，
 * 同时让画布组件在测试中可以替换加载器。
 */
export type OaBpmnCanvasConstructor = new (options: any) => any;

export type OaBpmnConstructors = {
  Modeler: OaBpmnCanvasConstructor;
  NavigatedViewer: OaBpmnCanvasConstructor;
};

export async function loadOaBpmnConstructors(): Promise<OaBpmnConstructors> {
  const [{ default: Modeler }, { default: NavigatedViewer }] =
    await Promise.all([
      import('bpmn-js/lib/Modeler'),
      import('bpmn-js/lib/NavigatedViewer'),
    ]);
  return { Modeler, NavigatedViewer };
}
