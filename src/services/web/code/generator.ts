import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  CodePreviewVo,
  GeneratorFieldDto,
  GeneratorFieldVo,
  GeneratorTableDto,
  GeneratorTableVo,
} from './typings';

export async function queryTables(body: QueryParam<{ tableName?: string }>) {
  return request<R<PageResult<GeneratorTableVo>>>('code/generator/config', {
    method: 'GET',
    params: body,
  });
}

export async function getTableConfig(tableName: string) {
  return request<R<GeneratorTableDto>>(`code/generator/config/${tableName}`, {
    method: 'GET',
  });
}

export async function saveTableConfig(tableName: string, data: GeneratorTableDto) {
  return request<R<any>>(`code/generator/config/${tableName}`, {
    method: 'POST',
    data,
  });
}

export async function getFieldConfig(tableName: string) {
  return request<R<GeneratorFieldVo[]>>(`code/generator/field/${tableName}`, {
    method: 'GET',
  });
}

export async function saveFieldConfig(tableName: string, data: GeneratorFieldDto[]) {
  return request<R<any>>(`code/generator/config/${tableName}`, {
    method: 'POST',
    data,
  });
}

export async function previewCode(tableName: string) {
  return request<R<CodePreviewVo[]>>(`code/generator/preview/${tableName}`, {
    method: 'GET',
  });
}

export async function downloadCode(tableName: string) {
  return request(`code/generator/${tableName}/download`, {
    method: 'POST',
    responseType: 'blob',
  });
}

export async function batchGenerate(data: string[]) {
  return request(`code/generator/${data.join(',')}/download`, {
    method: 'POST',
    responseType: 'blob',
  });
}
