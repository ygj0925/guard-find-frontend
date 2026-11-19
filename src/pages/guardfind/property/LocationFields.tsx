import {
  Alert,
  Button,
  Cascader,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  queryRegionSource,
  queryRegions,
  type Region,
} from '@/services/web/guardfind/propertyLocation';

function options(tree: Region[]): Region[] {
  return tree.map((p) => ({
    ...p,
    children: p.children?.length ? options(p.children) : undefined,
  }));
}
function pathFor(tree: Region[], code: string): number[] | undefined {
  for (const node of tree) {
    if (String(node.code) === code) return [node.code];
    const child = pathFor(node.children || [], code);
    if (child) return [node.code, ...child];
  }
  return undefined;
}
export default function LocationFields() {
  const form = Form.useFormInstance();
  const code = Form.useWatch('regionCode', form);
  const [tree, setTree] = useState<Region[]>([]);
  const [version, setVersion] = useState('');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [picker, setPicker] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const key = process.env.TENCENT_MAP_KEY || '';
  useEffect(() => {
    let active = true;
    setFailed(false);
    Promise.all([queryRegions(), queryRegionSource()])
      .then(([regions, source]) => {
        if (active) {
          setTree(options(regions.data));
          setVersion(source.data.version);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!picker) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== 'https://apis.map.qq.com' ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      const value = event.data;
      if (
        value?.module !== 'locationPicker' ||
        !Number.isFinite(value.latlng?.lat) ||
        !Number.isFinite(value.latlng?.lng) ||
        Math.abs(value.latlng.lat) > 90 ||
        Math.abs(value.latlng.lng) > 180 ||
        typeof value.poiname !== 'string'
      )
        return;
      form.setFieldsValue({
        publicLatitude: value.latlng.lat,
        publicLongitude: value.latlng.lng,
        locationLabel: value.poiname.slice(0, 200),
      });
      setPicker(false);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [picker, form]);
  return (
    <>
      <Form.Item name="regionCode" hidden>
        <Input />
      </Form.Item>
      <Form.Item
        label="官方行政区划"
        extra={
          version
            ? `民政部 ${version} 版；历史文字地址保留，重新选择后采用官方名称。`
            : '请选择省、市、区县'
        }
      >
        <Cascader
          options={tree}
          fieldNames={{ label: 'name', value: 'code', children: 'children' }}
          showSearch
          allowClear
          placeholder="搜索或选择省 / 市 / 区县"
          value={code ? pathFor(tree, code) : undefined}
          onChange={(path, nodes) => {
            const last = nodes?.[nodes.length - 1];
            if (!last) {
              form.setFieldValue('regionCode', null);
              return;
            }
            const province = nodes[0];
            const city = nodes[1];
            const direct = city && city.code % 100 !== 0;
            const municipality = [110000, 120000, 310000, 500000].includes(
              province.code,
            );
            form.setFieldsValue({
              regionCode: String(last.code),
              city:
                direct && municipality
                  ? province.name
                  : city?.name || province.name,
              district: direct ? city.name : nodes[2]?.name || '',
            });
          }}
        />
        {failed && (
          <Alert
            type="warning"
            message="行政区划加载失败，可重试或保留现有地址"
            action={
              <Button onClick={() => setRetry((v) => v + 1)}>重试</Button>
            }
          />
        )}
      </Form.Item>
      <Alert
        type="info"
        showIcon
        message="地图公开位置"
        description="请选择小区入口或公寓门店，用户将在地图中看到并可导航到这里。请不要标记私人房间位置。"
        style={{ marginBottom: 16 }}
      />
      <Space wrap style={{ marginBottom: 12 }}>
        <Button disabled={!key} onClick={() => setPicker(true)}>
          在地图搜索小区并选点
        </Button>
        <Button
          onClick={() =>
            form.setFieldsValue({
              publicLatitude: null,
              publicLongitude: null,
              locationLabel: null,
            })
          }
        >
          移除公开位置
        </Button>
      </Space>
      {!key && (
        <div style={{ marginBottom: 12, color: '#63718a' }}>
          地图选点暂未启用；可填写已核对的 GCJ-02 坐标。
        </div>
      )}
      <Space align="start" wrap>
        <Form.Item name="publicLatitude" label="公开位置纬度（GCJ-02）">
          <InputNumber min={-90} max={90} precision={7} />
        </Form.Item>
        <Form.Item name="publicLongitude" label="公开位置经度（GCJ-02）">
          <InputNumber min={-180} max={180} precision={7} />
        </Form.Item>
      </Space>
      <Form.Item
        name="locationLabel"
        label="公开位置名称"
        dependencies={['publicLatitude', 'publicLongitude']}
        rules={[
          {
            validator: async (_, label) => {
              const lat = form.getFieldValue('publicLatitude');
              const lng = form.getFieldValue('publicLongitude');
              if ((lat == null) !== (lng == null))
                throw new Error('经纬度须同时填写或同时清空');
              if (lat != null && !label?.trim())
                throw new Error('请填写小区入口或公寓门店名称');
            },
          },
        ]}
      >
        <Input maxLength={200} placeholder="如：泊之湾公寓南门" />
      </Form.Item>
      <Modal
        open={picker}
        title="选择小区入口或公寓门店"
        width={900}
        footer={null}
        onCancel={() => setPicker(false)}
        destroyOnHidden
      >
        <iframe
          ref={iframe}
          title="腾讯地图选点"
          src={`https://apis.map.qq.com/tools/locpicker?search=1&type=1&policy=1&coordtype=5&key=${encodeURIComponent(key)}&referer=GuardFind`}
          style={{ width: '100%', height: '65vh', border: 0 }}
        />
      </Modal>
    </>
  );
}
