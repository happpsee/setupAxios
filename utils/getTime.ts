/**
 * 获取指定格式的时间
 */
export const getTime = (format = 'YYYYMMDDHHmmss'): string => {
  if (!format) {
    return '';
  }

  const now = new Date();

  const obj = {
    'Y+': now.getFullYear(),
    'M+': now.getMonth() + 1,
    'D+': now.getDate(),
    'H+': now.getHours(),
    'm+': now.getMinutes(),
    's+': now.getSeconds(),
    'ms+': now.getMilliseconds(),
  };

  let dateText = format;
  Object.keys(obj).forEach((key) => {
    let val = `${(obj as any)[key]}`;
    if (val.length === 1) {
      val = `0${val}`;
    }

    dateText = dateText.replace(new RegExp(`(${key})`), val);
  });

  return dateText;
};