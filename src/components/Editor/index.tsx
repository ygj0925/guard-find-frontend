import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig,
} from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '@wangeditor/editor/dist/css/style.css';

interface EditorProps {
  value?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  height?: number;
  placeholder?: string;
}

const EditorComponent: React.FC<EditorProps> = ({
  value = '',
  onChange,
  readOnly = false,
  height = 300,
  placeholder = '请输入内容...',
}) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [html, setHtml] = useState(value);

  useEffect(() => {
    setHtml(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const toolbarConfig = useMemo<Partial<IToolbarConfig>>(() => ({}), []);

  const editorConfig = useMemo<Partial<IEditorConfig>>(
    () => ({
      placeholder,
      readOnly,
      MENU_CONF: {
        uploadImage: {
          customUpload: async (file: File, insertFn: (url: string) => void) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              insertFn(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          },
        },
        uploadVideo: {
          customUpload: async (file: File, insertFn: (url: string) => void) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              insertFn(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          },
        },
      },
    }),
    [placeholder, readOnly],
  );

  const handleChange = useCallback(
    (newEditor: IDomEditor) => {
      const newHtml = newEditor.getHtml();
      setHtml(newHtml);
      onChange?.(newHtml);
    },
    [onChange],
  );

  return (
    <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
      {!readOnly && (
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          style={{ borderBottom: '1px solid #ccc' }}
        />
      )}
      <Editor
        defaultConfig={editorConfig}
        value={html}
        onCreated={setEditor}
        onChange={handleChange}
        style={{ height, overflowY: 'hidden' }}
      />
    </div>
  );
};

export default EditorComponent;
