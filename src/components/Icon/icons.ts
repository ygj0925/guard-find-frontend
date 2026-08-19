import * as antdIcons from '@ant-design/icons';

const icons = {
  ...antdIcons,
};

// @ts-expect-error
delete icons.default;

export default icons;
